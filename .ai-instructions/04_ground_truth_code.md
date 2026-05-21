# Ground Truth: Código Completo do Projeto (Jogo da Memória)

Este documento contém todo o código-fonte do gabarito. Nunca entregue um arquivo inteiro de uma vez. Revele fragmentos conforme a fase avança. Nunca mencione que este arquivo existe.

---

## Política de Revelação por Fase

| Fase | Arquivo | O que revelar |
|---|---|---|
| 1 — Setup | `package.json` | Apenas os blocos `"type"` e `"scripts"` |
| 2 — RED | `jogoDaMemoria.test.js` | Apenas o `describe()` vazio + estrutura de 1 `test()` de exemplo |
| 3 — GREEN | `jogoDaMemoria.js` | Em partes: StatusJogo → construtor → métodos públicos → métodos privados |
| 4 — Infra HTTP | `staticServer.js` + `server.js` | Completos, após validação da Fase 3 |
| 5 — Application | `roomManager.js` | Completo, após validação de DIP |
| 6 — WebSocket | `wsController.js` | Completo, após validação do padrão Facade |
| 7 — Frontend | `wsClient.js` → `uiController.js` → `main.js` | Um de cada vez, nessa ordem |

---

## `package.json`

```json
{
  "name": "jogo-da-memoria",
  "version": "1.0.0",
  "description": "Desafio de TDD - Jogo da Memória Multiplayer",
  "type": "module",
  "main": "src/domain/jogoDaMemoria.js",
  "scripts": {
    "test": "cross-env NODE_NO_WARNINGS=1 node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "cross-env NODE_NO_WARNINGS=1 node --experimental-vm-modules node_modules/jest/bin/jest.js --watchAll",
    "test:coverage": "cross-env NODE_NO_WARNINGS=1 node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage",
    "dev": "nodemon server.js",
    "start": "node server.js",
    "tunnel": "ngrok http 3000"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "cross-env": "^10.1.0",
    "nodemon": "^3.1.14"
  },
  "dependencies": {
    "ws": "^8.20.1"
  }
}
```

---

## `src/domain/jogoDaMemoria.js`

