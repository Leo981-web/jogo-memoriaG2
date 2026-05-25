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

            cardElement.className = `
                memory-card
                ${card.isFlipped ? 'flipped' : ''}
                ${card.isMatched ? 'matched' : ''}
            `;

            cardElement.innerHTML = `
                <div class="card-face card-front"></div>

                <div class="card-face card-back">
                    <div class="card-icon">
                        <i class="${this.obterIcone(card.value)}"></i>
                    </div>
                </div>
            `;

            if (!card.isFlipped && !card.isMatched) {
                cardElement.onclick = () => onCardClick(index);
            }

            this.elements.board.appendChild(cardElement);
        });
    },

    obterIcone(valor) {
        const icones = {
            javascript: 'fa-brands fa-js',
            python: 'fa-brands fa-python',
            java: 'fa-brands fa-java',
            cpp: 'fa-solid fa-code',
            csharp: 'fa-solid fa-hashtag',
            html: 'fa-brands fa-html5'
        };

        return icones[valor] || 'fa-solid fa-code';
    },

    atualizarStatus(texto) {
        if (this.elements.status) {
            this.elements.status.textContent = texto;
        }
    },

    exibirMensagem({ remetente, texto, hora }) {
        const li = document.createElement('li');

        li.innerHTML = `
            <span class="remetente">${remetente}</span>
            <span class="hora">${hora}</span>
            <p>${texto}</p>
        `;

        this.elements.chatMessages.appendChild(li);

        this.elements.chatMessages.scrollTop =
            this.elements.chatMessages.scrollHeight;
    },

    atualizarPlacar(scores) {
        this.elements.placar.innerHTML = Object.entries(scores)
            .map(([jogador, pontos]) =>
                `<span>${jogador}: ${pontos}</span>`
            )
            .join(' | ');
    },
};