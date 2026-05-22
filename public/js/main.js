import { UI } from './uiController.js';

let socket = null;

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

            case "GAME_UPDATE":
                // Renderiza o tabuleiro enviado pelo servidor
                UI.renderizarTabuleiro(data.payload.board.cards, (index) => {
                    socket.send(JSON.stringify({
                        type: 'FLIP_CARD',
                        payload: { cardIndex: index }
                    }));
                });
                UI.atualizarStatus(`Turno de: ${data.payload.currentPlayer}`);
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