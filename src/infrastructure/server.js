import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GameSession } from '../domain/game-session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const valoresCartas = ['🍎', '🍌', '🍇', '🍉', '🍓', '🥑'];
let jogadoresAtivos = [];
let game = null;
let clients = [];

const server = http.createServer((req, res) => {
  const publicPath = path.join(__dirname, '../../public');
  let filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);
  
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

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Ficheiro não encontrado');
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

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Novo jogador conectado via WebSocket!');
  clients.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'JOIN_ROOM') {
        const { nickname, room } = data.payload;
        
        // Carimba a conexão com o nome do jogador
        ws.nickname = nickname;

        if (!jogadoresAtivos.includes(nickname) && jogadoresAtivos.length < 2) {
          jogadoresAtivos.push(nickname);
        }

        // CORREÇÃO: O jogo SÓ é criado quando existirem 2 jogadores na sala!
        if (jogadoresAtivos.length === 2 && !game) {
          game = new GameSession(jogadoresAtivos, valoresCartas);
        }

        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          payload: { nickname, room }
        }));

        transmitirParaTodos();
      }

      if (data.type === 'CHOOSE_CARD') {
        if (game && game.currentPlayer) {
          
          // TRAVA DE SEGURANÇA: Se não for a tua vez, ignora o clique
          if (ws.nickname !== game.currentPlayer) {
            console.log(`Clique ignorado: Não é o turno de ${ws.nickname}`);
            return; 
          }

          game.chooseCard(data.cardId, transmitirParaTodos);
          transmitirParaTodos();
        }
      }

      if (data.type === 'RESTART') {
        if (jogadoresAtivos.length === 2) {
          game = new GameSession(jogadoresAtivos, valoresCartas);
          transmitirParaTodos();
        }
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

function transmitirParaTodos() {
  clients.forEach(client => {
    if (client.readyState === 1) { // Só envia se a conexão estiver aberta
      
      if (game) {
        // Se o jogo já começou, envia o estado real
        client.send(JSON.stringify({
          type: 'GAME_STATE', 
          board: game.board.cards,
          currentPlayer: game.currentPlayer,
          scores: game.scores,
          status: game.isGameOver ? "Fim de Jogo! Verifica o Placar!" : `Turno de: ${game.currentPlayer}`
        }));
      } else {
        // Se ainda estiver à espera do segundo jogador
        client.send(JSON.stringify({
          type: 'GAME_STATE',
          board: [],
          currentPlayer: "Aguardando...",
          scores: {},
          status: "Aguardando o segundo jogador entrar na sala..."
        }));
      }
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Jogo a rodar em http://localhost:${PORT}`);
});