import http from 'http';
import { WebSocketServer } from 'ws';
import { GameSession } from '../domain/game-session.js';

// Criamos um servidor HTTP simples nativo do Node
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor do Jogo da Memoria rodando!');
});

// Criamos o servidor de WebSocket acoplado ao servidor HTTP
const wss = new WebSocketServer({ server });

// Para fins de simplificação do projeto da faculdade, vamos manter 
// uma única sessão de jogo ativa no servidor com 2 jogadores de teste.
const jogadores = ['Jogador 1', 'Jogador 2'];
const valoresCartas = ['🍎', '🍌', '🍇', '🍉', '🍓', '🥑']; // Símbolos das cartas
let game = new GameSession(jogadores, valoresCartas);

// Lista de conexões ativas (jogadores conectados no navegador)
let clients = [];

wss.on('connection', (ws) => {
  console.log('Novo jogador conectado via WebSocket!');
  clients.push(ws);

  // Assim que o jogador conecta, mandamos o estado atual do jogo para ele
  enviarEstadoDoJogo(ws);

  // Escuta as mensagens enviadas pelo navegador do jogador
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Ação: Quando o jogador clica em uma carta na tela
      if (data.type === 'CHOOSE_CARD') {
        game.chooseCard(data.cardId);
        // Atualiza a tela de TODO MUNDO conectado em tempo real
        transmitirParaTodos();
      }

      // Ação: Reiniciar o jogo
      if (data.type === 'RESTART') {
        game = new GameSession(jogadores, valoresCartas);
        transmitirParaTodos();
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  // Quando o jogador fecha a aba do navegador
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('Jogador desconectado.');
  });
});

// Função para empacotar e enviar os dados do jogo para um jogador específico
function enviarEstadoDoJogo(ws) {
  ws.send(JSON.stringify({
    type: 'GAME_STATE',
    board: game.board.cards,
    currentPlayer: game.currentPlayer,
    scores: game.scores
  }));
}

// Função Facade/Observer: Transmite o estado atualizado para todas as telas em tempo real
function transmitirParaTodos() {
  clients.forEach(client => {
    if (client.readyState === 1) { // 1 significa conexão OPEN
      enviarEstadoDoJogo(client);
    }
  });
}

// O servidor vai rodar na porta 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});