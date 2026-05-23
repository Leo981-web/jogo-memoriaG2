import { Board } from "./board.js";

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

  // 1. Recebemos o ID e a função de atualizar a tela
  chooseCard(index, onStateChange) {
    // Convertemos o ID de texto para número para achar a carta certa
    const numericIndex = Number(index);
    const card = this.board.cards[numericIndex];

    // Segurança: se a carta não existir, já estiver virada ou já tiver par, ignora
    if (!card || card.isFlipped || card.isMatched) return;

    // Impede de virar mais de 2 cartas ao mesmo tempo
    if (this.selectedCards.length >= 2) return;

    card.flip();
    this.selectedCards.push(card);

    if (this.selectedCards.length === 2) {
      // Repassamos a função adiante para rodar após o delay
      this.checkMatch(onStateChange);
    }
  }

  checkMatch(onStateChange) {
    const [card1, card2] = this.selectedCards;

    // Se os valores das duas cartas forem iguais, temos um PAR!
    if (card1.value === card2.value) {
      this.scores[this.currentPlayer]++;
      card1.isMatched = true;
      card2.isMatched = true;
      this.selectedCards = []; // Limpa a seleção para a próxima rodada
    } else {
      
      // Delay de 1 segundo (1000ms)
      setTimeout(() => {
        card1.unflip(); // Vira a primeira carta para baixo
        card2.unflip(); // Vira a segunda carta para baixo
        this.switchPlayer(); // Passa a vez para o próximo jogador
        this.selectedCards = []; // Limpa a seleção
        
        // Atualiza a interface após desvirar as cartas
        if (onStateChange) onStateChange(); 
      }, 1000); 
    }
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