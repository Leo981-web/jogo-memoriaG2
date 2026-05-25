import { UI } from './uiController.js';

const onlineCount = document.getElementById('online-count');
const roomName = document.getElementById('room-name');

let socket = null;
let meuNome = "";


/* =========================
   ENTRAR NA SALA
========================= */

UI.elements.btnJoin.addEventListener('click', () => {
    const nickname = UI.elements.inputNickname.value.trim();
    const room = UI.elements.inputRoom.value.trim();

    if (!nickname || !room) {
        alert("Preencha o apelido e a sala!");
        return;
    }

    meuNome = nickname;
    conectar(nickname, room);
});


/* =========================
   CONECTAR WEBSOCKET
========================= */

function conectar(nickname, room) {
    const protocolo =
        window.location.protocol === 'https:'
            ? 'wss://'
            : 'ws://';

    const endereco = window.location.host;

    socket = new WebSocket(protocolo + endereco);

    socket.onopen = () => {
        console.log("Conectado ao servidor!");

        socket.send(JSON.stringify({
            type: "JOIN_ROOM",
            payload: {
                nickname,
                room
            }
        }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log("Recebido:", data);

        switch (data.type) {

            case "ROOM_JOINED":
                UI.alternarTelas(true);
                UI.atualizarStatus("Aguardando início do jogo...");

                // atualiza nome da sala
                roomName.textContent = `Sala: ${room}`;
                break;


            case "GAME_STATE":
                UI.renderizarTabuleiro(
                    data.board,
                    (cardId) => {
                        socket.send(JSON.stringify({
                            type: "CHOOSE_CARD",
                            cardId
                        }));
                    }
                );

                UI.atualizarStatus(data.status);
                UI.atualizarPlacar(data.scores);

                // atualiza quantidade online
                const totalJogadores = Object.keys(data.scores).length;
                onlineCount.textContent = `Online: ${totalJogadores}`;
                break;


            case "CHAT_MESSAGE":
                UI.exibirMensagem(data.payload);
                break;


            case "ERROR":
                alert(data.payload.message);
                UI.alternarTelas(false);
                break;
        }
    };

    socket.onerror = () => {
        console.error(
            "Erro no WebSocket. Verifique se o servidor está rodando."
        );
    };

    socket.onclose = () => {
        console.log("Conexão encerrada.");
    };
}


/* =========================
   CHAT
========================= */

document
    .getElementById('btn-enviar')
    .addEventListener('click', enviarMensagem);

document
    .getElementById('chat-texto')
    .addEventListener('keypress', (e) => {
        if (e.key === "Enter") {
            enviarMensagem();
        }
    });

function enviarMensagem() {
    const input = document.getElementById('chat-texto');
    const texto = input.value.trim();

    if (!texto || !socket) return;

    socket.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        payload: {
            texto
        }
    }));

    input.value = '';
}