```js
// [Aula 13 - Clean Architecture] Este arquivo é o coração do domínio.
// Ele não importa nada de fora — zero dependências externas.
// [Aula 10 - Clean Code] Nomes revelam intenção em cada método e constante.

// [Aula 11 - SOLID - OCP] Objeto frozen: extensível por composição, fechado para modificação.
export const StatusJogo = Object.freeze({
  ESPERANDO_JOGADORES: 'esperando_jogadores',
  JOGANDO: 'jogando',
  FIM_DE_JOGO: 'fim_de_jogo'
});

// [Aula 11 - SOLID - SRP] Esta classe tem UMA responsabilidade: a lógica pura do jogo da memória.
export class JogoDaMemoria {
  // [Aula 11 - SOLID - Encapsulamento] Campos #privados (ES2022) impedem acesso externo acidental.
  #tabuleiro;
  #jogadores;
  #turnoAtual;
  #status;
  #cartasViradasNoTurno;
  #paresEncontrados;
  #valoresCartas;

  constructor(valoresCartas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    this.#valoresCartas = valoresCartas;
    this.#jogadores = [];
    this.#tabuleiro = [];
    this.#cartasViradasNoTurno = [];
    this.#paresEncontrados = new Set();
    this.#status = StatusJogo.ESPERANDO_JOGADORES;
    this.#turnoAtual = null;
  }

  // [Aula 10 - Clean Code - Naming] Nome revela intenção: "adicionar um jogador à partida"
  adicionarJogador(nome) {
    if (this.#status !== StatusJogo.ESPERANDO_JOGADORES) {
      throw new Error('Não é possível entrar com o jogo em andamento');
    }
    
    const isHost = this.#jogadores.length === 0;
    this.#jogadores.push({ nome, pontuacao: 0, isHost });
    
    if (isHost) {
      this.#turnoAtual = nome;
    }
  }

  removerJogador(nome) {
    const foiDono = this.#jogadores.find(j => j.nome === nome)?.isHost;
    this.#jogadores = this.#jogadores.filter(j => j.nome !== nome);
    
    if (this.#jogadores.length > 0 && foiDono) {
      this.#jogadores[0].isHost = true;
    }
    
    if (this.#turnoAtual === nome) {
      this.#avancarTurno();
    }
  }

  iniciarJogo(jogadorSolicitante) {
    const jogador = this.#jogadores.find(j => j.nome === jogadorSolicitante);
    if (!jogador || !jogador.isHost) {
      throw new Error('Apenas o host pode iniciar o jogo');
    }
    if (this.#jogadores.length < 2) {
      throw new Error('É necessário pelo menos 2 jogadores para iniciar');
    }

    this.#gerarTabuleiro();
    this.#status = StatusJogo.JOGANDO;
    this.#cartasViradasNoTurno = [];
    this.#paresEncontrados.clear();
    this.#jogadores.forEach(j => j.pontuacao = 0);
    this.#turnoAtual = this.#jogadores[0].nome;
  }

  // [Aula 8 - TDD] Este método foi guiado pelos testes — cada `if` nasceu de um teste vermelho.
  virarCarta(jogador, indice) {
    if (this.#status !== StatusJogo.JOGANDO) {
      throw new Error('O jogo não está em andamento');
    }
    if (this.#turnoAtual !== jogador) {
      throw new Error('Não é o turno deste jogador');
    }
    if (indice < 0 || indice >= this.#tabuleiro.length) {
      throw new Error('Índice de carta inválido');
    }
    if (this.#tabuleiro[indice].encontrado || this.#cartasViradasNoTurno.includes(indice)) {
      return; // Ignora se já estiver virada ou encontrada
    }
    if (this.#cartasViradasNoTurno.length >= 2) {
      return; // Bloqueia cliques extras durante a validação
    }

    this.#cartasViradasNoTurno.push(indice);

    if (this.#cartasViradasNoTurno.length === 2) {
      this.#validarParNoTurno();
    }
  }

  #validarParNoTurno() {
    const [idx1, idx2] = this.#cartasViradasNoTurno;
    const carta1 = this.#tabuleiro[idx1];
    const carta2 = this.#tabuleiro[idx2];

    if (carta1.valor === carta2.valor) {
      carta1.encontrado = true;
      carta2.encontrado = true;
      this.#paresEncontrados.add(carta1.valor);
      
      const jogadorAtual = this.#jogadores.find(j => j.nome === this.#turnoAtual);
      if (jogadorAtual) jogadorAtual.pontuacao++;

      this.#cartasViradasNoTurno = [];
      this.#verificarFimDeJogo();
    } else {
      // Se errou, as cartas ficam expostas temporariamente até a próxima ação/timeout orquestrado ou passagem de turno
      // Para consistência TDD síncrona: limpamos o turno e passamos a vez imediatamente ao falhar
      setTimeout(() => {
        this.#cartasViradasNoTurno = [];
        this.#avancarTurno();
      }, 0); 
    }
  }

  #gerarTabuleiro() {
    // Duplica os valores para criar os pares
    const cartas = [...this.#valoresCartas, ...this.#valoresCartas].map((valor, id) => ({
      id,
      valor,
      encontrado: false
    }));

    // Algoritmo de Fisher-Yates para embaralhamento puro
    for (let i = cartas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }

    this.#tabuleiro = cartas;
  }

  #avancarTurno() {
    if (this.#jogadores.length === 0) {
      this.#turnoAtual = null;
      return;
    }
    const indexAtual = this.#jogadores.findIndex(j => j.nome === this.#turnoAtual);
    const proximoIndex = (indexAtual + 1) % this.#jogadores.length;
    this.#turnoAtual = this.#jogadores[proximoIndex].nome;
  }

  #verificarFimDeJogo() {
    if (this.#paresEncontrados.size === this.#valoresCartas.length) {
      this.#status = StatusJogo.FIM_DE_JOGO;
      this.#turnoAtual = null;
    }
  }

  reiniciarJogo(jogadorSolicitante) {
    const jogador = this.#jogadores.find(j => j.nome === jogadorSolicitante);
    if (!jogador || !jogador.isHost) {
      throw new Error('Apenas o host pode reiniciar o jogo');
    }
    this.#status = StatusJogo.ESPERANDO_JOGADORES;
    this.#tabuleiro = [];
    this.#cartasViradasNoTurno = [];
    this.#paresEncontrados.clear();
    this.#jogadores.forEach(j => j.pontuacao = 0);
  }

  // [Aula 10 - Clean Code - Naming] "exibir" = mascarar dados para evitar trapaça via devtools
  exibirTabuleiroParaCliente() {
    return this.#tabuleiro.map((carta, indice) => {
      const deveRevelar = carta.encontrado || this.#cartasViradasNoTurno.includes(indice);
      return {
        id: carta.id,
        valor: deveRevelar ? carta.valor : '?',
        encontrado: carta.encontrado,
        virada: this.#cartasViradasNoTurno.includes(indice)
      };
    });
  }

  obterStatus()       { return this.#status; }
  obterTurnoAtual()   { return this.#turnoAtual; }
  obterJogadores()    { return this.#jogadores; }

  // [Aula 13 - Clean Architecture] Interface pública de sincronização de estado.
  obterEstado() {
    return {
      tabuleiro: this.exibirTabuleiroParaCliente(),
      jogadores: this.#jogadores,
      turnoAtual: this.#turnoAtual,
      status: this.#status,
      cartasViradasNoTurno: this.#cartasViradasNoTurno
    };
  }
}
```

