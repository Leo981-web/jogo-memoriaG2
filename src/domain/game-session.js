// Importamos o Board que criamos no passo anterior
import { Board } from "./board.js"

export class GameSession {
  constructor(players, cardValues) {
    this.players = players; // Ex: ['Jogador 1', 'Jogador 2']
    this.currentPlayer = players[0]; // O primeiro jogador começa
    this.scores = {}; // Placar
    this.selectedCards = []; // Cartas escolhidas na rodada atual
    
    players.forEach(player => {
      this.scores[player] = 0;
    });

    this.board = new Board(cardValues);
    this.board.shuffle();
  }

  // --- NOVOS MÉTODOS ABAIXO ---

  chooseCard(cardId) {
    // 1. Encontra a carta clicada dentro do tabuleiro pelo ID
    const card = this.board.cards.find(c => c.id === cardId);

    // Segurança: se a carta não existir, ou já estiver virada, ignora o clique
    if (!card || card.isFlipped) return;

    // 2. Vira a carta para cima
    card.flip();
    
    // 3. Adiciona a carta na lista de seleção da rodada atual
    this.selectedCards.push(card);

    // 4. Se o jogador virou 2 cartas, precisamos validar o par
    if (this.selectedCards.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    const [card1, card2] = this.selectedCards;

    // Se os valores das duas cartas forem iguais, temos um PAR!
    if (card1.value === card2.value) {
      // O jogador atual ganha 1 ponto
      this.scores[this.currentPlayer]++;
      // Marcamos as cartas como combinadas (par encontrado)
      card1.isMatched = true;
      card2.isMatched = true;
    } else {
      // Se errou, desvira as duas cartas
      card1.unflip();
      card2.unflip();
      // Passa a vez para o próximo jogador
      this.switchPlayer();
    }

    // Limpa a lista de seleção para a próxima rodada de cliques
    this.selectedCards = [];
  }

  switchPlayer() {
    // Encontra o índice do jogador atual na lista
    const currentIndex = this.players.indexOf(this.currentPlayer);
    // Descobre o índice do próximo (se for o último, volta para o primeiro)
    const nextIndex = (currentIndex + 1) % this.players.length;
    // Atualiza o jogador da vez
    this.currentPlayer = this.players[nextIndex];
  }
}
