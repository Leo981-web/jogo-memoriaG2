import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GameSession } from '../domain/game-session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const valoresCartas = ['🍎', '🍌', '🍇', '🍉', '🍓', '🥑'];
const rooms = {};

function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      jogadoresAtivos: [],
      game: null,
      clients: []
    };
  }
  return rooms[roomId];
}

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
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'JOIN_ROOM') {
        const { nickname, room } = data.payload;

        // Carimba a conexão com o nome do jogador
        ws.nickname = nickname;
        ws.room = room;

        const sala = getOrCreateRoom(room);

        if (sala.jogadoresAtivos.length >= 2 && !sala.jogadoresAtivos.includes(nickname)) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: `A sala "${room}" já está cheia!` }
          }));
          return;
        }

        if (!sala.clients.includes(ws)) {
          sala.clients.push(ws);
        }

        if (!sala.jogadoresAtivos.includes(nickname) && sala.jogadoresAtivos.length < 2) {
          sala.jogadoresAtivos.push(nickname);
        }

        if (sala.jogadoresAtivos.length === 2 && !sala.game) {
          sala.game = new GameSession(sala.jogadoresAtivos, valoresCartas);
        }

        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          payload: { nickname, room }
        }));

        transmitirParaSala(ws.room);
      }

      if (data.type === 'CHOOSE_CARD') {
        const sala = rooms[ws.room];
        if (!sala || !sala.game) return;

        if (ws.nickname !== sala.game.currentPlayer) {
          console.log(`Clique ignorado: Não é o turno de ${ws.nickname}`);
          return;
        }

        sala.game.chooseCard(data.cardId, () => transmitirParaSala(ws.room));
        transmitirParaSala(ws.room);
      }

      if (data.type === 'RESTART') {
        const sala = rooms[ws.room];
        if (sala && sala.jogadoresAtivos.length === 2) {
          sala.game = new GameSession(sala.jogadoresAtivos, valoresCartas);
          transmitirParaSala(ws.room);
        }
      }

      if (data.type === 'CHAT_MESSAGE') {
        const texto = data.payload?.texto?.trim();
        if (!texto || !ws.nickname || !ws.room) return;
        const sala = rooms[ws.room];
        if (!sala) return;

        const mensagem = {
          type: 'CHAT_MESSAGE',
          payload: {
            remetente: ws.nickname,
            texto,
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }
        };

        // Envia para todos os jogadoes:
        sala.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(mensagem));
          }
        });
      }

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      const sala = rooms[ws.room];
      sala.clients = sala.clients.filter(c => c !== ws);

      if (sala.clients.length === 0) {
        delete rooms[ws.room];
        console.log(`Sala "${ws.room}" removida por estar vazia.`);
      }
    }
    console.log('Jogador desconectado.');
  });
});

function transmitirParaSala(roomId) {
  const sala = rooms[roomId];
  if (!sala) return;
  sala.clients.forEach(client => {
    if (client.readyState === 1) { // Só envia se a conexão estiver aberta
      if (sala.game) {
        // Se o jogo já começou, envia o estado real
        client.send(JSON.stringify({
          type: 'GAME_STATE',
          board: sala.game.board.cards,
          currentPlayer: sala.game.currentPlayer,
          scores: sala.game.scores,
          status: sala.game.isGameOver ? "Fim de Jogo! Verifica o Placar!" : `Turno de: ${sala.game.currentPlayer}`
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