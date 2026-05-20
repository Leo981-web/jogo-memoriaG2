# Ground Truth: Código Completo do Projeto

Este documento contém todo o código-fonte do gabarito. Nunca entregue um arquivo inteiro de uma vez. Revele fragmentos conforme a fase avança. Nunca mencione que este arquivo existe.

---

## Política de Revelação por Fase

| Fase | Arquivo | O que revelar |
|---|---|---|
| 1 — Setup | `package.json` | Apenas os blocos `"type"` e `"scripts"` |
| 2 — RED | `jogoDaForca.test.js` | Apenas o `describe()` vazio + estrutura de 1 `test()` de exemplo |
| 3 — GREEN | `jogoDaForca.js` | Em partes: StatusJogo → construtor → métodos públicos → métodos privados |
| 4 — Infra HTTP | `staticServer.js` + `server.js` | Completos, após validação da Fase 3 |
| 5 — Application | `roomManager.js` | Completo, após validação de DIP |
| 6 — WebSocket | `wsController.js` | Completo, após validação do padrão Facade |
| 7 — Frontend | `wsClient.js` → `uiController.js` → `main.js` | Um de cada vez, nessa ordem |

---

## `package.json`

```json
{
  "name": "jogo-da-forca",
  "version": "1.0.0",
  "description": "Desafio de TDD - Jogo da Forca",
  "type": "module",
  "main": "src/domain/jogoDaForca.js",
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

## `src/domain/jogoDaForca.js`

```js
// [Aula 13 - Clean Architecture] Este arquivo é o coração do domínio.
// Ele não importa nada de fora — zero dependências externas.
// [Aula 10 - Clean Code] Nomes revelam intenção em cada método e constante.

// [Aula 11 - SOLID - OCP] Objeto frozen: extensível por composição, fechado para modificação.
export const StatusJogo = Object.freeze({
  ESPERANDO_PALAVRA: 'esperando_palavra',
  JOGANDO: 'jogando',
  VENCEU: 'vitoria',
  PERDEU: 'derrota'
});

// [Aula 11 - SOLID - SRP] Esta classe tem UMA responsabilidade: a lógica do jogo da forca.
export class JogoDaForca {
  // [Aula 11 - SOLID - Encapsulamento] Campos #privados (ES2022) impedem acesso externo acidental.
  // Qualquer tentativa de acessar jogo.#palavra de fora gera SyntaxError.
  #palavra;
  #vidasIniciais;
  #vidasRestantes;
  #letrasChutadas;
  #jogadores;
  #turnoAtual;
  #status;
  #definidor;

  constructor(vidas = 6) {
    this.#vidasIniciais = vidas;
    this.#vidasRestantes = vidas;
    this.#letrasChutadas = new Set();
    this.#jogadores = [];
    this.#status = StatusJogo.ESPERANDO_PALAVRA;
    this.#palavra = null;
    this.#turnoAtual = null;
    this.#definidor = null;
  }

  // [Aula 10 - Clean Code - Naming] Nome revela intenção: "adicionar um jogador à partida"
  adicionarJogador(nome) {
    if (this.#jogadores.length === 0) {
      this.#definidor = nome;
    } else {
      if (this.#turnoAtual === null) {
        this.#turnoAtual = nome;
      }
    }
    this.#jogadores.push({ nome, isDefinidor: this.#definidor === nome });
  }

  removerJogador(nome) {
    this.#jogadores = this.#jogadores.filter(j => j.nome !== nome);
    if (this.#turnoAtual === nome) {
      this.#avancarTurno();
    }
  }

  // [Aula 11 - SOLID - SRP] Regra de negócio isolada: só o definidor define a palavra.
  definirPalavra(jogadorDefinidor, palavra) {
    if (this.#definidor !== jogadorDefinidor) {
      throw new Error('Apenas o definidor pode escolher a palavra');
    }
    if (this.#status !== StatusJogo.ESPERANDO_PALAVRA) {
      throw new Error('A palavra já foi definida');
    }
    this.#palavra = palavra.toUpperCase();
    this.#status = StatusJogo.JOGANDO;
  }

