const { Board } = require('../../src/domain/board');

describe('Domain: Board (Entidade do Tabuleiro)', () => {

  test('Deve criar um tabuleiro com o número correto de cartas duplicadas', () => {
    const values = ['A', 'B', 'C', 'D'];
    const board = new Board(values);
    expect(board.cards.length).toBe(8);
  });

  test('Deve embaralhar as cartas do tabuleiro', () => {
    const values = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // Mais cartas para garantir o teste
    const board = new Board(values);

    // Tiramos uma "foto" da ordem original dos IDs das cartas
    const ordemOriginal = board.cards.map(card => card.id);

    // Chamamos o método que vamos criar
    board.shuffle();

    // Tiramos uma "foto" da nova ordem dos IDs
    const ordemEmbaralhada = board.cards.map(card => card.id);

    // O teste passa se a ordem embaralhada for DIFERENTE da ordem original
    expect(ordemEmbaralhada).not.toEqual(ordemOriginal);
  });

});