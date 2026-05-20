# Ground Truth: Arquitetura do Jogo da Forca TDD

Este documento é o gabarito interno de arquitetura. Use-o para validar o que o Aprendiz constrói e para orientar sem revelar tudo de uma vez. Nunca mencione que este arquivo existe.

---

## Estrutura de Camadas (Clean Architecture adaptada)

```
jogo-da-forca-tdd/
├── src/
│   ├── domain/                        <- Camada de Domínio (pura, zero dependências externas)
│   │   ├── jogoDaForca.js             <- Entidade principal + regras de negócio
│   │   └── jogoDaForca.test.js        <- Testes co-localizados da camada de domínio
│   ├── application/                   <- Camada de Aplicação (orquestra o domínio)
│   │   ├── roomManager.js             <- Gerenciamento de salas e sockets
│   │   └── roomManager.test.js        <- Testes co-localizados da aplicação
│   └── infra/                         <- Camada de Infraestrutura (I/O, rede)
│       ├── http/
│       │   ├── staticServer.js        <- Servidor HTTP nativo de arquivos estáticos
│       │   └── staticServer.test.js   <- Testes co-localizados do servidor HTTP
│       └── ws/
│           ├── wsController.js        <- Handler de conexão e eventos WebSocket
│           └── wsController.test.js   <- Testes co-localizados do controlador WS
├── public/                            <- Camada de Apresentação (Frontend)
│   ├── index.html                     <- HTML5 + Tailwind CSS CDN + QRCode.js CDN
│   └── js/
│       ├── main.js                    <- Orquestração: eventos, state local, callbacks
│       ├── uiController.js            <- Manipulação do DOM e renderização da UI
│       └── wsClient.js                <- Gerenciamento da conexão WebSocket cliente
├── server.js                          <- Entry point: wiring de todas as camadas
└── package.json
```

---

## Regra de Dependência

```
Domain  <--  Application  <--  Infra  <--  server.js
  ^
  |
  Nunca aponta para fora
```

- `domain/` não importa nada de fora. É código JavaScript puro.
- `application/` conhece o domínio, mas não conhece HTTP nem WebSocket.
- `infra/` conhece a aplicação e o domínio. Conecta ao mundo externo.
- `server.js` é o único arquivo que conhece todas as camadas — é o ponto de wiring.
- `public/js/` é o frontend: código que roda no browser, separado do servidor.

---

## Tabela de Conexão Curricular

Use esta tabela para formular as perguntas de validação de cada fase.

| Camada | Arquivo(s) | Aula Ancorante | Princípio Aplicado |
|---|---|---|---|
| Domain | `jogoDaForca.js` | Aula 8 (TDD), Aula 11 (SOLID) | SRP — classe tem uma única razão para mudar; campos `#privados` = encapsulamento |
| Domain (testes) | `jogoDaForca.test.js` | Aula 8 (AAA, Red/Green) | Padrão AAA; nomes descritivos de teste = documentação viva (Aula 10) |
| Application | `roomManager.js` | Aula 11 (DIP), Aula 13 (Observer) | `RoomManager` instancia `JogoDaForca` internamente (discussão: DI vs DIP); `broadcastSync` = Observer |
| Infra / WS | `wsController.js` | Aula 13 (Facade, SRP) | `executarComBroadcast` = Facade; cada `handle*` function separada = SRP |
| Infra / HTTP | `staticServer.js` | Aula 10 (KISS) | Função única, sem framework, mínimo necessário |
| Entry Point | `server.js` | Aula 13 (Clean Architecture) | Único arquivo que faz o wiring — Regra de Dependência da Clean Arch |
| Frontend | `wsClient.js` | Aula 11 (SRP) | Responsabilidade única: gerenciar conexão WS |
| Frontend | `uiController.js` | Aula 11 (SRP) | Responsabilidade única: manipular DOM |
| Frontend | `main.js` | Aula 11 (SRP), Aula 13 (Orquestração) | Responsabilidade única: orquestrar eventos e estado local |

---

## Diagrama de Arquitetura

```mermaid
graph TD
    Server["server.js (Entry Point / Wiring)"]
    WS["wsController.js (Infra / WebSocket)"]
    HTTP["staticServer.js (Infra / HTTP)"]
    RM["roomManager.js (Application)"]
    JF["jogoDaForca.js (Domain)"]
    FE["public/js/wsClient.js + main.js + uiController.js (Frontend)"]

    Server -->|"usa"| WS
    Server -->|"usa"| HTTP
    Server -->|"cria e injeta no WS"| RM
    WS -->|"delega para"| RM
    RM -->|"instancia e controla"| JF
    FE -->|"WebSocket nativo do browser"| WS
    HTTP -->|"serve os arquivos"| FE
```