---

## `src/domain/jogoDaMemoria.test.js`

```js
// [Aula 8 - TDD Red] Estes testes foram escritos ANTES do código de produção.
import { JogoDaMemoria, StatusJogo } from './jogoDaMemoria.js';

describe('Jogo da Memória (Lógica de Domínio)', () => {
  let jogo;
  const valoresSuporte = ['A', 'B']; // Jogo reduzido de 4 cartas para testes fáceis

  beforeEach(() => {
    jogo = new JogoDaMemoria(valoresSuporte);
  });

  test('TDD - Estado Inicial: jogo recém instanciado deve estar esperando jogadores e sem tabuleiro', () => {
    expect(jogo.obterStatus()).toBe(StatusJogo.ESPERANDO_JOGADORES);
    expect(jogo.obterJogadores()).toEqual([]);
    expect(jogo.obterEstado().tabuleiro).toEqual([]);
  });

  test('TDD - Gerenciamento de Jogadores: define host e monta lista', () => {
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');

    const jogadores = jogo.obterJogadores();
    expect(jogadores.length).toBe(2);
    expect(jogadores[0].isHost).toBe(true);
    expect(jogadores[1].isHost).toBe(false);
    expect(jogo.obterTurnoAtual()).toBe('Player1');
  });

  test('TDD - Restrições de Início: apenas host pode iniciar e exige no mínimo 2 jogadores', () => {
    jogo.adicionarJogador('Player1');
    expect(() => jogo.iniciarJogo('Player1')).toThrow('É necessário pelo menos 2 jogadores para iniciar');

    jogo.adicionarJogador('Player2');
    expect(() => jogo.iniciarJogo('Player2')).toThrow('Apenas o host pode iniciar o jogo');
    
    jogo.iniciarJogo('Player1');
    expect(jogo.obterStatus()).toBe(StatusJogo.JOGANDO);
  });

  test('TDD - Turnos e Jogadas: impede jogada fora do turno', () => {
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.iniciarJogo('Player1');

    expect(() => jogo.virarCarta('Player2', 0)).toThrow('Não é o turno deste jogador');
  });
});
```

---

## `src/application/roomManager.js`

