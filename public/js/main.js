import { UI } from './uiController.js';

let socket = null;

let meuNome = "";
const nickname = document.getElementById("nickname").value;
meuNome = nickname;

UI.elements.btnJoin.addEventListener('click', () => {
    const nickname = UI.elements.inputNickname.value.trim();
    const room = UI.elements.inputRoom.value.trim();

    if (!nickname || !room) {
        alert("Preencha o apelido e a sala!");
        return;
    }
    conectar(nickname, room);
});

function conectar(nickname, room) {
    // Porta fixa que você confirmou que funciona
    socket = new WebSocket(`ws://localhost:3000`);

    socket.onopen = () => {
        console.log("Conexão estabelecida com o servidor!");
        socket.send(JSON.stringify({
            type: "JOIN_ROOM",
            payload: { nickname, room }
        }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Dados recebidos:", data);

        switch (data.type) {
            case "ROOM_JOINED":
                UI.alternarTelas(true);
                UI.atualizarStatus("Aguardando início do jogo...");
                break;

            case "GAME_STATE":
            // Agora lemos direto de data.board, como o servidor envia
            UI.renderizarTabuleiro(data.board, (index) => {

                if (data.currentPlayer === meuNome) {
                    socket.send(JSON.stringify({
                        type: 'CHOOSE_CARD', // Mudei para CHOOSE_CARD para bater com o seu server.js
                        cardId: index + 1    // O seu domínio usa IDs começando em 1
                    }));
                } else {
                    alert("Não é sua vez!");
                }
            });
            UI.atualizarStatus(`Turno de: ${data.currentPlayer}`);
            break;

            case "ERROR":
                alert(data.payload.message);
                break;
        }
    };

    socket.onerror = (err) => {
        console.error("Erro no WebSocket. Verifique se o servidor Node está rodando.");
    };
}