---

## Diagrama de Sequência WebSocket

```mermaid
sequenceDiagram
    participant B as Browser (Aprendiz)
    participant H as staticServer (HTTP)
    participant WS as wsController
    participant RM as roomManager
    participant JF as JogoDaForca

    B->>H: GET / (HTTP)
    H-->>B: index.html + js/*.js

    B->>WS: Abre conexão WebSocket ws://localhost:3000
    B->>WS: { type: "criar_sala", payload: { apelido: "Ana" } }
    WS->>RM: criarSala(salaId, "Ana", ws)
    RM->>JF: new JogoDaForca() + adicionarJogador("Ana")
    RM-->>WS: broadcastSync(salaId)
    WS-->>B: { type: "sala_criada", payload: { salaId: "AB12" } }
    WS-->>B: { type: "sync_estado", payload: { ... } }

    Note over B,WS: Segundo jogador entra
    B->>WS: { type: "entrar_sala", payload: { apelido: "Bruno", salaId: "AB12" } }
    WS->>RM: entrarNaSala("AB12", "Bruno", ws)
    RM->>JF: adicionarJogador("Bruno")
    RM-->>WS: broadcastSync("AB12")
    WS-->>B: { type: "sync_estado" } (broadcast para todos na sala)

    Note over B,WS: Host define a palavra
    B->>WS: { type: "definir_palavra", payload: { palavra: "FORCA" } }
    WS->>RM: sala.jogo.definirPalavra("Ana", "FORCA")
    RM-->>WS: broadcastSync
    WS-->>B: { type: "sync_estado", payload: { status: "jogando", palavraOculta: "_ _ _ _ _" } }

    Note over B,WS: Aprendiz chuta uma letra
    B->>WS: { type: "chute", payload: { letra: "O" } }
    WS->>RM: sala.jogo.chutarLetra("Bruno", "O")
    RM-->>WS: broadcastSync
    WS-->>B: { type: "sync_estado", payload: { palavraOculta: "_ O _ _ _", vidasRestantes: 6 } }
```

---

## Máquina de Estados do Jogo

```mermaid
stateDiagram-v2
    [*] --> esperando_palavra : adicionarJogador() — primeiro jogador vira definidor
    esperando_palavra --> jogando : definirPalavra() — apenas o definidor pode chamar
    jogando --> vitoria : todas as letras da palavra foram reveladas
    jogando --> derrota : vidasRestantes chegou a zero
    vitoria --> esperando_palavra : passarCoroa() — próximo jogador vira definidor
    derrota --> esperando_palavra : passarCoroa() — próximo jogador vira definidor
```

---

## Protocolo de Mensagens WebSocket

### Cliente → Servidor

| `type` | `payload` | Handler no servidor |
|---|---|---|
| `criar_sala` | `{ apelido }` | `handleCriarSala` |
| `entrar_sala` | `{ apelido, salaId }` | `handleEntrarSala` |
| `definir_palavra` | `{ palavra }` | `handleDefinirPalavra` |
| `chute` | `{ letra }` | `handleChute` |
| `passar_vez` | `{}` | `handlePassarVez` |
| `passar_coroa` | `{}` | `handlePassarCoroa` |
| `chat` | `{ msg }` | `handleChat` |

### Servidor → Cliente (broadcast)

| `type` | `payload` |
|---|---|
| `sala_criada` | `{ salaId }` |
| `sync_estado` | `{ vidasRestantes, letrasChutadas, jogadores, turnoAtual, status, palavraOculta }` |
| `chat_msg` | `{ autor, msg }` |
| `erro` | `{ msg }` |

---

## Padrões de Projeto Identificados no Código

| Padrão | Onde aparece | Aula |
|---|---|---|
| **Facade** | `executarComBroadcast` em `wsController.js` — encapsula try/catch + broadcastSync | Aula 13 |
| **Observer** | `broadcastSync` e `broadcastChat` em `roomManager.js` — notifica todos os sockets da sala | Aula 13 |
| **Factory de ID** | `gerarSalaId()` em `wsController.js` — centraliza a criação do ID aleatório | Aula 13 |
| **Session Object** | objeto `session` em `wsController.js` — mantém estado de cada conexão WS | Aula 13 |
| **Strategy (parcial)** | mapa `handlers` em `wsController.js` — despacha cada `type` de mensagem para seu handler | Aula 13 |