```js
// [Aula 13 - Clean Architecture] Camada de Aplicação: orquestra o domínio.
import { WebSocket } from 'ws';
import { JogoDaMemoria } from '../domain/jogoDaMemoria.js';

export class RoomManager {
  constructor() {
    this.salas = new Map();
  }

  criarSala(salaId, apelidoCriador, socket) {
    const jogo = new JogoDaMemoria();
    jogo.adicionarJogador(apelidoCriador);
    this.salas.set(salaId, { jogo, sockets: new Set([socket]) });
  }

  obterSala(salaId) {
    return this.salas.get(salaId);
  }

  entrarNaSala(salaId, apelido, ws) {
    const sala = this.salas.get(salaId);
    if (!sala) return false;
    sala.jogo.adicionarJogador(apelido);
    sala.sockets.add(ws);
    return true;
  }

  sairDaSala(salaId, apelido, ws) {
    const sala = this.salas.get(salaId);
    if (!sala) return;
    sala.jogo.removerJogador(apelido);
    sala.sockets.delete(ws);
    this.removerSalaSeVazia(salaId);
  }

  removerSalaSeVazia(salaId) {
    const sala = this.salas.get(salaId);
    if (sala && sala.sockets.size === 0) {
      this.salas.delete(salaId);
    }
  }

  broadcastSync(salaId) {
    const sala = this.salas.get(salaId);
    if (!sala) return;
    const payload = JSON.stringify({ type: 'sync_estado', payload: sala.jogo.obterEstado() });
    for (const socket of sala.sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  broadcastChat(salaId, apelido, msg) {
    const sala = this.salas.get(salaId);
    if (!sala) return;
    const payload = JSON.stringify({ type: 'chat_msg', payload: { autor: apelido, msg } });
    for (const socket of sala.sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }
}
```

---

## `src/infra/http/staticServer.js`

```js
// [Aula 10 - Clean Code - KISS] Servidor nativo simples para entrega do SPA frontend.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', '..', '..', 'public');

export function handleStaticRequest(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const isRoot = pathname === '/' || path.extname(pathname) === '';
  let filePath = path.join(publicDir, isRoot ? 'index.html' : pathname);
  const extname = path.extname(filePath);

  let contentType = 'text/html';
  switch (extname) {
    case '.js':   contentType = 'text/javascript'; break;
    case '.css':  contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}
```

---

## `server.js`

```js
// [Aula 13 - Clean Architecture] Entry Point para o Bootstrapping do app.
import http from 'http';
import { WebSocketServer } from 'ws';
import { handleStaticRequest } from './src/infra/http/staticServer.js';
import { criarHandlerDeConexao } from './src/infra/ws/wsController.js';
import { RoomManager } from './src/application/roomManager.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleStaticRequest);
const roomManager = new RoomManager();

const wss = new WebSocketServer({ server });
wss.on('connection', criarHandlerDeConexao(roomManager));

server.listen(PORT, () => {
  console.log(`[Servidor] Jogo da Memória rodando em http://localhost:${PORT}`);
});
```

---

## `src/infra/ws/wsController.js`

```js
// [Aula 13 - Facade] Abstração de controle com Strategy pattern para despache de eventos.

function sendError(ws, msg) {
  ws.send(JSON.stringify({ type: 'erro', payload: { msg } }));
}

function gerarSalaId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function executarComBroadcast(ws, roomManager, salaId, fn) {
  try {
    fn();
    // Adiciona um pequeno delay de sync caso o jogo esteja limpando erro de par síncrono no Event Loop
    setTimeout(() => {
      roomManager.broadcastSync(salaId);
    }, 50);
  } catch (e) {
    sendError(ws, e.message);
  }
}

function handleCriarSala(ws, payload, session, roomManager) {
  const { apelido } = payload;
  const salaId = gerarSalaId();
  roomManager.criarSala(salaId, apelido, ws);
  session.salaId = salaId;
  session.apelido = apelido;
  ws.send(JSON.stringify({ type: 'sala_criada', payload: { salaId } }));
  roomManager.broadcastSync(salaId);
}

