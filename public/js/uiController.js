export const UI = {
    elements: {
        loginScreen: document.getElementById('login-screen'),
        gameScreen: document.getElementById('game-screen'),
        btnJoin: document.getElementById('btn-join'),
        inputNickname: document.getElementById('nickname'),
        inputRoom: document.getElementById('room-id'),
        board: document.getElementById('board'),
        status: document.getElementById('status'),
        chatMessages: document.getElementById('chat-messages'),
        chatTexto: document.getElementById('chat-texto'),
        placar: document.getElementById('placar'),
    },

    alternarTelas(emJogo) {
        if (emJogo) {
            this.elements.loginScreen.classList.add('hidden');
            this.elements.gameScreen.classList.remove('hidden');
        } else {
            this.elements.loginScreen.classList.remove('hidden');
            this.elements.gameScreen.classList.add('hidden');
        }
    },

    renderizarTabuleiro(cards, onCardClick) {
        this.elements.board.innerHTML = '';
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            // Aplica classes de estado baseadas no domínio
            cardElement.className = `card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`;

            // Mostra o valor apenas se a carta estiver aberta
            cardElement.textContent = (card.isFlipped || card.isMatched) ? card.value : '?';

            if (!card.isFlipped && !card.isMatched) {
                cardElement.onclick = () => onCardClick(index);
            }
            this.elements.board.appendChild(cardElement);
        });
    },

    atualizarStatus(texto) {
        if (this.elements.status) this.elements.status.textContent = texto;
    },

    exibirMensagem({ remetente, texto, hora }) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="remetente">${remetente}</span>
                    <span class="hora">${hora}</span>
                    <p>${texto}</p>`;

        this.elements.chatMessages.appendChild(li);

        // Rola automaticamente para a mensagem mais recente:
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    },

    atualizarPlacar(scores) {
    this.elements.placar.innerHTML = Object.entries(scores)
        .map(([jogador, pontos]) => `<span>${jogador}: ${pontos}</span>`)
        .join(' | ');
    },
};