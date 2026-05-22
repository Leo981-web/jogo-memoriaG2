const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnJoin = document.getElementById('btn-join');
const inputNickname = document.getElementById('nickname');
const inputRoom = document.getElementById('room-id');
const boardElement = document.getElementById('board');

let socket = null;

btnJoin.addEventListener('click', () => {
    const nickname = inputNickname.value.trim();
    const room = inputRoom.value.trim();

    if (!nickname || !room) {
        alert("Preenche o teu apelido e o ID da sala!");
        return;
    }

    connectToServer(nickname, room);
});

function connectToServer(nickname, room) {
    socket = new WebSocket(`ws://${window.location.host}`)

    socket.onopen = () => {
        console.log("Conectado ao Servidor!")
        
        const joinMessage = {
            type: "JOIN_ROOM",
            payload: {nickname, room}
        };
        socket.send(JSON,stringify(joinMessage))
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    socket.onerror = (error) => {
        console.error("Erro na conexão:", error);
    };
}

function handleServerMessage(data) {
    console.log("Mensagem recebida", data);

    switch (data.type) {
        case "ROOM_JOINED":
            loginScreen.classList.add("hiden");
            gameScreen.classList.remove("hidden");
            break;

        case "GAME_UPDATE":
            renderBoard(data.payload.board.cards);
            break;

        case "ERROR":
            alert(data.payload.message);
            break;
    }
}

function renderBoard(cards) {
    boardElement.innerHTML = "";

    cards.forEach((card, index) => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");

        if (card.isFlipped) cardElement.classList.add('flipped');
        if (card.isMatched) cardElement.classList.add('matched');

        cardElement.textContent = (card.isFlipped || card.isMatched) ? card.value : '?';
    
        cardElement.addEventListener('click', () => {
            if (!card.isFlipped && !card.isMatched) {
                sendFlipAction(index);
            }
        });

        boardElement.appendChild(cardElement);
    });
}

function sendFlipAction(index) {
    const message = {
        type: 'FLIP_CARD',
        payload: { cardIndex: index }
    };
    socket.send(JSON.stringify(message));
}