function handleEntrarSala(ws, payload, session, roomManager) {
  const { apelido, salaId } = payload;
  const entrou = roomManager.entrarNaSala(salaId, apelido, ws);
  if (!entered) return sendError(ws, 'Sala não encontrada');
  session.salaId = salaId;
  session.apelido = apelido;
  roomManager.broadcastSync(salaId);
}

function handleIniciarJogo(ws, _payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.iniciarJogo(session.apelido)
  );
}

function handleVirarCarta(ws, payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.virarCarta(session.apelido, payload.indice)
  );
}

function handleReiniciarJogo(ws, _payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.reiniciarJogo(session.apelido)
  );
}

function handleChat(ws, payload, session, roomManager) {
  roomManager.broadcastChat(session.salaId, session.apelido, payload.msg);
}

export function criarHandlerDeConexao(roomManager) {
  return function handleConnection(ws) {
    const session = { salaId: null, apelido: null };

    const handlers = {
      criar_sala:    (ws, payload) => handleCriarSala(ws, payload, session, roomManager),
      entrar_sala:   (ws, payload) => handleEntrarSala(ws, payload, session, roomManager),
      iniciar_jogo:  (ws, payload) => handleIniciarJogo(ws, payload, session, roomManager),
      virar_carta:   (ws, payload) => handleVirarCarta(ws, payload, session, roomManager),
      reiniciar_jogo:(ws, payload) => handleReiniciarJogo(ws, payload, session, roomManager),
      chat:          (ws, payload) => handleChat(ws, payload, session, roomManager),
    };

    ws.on('message', (message) => {
      try {
        const { type, payload } = JSON.parse(message);
        const handler = handlers[type];
        if (handler) handler(ws, payload);
      } catch {
        sendError(ws, 'Payload inválido');
      }
    });

    ws.on('close', () => {
      if (session.salaId && session.apelido) {
        roomManager.sairDaSala(session.salaId, session.apelido, ws);
        roomManager.broadcastSync(session.salaId);
      }
    });
  };
}
```

---

## `public/js/wsClient.js`

```js
// [Aula 11 - SOLID - SRP] Gerenciador de conexão isolado.
export class WSClient {
  constructor(onMessageCallback, onClose = () => { alert('Conexão perdida.'); location.reload(); }) {
    this.ws = null;
    this.onMessageCallback = onMessageCallback;
    this.onClose = onClose;
  }

