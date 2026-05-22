export class Card {
  constructor(id, value) {
    this.id = id;
    this.value = value;
    this.isFlipped = false; // Começa virada para baixo
    this.isMatched = false; // Começa sem par encontrado
  }

  // --- NOVOS MÉTODOS ABAIXO ---

  flip() {
    this.isFlipped = true; // Altera o estado para virada para cima
  }

  unflip() {
    this.isFlipped = false; // Altera o estado para virada para baixo
  }
}