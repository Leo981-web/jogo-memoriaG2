const { Card } = require('../../src/domain/card');

describe('Domain: Card (Entidade de Carta)', () => {
  
  test('Deve criar uma nova carta virada para baixo por padrão', () => {
    const card = new Card(1, 'A');
    expect(card.id).toBe(1);
    expect(card.value).toBe('A');
    expect(card.isFlipped).toBe(false);
    expect(card.isMatched).toBe(false);
  });

  test('Deve virar a carta para cima', () => {
    const card = new Card(1, 'A');
    card.flip(); // Método que vamos criar
    expect(card.isFlipped).toBe(true);
  });

  test('Deve virar a carta para baixo', () => {
    const card = new Card(1, 'A');
    card.flip(); // Vira para cima primeiro
    card.unflip(); // Método que vamos criar para voltar para baixo
    expect(card.isFlipped).toBe(false);
  });

});