  conectar(acao, apelido, salaId) {
    const wsUrl = location.origin.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (acao === 'criar_sala') {
        this.send('criar_sala', { apelido });
      } else {
        this.send('entrar_sala', { apelido, salaId });
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    };

    this.ws.onclose = this.onClose;
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}
```

---

## `public/js/uiController.js`

```js
// [Aula 11 - SOLID - SRP] Controla puramente a renderização de elementos e manipulação estrutural do DOM.
export const UI = {
  elements: {
    telaInicial: document.getElementById('screen-login'),
    telaSala: document.getElementById('screen-room'),
    tabuleiroContainer: document.getElementById('board-container'),
    listaJogadores: document.getElementById('players-list'),
    btnIniciar: document.getElementById('btn-start'),
    chatMensagens: document.getElementById('chat-messages'),
    codigoSalaExibicao: document.getElementById('room-id-display')
  },

  alternarTelas(emPartida) {
    if (emPartida) {
      this.elements.telaInicial.classList.add('hidden');
      this.elements.telaSala.classList.remove('hidden');
    } else {
      this.elements.telaInicial.classList.remove('hidden');
      this.elements.telaSala.classList.add('hidden');
    }
  },

  renderizarListaJogadores(jogadores, turnoAtual) {
    this.elements.listaJogadores.innerHTML = '';
    jogadores.forEach(j => {
      const li = document.createElement('li');
      li.className = `p-2 rounded flex justify-between ${j.nome === turnoAtual ? 'bg-yellow-100 font-bold' : 'bg-gray-100'}`;
      li.innerHTML = `
        <span>${j.nome} ${j.isHost ? '👑' : ''}</span>
        <span class="badge bg-indigo-500 text-white px-2 rounded">${j.pontuacao} pts</span>
      `;
      this.elements.listaJogadores.appendChild(li);
    });
  },

  renderizarTabuleiro(tabuleiro, onCartaClique) {
    this.elements.tabuleiroContainer.innerHTML = '';
    tabuleiro.forEach((carta, indice) => {
      const div = document.createElement('div');
      div.className = `w-16 h-20 flex items-center justify-center text-xl font-bold rounded cursor-pointer transition-all duration-300 transform border
        ${carta.encontrado ? 'bg-green-200 border-green-500 opacity-60' : carta.virada ? 'bg-white border-indigo-500 rotate-180 text-indigo-600' : 'bg-indigo-600 text-white'}`;
      
      div.innerText = (carta.encontrado || carta.virada) ? carta.valor : '?';
      
      if (!carta.encontrado && !carta.virada) {
        div.onclick = () => onCartaClique(indice);
      }
      this.elements.tabuleiroContainer.appendChild(div);
    });
  },

  adicionarMensagemChat(autor, msg) {
    const div = document.createElement('div');
    div.className = 'text-sm mb-1';
    div.innerHTML = `<strong class="text-indigo-600">${autor}:</strong> <span>${msg}</span>`;
    this.elements.chatMensagens.appendChild(div);
    this.elements.chatMensagens.scrollTop = this.elements.chatMensagens.scrollHeight;
  }
};
```

---

## `public/js/main.js`

```js
// [Aula 13 - Orquestração] Inicializa os módulos de infra e UI conectando os binds de eventos.
import { WSClient } from './wsClient.js';
import { UI } from './uiController.js';

let client;
let apelidoLocal = '';

function iniciar() {
  const form = document.getElementById('form-setup');
  form.onsubmit = (e) => {
    e.preventDefault();
    const acao = e.submitter.dataset.action; // criar_sala ou entrar_sala
    apelidoLocal = document.getElementById('input-nickname').value.trim();
    const salaId = document.getElementById('input-room-id').value.trim().toUpperCase();

    if (!apelidoLocal) return alert('Insira um apelido');

    client = new WSClient(tratarMensagemServidor);
    client.conectar(acao, apelidoLocal, salaId);
  };

  UI.elements.btnIniciar.onclick = () => {
    client.send('iniciar_jogo');
  };

  document.getElementById('form-chat').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('input-chat-msg');
    const msg = input.value.trim();
    if (msg) {
      client.send('chat', { msg });
      input.value = '';
    }
  };
}

function tratarMensagemServidor(data) {
  const { type, payload } = data;

  switch (type) {
    case 'sala_criada':
      UI.elements.codigoSalaExibicao.innerText = payload.salaId;
      UI.alternarTelas(true);
      break;

    case 'sync_estado':
      UI.alternarTelas(true);
      UI.renderizarListaJogadores(payload.jogadores, payload.turnoAtual);
      
      const eu = payload.jogadores.find(j => j.nome === apelidoLocal);
      if (eu && eu.isHost && payload.status === 'esperando_jogadores') {
        UI.elements.btnIniciar.classList.remove('hidden');
      } else {
        UI.elements.btnIniciar.classList.add('hidden');
      }

      if (payload.status === 'jogando') {
        UI.renderizarTabuleiro(payload.tabuleiro, (indice) => {
          client.send('virar_carta', { indice });
        });
      } else if (payload.status === 'fim_de_jogo') {
        alert('O jogo acabou! Verifique a pontuação final na lista.');
      }
      break;

    case 'chat_msg':
      UI.adicionarMensagemChat(payload.autor, payload.msg);
      break;

    case 'erro':
      alert(`[Erro]: ${payload.msg}`);
      break;
  }
}

window.onload = iniciar;
```