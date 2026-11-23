require('./test-helpers');
const { LudoGame, FINISH, SAFE } = require('../src');

/** Cria um rng que devolve a sequência de dados desejada. */
const dice = (...values) => { let i = 0; return () => (values[i++] - 1) / 6 + 0.01; };

describe('Estado inicial', () => {
  test('CT01 - 2 jogadores com 4 peças na base cada', () => {
    const g = new LudoGame();
    expect(g.positions).toEqual([[-1, -1, -1, -1], [-1, -1, -1, -1]]);
    expect(g.turn).toBe(0);
    expect(g.status).toBe('playing');
  });
  test('CT02 - dado só gera valores de 1 a 6', () => {
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const g = new LudoGame({ positions: [[0, 0, 0, 0], [-1, -1, -1, -1]] });
      seen.add(g.roll().value);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('Saída da base', () => {
  test('CT03 - sem 6 todas as peças ficam na base e a vez passa', () => {
    const g = new LudoGame({ rng: dice(3) });
    const r = g.roll();
    expect(r.moves).toEqual([]);
    expect(g.turn).toBe(1);
    expect(g.positions[0]).toEqual([-1, -1, -1, -1]);
  });
  test('CT04 - com 6 qualquer peça da base pode sair', () => {
    const g = new LudoGame({ rng: dice(6) });
    expect(g.roll().moves).toEqual([0, 1, 2, 3]);
  });
  test('CT05 - peça sai para a casa inicial e jogador joga de novo', () => {
    const g = new LudoGame({ rng: dice(6) });
    g.roll();
    const r = g.move(2);
    expect(g.positions[0][2]).toBe(0);
    expect(r.extraTurn).toBe(true);
    expect(g.turn).toBe(0);
  });
  test('CT06 - peça na base não anda com dado diferente de 6', () => {
    const g = new LudoGame({ positions: [[-1, 5, -1, -1], [-1, -1, -1, -1]], rng: dice(3) });
    expect(g.roll().moves).toEqual([1]);
    expect(() => g.move(0)).toThrow('inválido');
  });
});

describe('Movimento e turnos', () => {
  test('CT07 - peça avança o valor do dado e a vez passa', () => {
    const g = new LudoGame({ positions: [[10, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(4) });
    g.roll();
    const r = g.move(0);
    expect(g.positions[0][0]).toBe(14);
    expect(r.extraTurn).toBe(false);
    expect(g.turn).toBe(1);
  });
  test('CT08 - mover sem rolar o dado lança erro', () => {
    expect(() => new LudoGame().move(0)).toThrow('Role');
  });
  test('CT09 - não pode rolar duas vezes sem mover', () => {
    const g = new LudoGame({ positions: [[10, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(2, 2) });
    g.roll();
    expect(() => g.roll()).toThrow('Mova');
  });
  test('CT10 - tirar 6 dá jogada extra mesmo andando na pista', () => {
    const g = new LudoGame({ positions: [[10, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(6) });
    g.roll();
    g.move(0);
    expect(g.turn).toBe(0);
  });
  test('CT11 - jogador 2 sai da casa absoluta 26', () => {
    const g = new LudoGame({ turn: 1 });
    expect(g.absolute(1, 0)).toBe(26);
    expect(g.absolute(1, 30)).toBe(4); // dá a volta no tabuleiro
    expect(g.absolute(0, 51)).toBeNull(); // reta final não é compartilhada
  });
});

describe('Captura', () => {
  test('CT12 - cair em peça adversária a envia para a base e dá jogada extra', () => {
    // vermelho rel 2 -> abs 2..5; amarelo rel 31 -> abs 57%52 = 5 (casa comum)
    const g = new LudoGame({ positions: [[2, -1, -1, -1], [31, -1, -1, -1]], rng: dice(3) });
    g.roll();
    const r = g.move(0);
    expect(r.captured).toBe(1);
    expect(g.positions[1][0]).toBe(-1);
    expect(g.turn).toBe(0);
  });
  test('CT13 - casa segura protege a peça adversária', () => {
    // vermelho vai para abs 8 (segura); amarelo rel 34 -> abs 8
    expect(SAFE).toContain(8);
    const g = new LudoGame({ positions: [[5, -1, -1, -1], [34, -1, -1, -1]], rng: dice(3) });
    g.roll();
    const r = g.move(0);
    expect(r.captured).toBe(0);
    expect(g.positions[1][0]).toBe(34);
  });
  test('CT14 - peça própria na mesma casa não é capturada', () => {
    const g = new LudoGame({ positions: [[2, 5, -1, -1], [-1, -1, -1, -1]], rng: dice(3) });
    g.roll();
    expect(g.move(0).captured).toBe(0);
    expect(g.positions[0][1]).toBe(5);
  });
  test('CT15 - peça na reta final não pode ser capturada', () => {
    const g = new LudoGame({ positions: [[48, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(4) });
    g.roll();
    g.move(0); // 52 = reta final
    expect(g.positions[0][0]).toBe(52);
    expect(g.absolute(0, 52)).toBeNull();
  });
});

describe('Chegada e vitória', () => {
  test('CT16 - não pode ultrapassar a chegada (precisa do valor exato)', () => {
    const g = new LudoGame({ positions: [[55, 56, 56, 56], [-1, -1, -1, -1]], rng: dice(2, 1) });
    expect(g.roll().moves).toEqual([]); // 55 + 2 > 56
    expect(g.turn).toBe(1);
  });
  test('CT17 - valor exato chega ao final e dá jogada extra', () => {
    const g = new LudoGame({ positions: [[55, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(1) });
    g.roll();
    const r = g.move(0);
    expect(g.positions[0][0]).toBe(FINISH);
    expect(r.extraTurn).toBe(true);
  });
  test('CT18 - vence quem leva as 4 peças à chegada e o jogo trava', () => {
    const g = new LudoGame({ positions: [[56, 56, 56, 50], [-1, -1, -1, -1]], rng: dice(6) });
    g.roll();
    g.move(3);
    expect(g.status).toBe('finished');
    expect(g.winner).toBe(0);
    expect(() => g.roll()).toThrow('terminou');
    expect(() => g.move(0)).toThrow('terminou');
  });
  test('CT19 - peça inexistente é movimento inválido', () => {
    const g = new LudoGame({ positions: [[10, -1, -1, -1], [-1, -1, -1, -1]], rng: dice(2) });
    g.roll();
    expect(() => g.move(7)).toThrow('inválido');
  });
});


describe('Validações adicionais de entrada', () => {
  test('CT20 - rejeita posições, turno e gerador inválidos', () => {
    expect(() => new LudoGame({ turn: 2 })).toThrow(RangeError);
    expect(() => new LudoGame({ rng: 2 })).toThrow(TypeError);
    expect(() => new LudoGame({ positions: [[-2, -1, -1, -1], [-1, -1, -1, -1]] })).toThrow(TypeError);
    expect(() => new LudoGame({ positions: [[-1], [-1]] })).toThrow(TypeError);
    expect(() => new LudoGame({ rng: () => 1 }).roll()).toThrow(RangeError);
  });
  test('CT21 - valida jogador e valor do dado nas consultas', () => {
    const g = new LudoGame();
    expect(() => g.absolute(2, 0)).toThrow(RangeError);
    expect(() => g.legalMoves(0, 7)).toThrow(RangeError);
    expect(() => g.legalMoves(2, 6)).toThrow(RangeError);
  });
});
