# Jogo da Memória — Multiplayer em Tempo Real!

Jogo da memória multiplayer desenvolvido com **Node.js**, **WebSockets** e **JavaScript puro** com temática de Linguagens de Programação!

Dois jogadores entram na mesma sala e disputam quem encontra mais pares.

---

## Tecnologias Utilizadas:

| Camada | Tecnologia |
|---|---|
| Comunicação em tempo real | WebSockets (`ws`) |
| Frontend | HTML + CSS + JavaScript (ES Modules) |
| Ícones | Font Awesome |
| Arquitetura | Test-Driven Design |
---

## Como Rodar o projeto:

### 1. Clone o repositório

```bash
git clone https://github.com/Leo981-web/jogo-memoriaG2.git
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o servidor

```bash
npm run dev
```

### 4. Acesse o jogo

Abra o navegador em:

```
http://localhost:3000
```


> Para jogar no modo multiplayer, use dois navegadores ou dispositivos diferentes e entre na **mesma sala** a partir de seu ID.

---

## Como Jogar:

1. Informe um **apelido** e um **nome de sala** e clique em **Entrar**;
2. Aguarde o segundo jogador entrar na mesma sala;
3. O jogo começa automaticamente quando os dois estiverem conectados;
4. Os jogadores se alternam virando cartas e **quem acertar um par pode jogar novamente**;
5. Ao fim da partida aparece o vencedor e depois, é possível **reiniciar** ou **sair**.

---

## Cartas do Jogo:

O tabuleiro é composto por **6 pares** de cartas, cada uma representando uma linguagem de programação:

| Carta | Ícone |
|---|---|
| JavaScript | `fa-brands fa-js` |
| Python | `fa-brands fa-python` |
| Java | `fa-brands fa-java` |
| C++ | `fa-solid fa-code` |
| C# | `fa-solid fa-hashtag` |
| HTML | `fa-brands fa-html5` |

---

## Arquitetura WebSocket — Mensagens:

### Cliente → Servidor

| Tipo | Descrição |
|---|---|
| `JOIN_ROOM` | Entra em uma sala com nickname e room |
| `CHOOSE_CARD` | Envia o índice da carta escolhida |
| `CHAT_MESSAGE` | Envia uma mensagem no chat |
| `RESTART` | Solicita reinício da partida |

### Servidor → Cliente:

| Tipo | Descrição |
|---|---|
| `ROOM_JOINED` | Confirma entrada na sala |
| `GAME_STATE` | Envia estado atual do tabuleiro, placar e turno |
| `FIM_DE_JOGO` | Informa o vencedor ou empate |
| `CHAT_MESSAGE` | Distribui mensagem do chat para a sala |
| `ERROR` | Notifica erros (ex: sala cheia) |

---