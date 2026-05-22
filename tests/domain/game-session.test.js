const { GameSession } = require('../../src/domain/game-session');

describe('Domain: GameSession (Regras do Jogo)', () => {

  test('Deve iniciar o jogo com o tabuleiro embaralhado e pontuação zerada', () => {
    const players = ['Jogador 1', 'Jogador 2'];
    const cardValues = ['A', 'B', 'C'];
    const game = new GameSession(players, cardValues);

    expect(game.currentPlayer).toBe('Jogador 1');
    expect(game.scores['Jogador 1']).toBe(0);
    expect(game.scores['Jogador 2']).toBe(0);
    expect(game.board.cards.length).toBe(6);
  });

  // --- NOVOS TESTES ABAIXO ---

  test('Deve pontuar e manter cartas viradas se o jogador encontrar um par', () => {
    const game = new GameSession(['Jogador 1', 'Jogador 2'], ['A', 'B']);
    
    // Para testar de forma previsível, vamos buscar duas cartas com o mesmo valor "A"
    const cartasComA = game.board.cards.filter(card => card.value === 'A');
    
    // Jogador 1 escolhe as duas cartas com valor "A"
    game.chooseCard(cartasComA[0].id);
    game.chooseCard(cartasComA[1].id);

    // O Jogador 1 deve ter ganho 1 ponto
    expect(game.scores['Jogador 1']).toBe(1);
    // As duas cartas devem continuar viradas para cima
    expect(cartasComA[0].isFlipped).toBe(true);
    expect(cartasComA[1].isFlipped).toBe(true);
    // O turno continua sendo do Jogador 1 (já que ele acertou)
    expect(game.currentPlayer).toBe('Jogador 1');
  });

  test('Deve passar a vez e desvirar as cartas se o jogador errar o par', () => {
    const game = new GameSession(['Jogador 1', 'Jogador 2'], ['A', 'B']);
    
    // Vamos pegar uma carta "A" e uma carta "B" (um erro proposital)
    const cartaA = game.board.cards.find(card => card.value === 'A');
    const cartaB = game.board.cards.find(card => card.value === 'B');

    // Jogador 1 escolhe a carta A e depois a B
    game.chooseCard(cartaA.id);
    game.chooseCard(cartaB.id);

    // O Jogador 1 NÃO deve ganhar ponto
    expect(game.scores['Jogador 1']).toBe(0);
    // A vez deve ter passado para o Jogador 2
    expect(game.currentPlayer).toBe('Jogador 2');
    
    // NOTA: No jogo real, as cartas esperam um tempinho antes de desvirar na tela,
    // mas no nosso domínio (regra pura), o estado delas volta a ser false.
    expect(cartaA.isFlipped).toBe(false);
    expect(cartaB.isFlipped).toBe(false);
  });

});