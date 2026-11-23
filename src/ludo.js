const TRACK = 52;           // casas do percurso comum
const FINISH = 56;          // posição relativa final (0..50 pista, 51..55 reta final, 56 chegada)
const LAST_TRACK = 50;
const START = [0, 26];      // casa de saída absoluta de cada jogador (2 jogadores, lados opostos)
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const BASE = -1;

class LudoGame {
  /**
   * rng: [0,1) injetável. positions: [[4 peças],[4 peças]] para montar cenários de teste.
   * Posições relativas: -1 = base, 0..50 = pista, 51..55 = reta final, 56 = chegada.
   */
  constructor({ rng = Math.random, positions, turn = 0 } = {}) {
    if (typeof rng !== 'function') throw new TypeError('rng deve ser uma função');
    if (turn !== 0 && turn !== 1) throw new RangeError('Jogador da vez inválido');
    const initial = positions === undefined ? [[-1, -1, -1, -1], [-1, -1, -1, -1]] : positions;
    if (!Array.isArray(initial) || initial.length !== 2 || initial.some((p) => !Array.isArray(p) || p.length !== 4 || p.some((v) => !Number.isInteger(v) || v < BASE || v > FINISH))) throw new TypeError('positions deve conter duas listas de quatro posições válidas');
    this.rng = rng;
    this.positions = initial.map((p) => p.slice());
    this.turn = turn;
    this.dice = null;
    this.status = 'playing';
    this.winner = null;
  }

  absolute(player, rel) {
    if (player !== 0 && player !== 1) throw new RangeError('Jogador inválido');
    return rel >= 0 && rel <= LAST_TRACK ? (START[player] + rel) % TRACK : null;
  }

  legalMoves(player, value) {
    if (player !== 0 && player !== 1) throw new RangeError('Jogador inválido');
    if (!Number.isInteger(value) || value < 1 || value > 6) throw new RangeError('Dado deve estar entre 1 e 6');
    const out = [];
    this.positions[player].forEach((pos, i) => {
      if (pos === BASE) { if (value === 6) out.push(i); }
      else if (pos + value <= FINISH) out.push(i);
    });
    return out;
  }

  roll() {
    if (this.status !== 'playing') throw new Error('A partida já terminou');
    if (this.dice !== null) throw new Error('Mova uma peça antes de rolar novamente');
    const random = this.rng();
    if (typeof random !== 'number' || !Number.isFinite(random) || random < 0 || random >= 1) throw new RangeError('rng deve retornar um número entre 0 e 1');
    const value = Math.floor(random * 6) + 1;
    const moves = this.legalMoves(this.turn, value);
    if (moves.length === 0) {
      this.turn = 1 - this.turn; // sem jogada: passa a vez
      return { value, moves };
    }
    this.dice = value;
    return { value, moves };
  }

  move(piece) {
    if (this.status !== 'playing') throw new Error('A partida já terminou');
    if (this.dice === null) throw new Error('Role o dado primeiro');
    if (!this.legalMoves(this.turn, this.dice).includes(piece)) throw new Error('Movimento inválido');

    const me = this.turn;
    const foe = 1 - me;
    const value = this.dice;
    const from = this.positions[me][piece];
    const to = from === BASE ? 0 : from + value;
    this.positions[me][piece] = to;

    let captured = 0;
    const abs = this.absolute(me, to);
    if (abs !== null && !SAFE.includes(abs)) {
      this.positions[foe].forEach((fp, i) => {
        if (this.absolute(foe, fp) === abs) { this.positions[foe][i] = BASE; captured++; }
      });
    }

    this.dice = null;
    if (this.positions[me].every((p) => p === FINISH)) {
      this.status = 'finished';
      this.winner = me;
      return { from, to, captured, extraTurn: false };
    }
    const extraTurn = value === 6 || captured > 0 || to === FINISH;
    if (!extraTurn) this.turn = foe;
    return { from, to, captured, extraTurn };
  }
}

module.exports = { TRACK, FINISH, START, SAFE, BASE, LudoGame };
