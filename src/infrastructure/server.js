import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GameSession } from '../domain/game-session.js';

// Configurações para resolver caminhos de arquivos no ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DO JOGO ---
const valoresCartas = ['🍎', '🍌', '🍇', '🍉', '🍓', '🥑'];
let jogadoresAtivos = [];
let game = null;
let clients = [];

// --- SERVIDOR HTTP (Substitui o Live Server) ---
const server = http.createServer((req, res) => {
  // Define o caminho da pasta public (subindo dois níveis de src/infrastructure)
  const publicPath = path.join(__dirname, '../../public');
  
  // Se a URL for '/', serve o index.html, caso contrário serve o arquivo solicitado
  let filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);
  
  // Determina o Content-Type correto baseado na extensão
  const extname = path.extname(filePath);
  const mapContentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mapContentTypes[extname] || 'text/plain';

  // Lê o arquivo do sistema
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// --- CONFIGURAÇÃO DO WEBSOCKET ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Novo jogador conectado via WebSocket!');
  clients.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Trata a entrada na sala e muda a tela no frontend
      if (data.type === 'JOIN_ROOM') {
        const { nickname, room } = data.payload;
        
        if (!jogadoresAtivos.includes(nickname) && jogadoresAtivos.length < 2) {
          jogadoresAtivos.push(nickname);
        }

        if (!game) {
          game = new GameSession(jogadoresAtivos, valoresCartas);
        }

        // Responde para o frontend mudar de tela
        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          payload: { nickname, room }
        }));

        transmitirParaTodos();
      }

      // Lógica de virar carta
      if (data.type === 'CHOOSE_CARD') {
        if (game) {
          game.chooseCard(data.cardId);
          transmitirParaTodos();
        }
      }

      // Reiniciar jogo
      if (data.type === 'RESTART') {
        game = new GameSession(jogadoresAtivos, valoresCartas);
        transmitirParaTodos();
      }
      
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('Jogador desconectado.');
  });
});

// Transmite o estado atualizado para todos os jogadores
function transmitirParaTodos() {
  if (!game) return;

  const gameState = JSON.stringify({
    type: 'GAME_STATE', 
    board: game.board.cards,
    currentPlayer: game.currentPlayer,
    scores: game.scores,
    status: game.isGameOver ? "Fim de Jogo!" : `Turno de: ${game.currentPlayer}`
  });

  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(gameState);
    }
  });
}

// O servidor agora roda tudo na porta 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Jogo rodando em http://localhost:${PORT}`);
});