import { UI } from './uiController.js';

let socket = null;

let meuNome = "";

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

function conectar(nickname, room) {
    // ─── MUDANÇA AQUI ─────────────────────────────────────────
    // Descobre dinamicamente se o site usa criptografia (https -> wss) ou comum (http -> ws)
    const protocolo = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    
    // Pega o endereço atual do navegador (ex: localhost:3000 ou xxxx.ngrok-free.app)
    const endereco = window.location.host;

    // Conecta de forma inteligente no endereço certo!
    socket = new WebSocket(protocolo + endereco);
    // ──────────────────────────────────────────────────────────────────────

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
                // Renderiza o tabuleiro com base no estado enviado pelo servidor
                UI.renderizarTabuleiro(data.board, (index) => {
                    // O clique envia a mensagem normalmente
                    socket.send(JSON.stringify({
                        type: 'CHOOSE_CARD', 
                        cardId: index   
                    }));
                });
                UI.atualizarStatus(`Turno de: ${data.currentPlayer}`);
                break;

            case "ERROR":
                alert(data.payload.message);
                break;
        }
    };

    socket.onerror = (err) => {
        console.error("Erro no WebSocket. Verifique se o servidor Node está rodando ou se o túnel Ngrok caiu.");
    };
}