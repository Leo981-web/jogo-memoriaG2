// Importamos a classe Card que criamos antes para usá-la aqui dentro
import { Card } from './card.js';

export class Board {
  constructor(values) {
    this.cards = [];
    this.generateBoard(values);
  }

  generateBoard(values) {
    let idCounter = 1;
    
    // Para cada valor recebido (ex: ['A', 'B']), nós rodamos duas vezes
    // para criar o par de cartas idênticas no jogo da memória
    values.forEach(value => {
      // Primeira carta do par
      this.cards.push(new Card(idCounter++, value));
      // Segunda carta do par
      this.cards.push(new Card(idCounter++, value));
    });
  }

  // --- NOVO MÉTODO ABAIXO ---
  shuffle() {
    // Algoritmo de Fisher-Yates para embaralhar o array de cartas
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Inverte os elementos de posição
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}