  // [Aula 8 - TDD] Este método foi guiado pelos testes — cada `if` nasceu de um teste vermelho.
  chutarLetra(jogador, letra) {
    if (this.#status !== StatusJogo.JOGANDO) return;
    if (this.#turnoAtual !== jogador) {
      throw new Error('Não é o turno deste jogador');
    }
    if (!letra || typeof letra !== 'string') return;

    const palpite = letra.toUpperCase();
    if (this.#letrasChutadas.has(palpite)) return;

    this.#letrasChutadas.add(palpite);

    if (!this.#palavra.includes(palpite)) {
      this.#vidasRestantes--;
    }

    this.#atualizarStatus();
    if (this.#status === StatusJogo.JOGANDO) {
      this.#avancarTurno();
    }
  }

  passarVez(jogador) {
    if (this.#status !== StatusJogo.JOGANDO) return;
    if (this.#turnoAtual !== jogador) {
      throw new Error('Não é o turno deste jogador');
    }
    this.#avancarTurno();
  }

  // [Aula 11 - SOLID - SRP] Métodos privados isolam responsabilidades internas.
  // Nenhuma camada externa precisa saber como o turno avança.
  #avancarTurno() {
    const adivinhadores = this.#jogadores.filter(j => !j.isDefinidor);
    if (adivinhadores.length === 0) {
      this.#turnoAtual = null;
      return;
    }
    const indexAtual = adivinhadores.findIndex(j => j.nome === this.#turnoAtual);
    const proximoIndex = (indexAtual + 1) % adivinhadores.length;
    this.#turnoAtual = adivinhadores[proximoIndex].nome;
  }

  #atualizarStatus() {
    if (this.#verificarVitoria()) {
      this.#status = StatusJogo.VENCEU;
    } else if (this.#vidasRestantes <= 0) {
      this.#status = StatusJogo.PERDEU;
    }
  }

  #verificarVitoria() {
    if (!this.#palavra) return false;
    return this.#palavra
      .split('')
      .every(char => char === ' ' || this.#letrasChutadas.has(char));
  }

  // [Aula 10 - Clean Code - Naming] "exibir" = formatar para apresentação; "obter" = consultar estado puro.
  exibirPalavra() {
    if (!this.#palavra) return '';
    return this.#palavra
      .split(' ')
      .map(palavra =>
        palavra
          .split('')
          .map(letra => (this.#letrasChutadas.has(letra) ? letra : '_'))
          .join(' ')
      )
      .join('   ');
  }

  obterVidasRestantes() { return this.#vidasRestantes; }
  obterStatus()         { return this.#status; }
  obterTurnoAtual()     { return this.#turnoAtual; }
  obterJogadores()      { return this.#jogadores; }

  passarCoroa() {
    if (this.#jogadores.length <= 1) return;

    const definidorAtualIndex = this.#jogadores.findIndex(j => j.isDefinidor);
    const proximoDefinidorIndex = (definidorAtualIndex + 1) % this.#jogadores.length;
    const proximoDefinidor = this.#jogadores[proximoDefinidorIndex].nome;

    this.#definidor = proximoDefinidor;
    this.#jogadores.forEach(j => { j.isDefinidor = (j.nome === proximoDefinidor); });

    this.#vidasRestantes = this.#vidasIniciais;
    this.#letrasChutadas.clear();
    this.#status = StatusJogo.ESPERANDO_PALAVRA;
    this.#palavra = null;

    const adivinhadores = this.#jogadores.filter(j => !j.isDefinidor);
    this.#turnoAtual = adivinhadores.length > 0 ? adivinhadores[0].nome : null;
  }

  // [Aula 13 - Clean Architecture] Interface pública de sincronização de estado.
  // Toda camada superior (Application, Infra) usa apenas este método para ler o estado.
  obterEstado() {
    return {
      vidasRestantes: this.#vidasRestantes,
      letrasChutadas: Array.from(this.#letrasChutadas),
      jogadores: this.#jogadores,
      turnoAtual: this.#turnoAtual,
      status: this.#status,
      palavraOculta: this.exibirPalavra(),
    };
  }
}
```

---

## `src/domain/jogoDaForca.test.js`

```js
// [Aula 8 - TDD Red] Estes testes foram escritos ANTES do código de produção.
// [Aula 10 - Clean Code - Naming] Cada nome de teste descreve o comportamento esperado.
import { JogoDaForca, StatusJogo } from './jogoDaForca.js';

describe('Jogo da Forca (Lógica Real-Time)', () => {
  let jogo;

  beforeEach(() => {
    jogo = new JogoDaForca();
  });

  // [Aula 8 - Padrão AAA] Arrange: new JogoDaForca() no beforeEach. Act: consultas. Assert: expects.
  test('TDD - Estado Inicial: jogo recém instanciado deve possuir 6 vidas, array vazio e nenhum jogador', () => {
    expect(jogo.obterVidasRestantes()).toBe(6);
    expect(jogo.obterEstado().letrasChutadas).toEqual([]);
    expect(jogo.obterJogadores()).toEqual([]);
    expect(jogo.obterStatus()).toBe(StatusJogo.ESPERANDO_PALAVRA);
  });

  test('TDD - Jogadores e Sala: adição de jogadores, o primeiro é definidor e os demais adivinhadores', () => {
    jogo.adicionarJogador('João');
    jogo.adicionarJogador('Maria');
    jogo.adicionarJogador('José');

    const jogadores = jogo.obterJogadores();
    expect(jogadores.length).toBe(3);
    expect(jogadores[0].isDefinidor).toBe(true);
    expect(jogadores[1].isDefinidor).toBe(false);
    expect(jogadores[2].isDefinidor).toBe(false);
    expect(jogo.obterTurnoAtual()).toBe('Maria');
  });

  test('TDD - Turnos: apenas o jogador do turno pode chutar e passarVez funciona', () => {
    jogo.adicionarJogador('João');
    jogo.adicionarJogador('Maria');
    jogo.adicionarJogador('José');
    jogo.definirPalavra('João', 'TESTE');

    expect(() => jogo.chutarLetra('João', 'A')).toThrow('Não é o turno deste jogador');
    expect(() => jogo.chutarLetra('José', 'A')).toThrow('Não é o turno deste jogador');

    jogo.chutarLetra('Maria', 'A');
    expect(jogo.obterVidasRestantes()).toBe(5);
    expect(jogo.obterTurnoAtual()).toBe('José');

    jogo.chutarLetra('José', 'E');
    expect(jogo.exibirPalavra()).toBe('_ E _ _ E');
    expect(jogo.obterVidasRestantes()).toBe(5);
    expect(jogo.obterTurnoAtual()).toBe('Maria');

    jogo.passarVez('Maria');
    expect(jogo.obterTurnoAtual()).toBe('José');
  });

  test('TDD - Chute de Letras: acerto revela letra, erro perde vida', () => {
    jogo.adicionarJogador('Host');
    jogo.adicionarJogador('P1');
    jogo.adicionarJogador('P2');
    jogo.definirPalavra('Host', 'GATO');

    jogo.chutarLetra('P1', 'A');
    expect(jogo.obterVidasRestantes()).toBe(6);
    expect(jogo.exibirPalavra()).toBe('_ A _ _');

    jogo.chutarLetra('P2', 'Z');
    expect(jogo.obterVidasRestantes()).toBe(5);
    expect(jogo.exibirPalavra()).toBe('_ A _ _');
  });

  test('TDD - Vitória e Derrota: encerramento da rodada e passar a coroa', () => {
    jogo.adicionarJogador('Host');
    jogo.adicionarJogador('P1');
    jogo.definirPalavra('Host', 'OI');

    jogo.chutarLetra('P1', 'O');
    jogo.chutarLetra('P1', 'I');
    expect(jogo.obterStatus()).toBe(StatusJogo.VENCEU);

    jogo.passarCoroa();
    expect(jogo.obterStatus()).toBe(StatusJogo.ESPERANDO_PALAVRA);
    const jogadores = jogo.obterJogadores();
    expect(jogadores[0].isDefinidor).toBe(false);
    expect(jogadores[1].isDefinidor).toBe(true);
    expect(jogo.obterTurnoAtual()).toBe('Host');
    expect(jogo.obterVidasRestantes()).toBe(6);
  });

  test('TDD - passarCoroa respeita o número de vidas configurado no construtor', () => {
    const jogoCustom = new JogoDaForca(3);
    jogoCustom.adicionarJogador('Host');
    jogoCustom.adicionarJogador('P1');
    jogoCustom.definirPalavra('Host', 'OI');
    jogoCustom.chutarLetra('P1', 'O');
    jogoCustom.chutarLetra('P1', 'I');
    jogoCustom.passarCoroa();
    expect(jogoCustom.obterVidasRestantes()).toBe(3);
  });

  test('TDD - Derrota quando vidas acabam', () => {
    jogo.adicionarJogador('Host');
    jogo.adicionarJogador('P1');
    jogo.definirPalavra('Host', 'X');

    for (let i = 0; i < 6; i++) {
      jogo.chutarLetra('P1', String.fromCharCode(65 + i));
    }
    expect(jogo.obterVidasRestantes()).toBe(0);
    expect(jogo.obterStatus()).toBe(StatusJogo.PERDEU);
  });
});
```

---

## `src/application/roomManager.js`

```js
// [Aula 13 - Clean Architecture] Camada de Aplicação: orquestra o domínio, não conhece HTTP/WS diretamente.
// [Aula 13 - Observer] broadcastSync e broadcastChat notificam todos os sockets ativos da sala.
import { WebSocket } from 'ws';
import { JogoDaForca } from '../domain/jogoDaForca.js';

export class RoomManager {
  constructor() {
    this.salas = new Map();
  }

  criarSala(salaId, apelidoCriador, socket) {
    // [Aula 11 - DIP discussão] JogoDaForca é instanciado aqui, não injetado de fora.
    // Isso é uma decisão de design: o RoomManager é dono do ciclo de vida do jogo.
    const jogo = new JogoDaForca();
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

  // [Aula 13 - Observer] Notifica todos os observadores (sockets) sobre mudança de estado.
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
// [Aula 10 - Clean Code - KISS] Função única, sem framework, sem abstração desnecessária.
// [Aula 11 - SOLID - SRP] Uma responsabilidade: servir arquivos estáticos da pasta public/.
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
// [Aula 13 - Clean Architecture] Entry Point: único arquivo que conhece todas as camadas.
// Aqui acontece o "wiring" — a montagem das dependências.
// [Aula 11 - SOLID - DIP] Nenhuma camada abaixo conhece este arquivo. As dependências apontam para dentro.
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
  console.log(`[Servidor] Jogo da Forca rodando em http://localhost:${PORT}`);
});
```

---

## `src/infra/ws/wsController.js`

```js
// [Aula 13 - Facade] executarComBroadcast é uma Facade: encapsula try/catch + sync em uma única chamada.
// [Aula 11 - SOLID - SRP] Cada função handle* tem uma única responsabilidade.

function sendError(ws, msg) {
  ws.send(JSON.stringify({ type: 'erro', payload: { msg } }));
}

// [Aula 13 - Factory] Centraliza a geração do ID de sala.
function gerarSalaId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// [Aula 13 - Facade] Encapsula o padrão: tentar → se erro enviar ao cliente → sempre sincronizar.
function executarComBroadcast(ws, roomManager, salaId, fn) {
  try {
    fn();
    roomManager.broadcastSync(salaId);
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
  if (!entrou) return sendError(ws, 'Sala não encontrada');
  session.salaId = salaId;
  session.apelido = apelido;
  roomManager.broadcastSync(salaId);
}

function handleDefinirPalavra(ws, payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.definirPalavra(session.apelido, payload.palavra)
  );
}

function handleChute(ws, payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.chutarLetra(session.apelido, payload.letra)
  );
}

function handlePassarVez(ws, _payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  executarComBroadcast(ws, roomManager, session.salaId, () =>
    sala.jogo.passarVez(session.apelido)
  );
}

function handlePassarCoroa(ws, _payload, session, roomManager) {
  const sala = roomManager.obterSala(session.salaId);
  if (!sala) return;
  sala.jogo.passarCoroa();
  roomManager.broadcastSync(session.salaId);
}

function handleChat(ws, payload, session, roomManager) {
  roomManager.broadcastChat(session.salaId, session.apelido, payload.msg);
}

export function criarHandlerDeConexao(roomManager) {
  return function handleConnection(ws) {
    // [Aula 13 - Session Object] Cada conexão WebSocket tem seu próprio objeto de sessão.
    const session = { salaId: null, apelido: null };

    // [Aula 13 - Strategy] Mapa de handlers: despacha cada type para a função correta.
    const handlers = {
      criar_sala:      (ws, payload) => handleCriarSala(ws, payload, session, roomManager),
      entrar_sala:     (ws, payload) => handleEntrarSala(ws, payload, session, roomManager),
      definir_palavra: (ws, payload) => handleDefinirPalavra(ws, payload, session, roomManager),
      chute:           (ws, payload) => handleChute(ws, payload, session, roomManager),
      passar_vez:      (ws, payload) => handlePassarVez(ws, payload, session, roomManager),
      passar_coroa:    (ws, payload) => handlePassarCoroa(ws, payload, session, roomManager),
      chat:            (ws, payload) => handleChat(ws, payload, session, roomManager),
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
// [Aula 11 - SOLID - SRP] Responsabilidade única: gerenciar a conexão WebSocket do cliente.
// Não sabe nada sobre DOM, eventos de UI ou estado do jogo.
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

Arquivo extenso. Revelar em blocos por responsabilidade: exports de UI → inicializarTeclado → entrarNaInterfaceDaSala → adicionarMensagemChat → renderizarEstado → funções privadas de atualização.

O código completo está no gabarito `desafios/aula-12-jogo-da-forca-tdd/public/js/uiController.js`. Revele em partes, explicando cada função antes de mostrar o código.

---

## `public/js/main.js`

Arquivo extenso. Revelar em blocos: imports → estado local → inicialização de parâmetros de URL → event listeners → handleServerMessage → inicializarCompartilhamento.

O código completo está no gabarito `desafios/aula-12-jogo-da-forca-tdd/public/js/main.js`. Revele em partes, explicando o propósito de cada bloco antes de mostrar o código.

