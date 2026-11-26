import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'
import {
  BOT_PERSONAS,
  getBotPersona,
  getPersonaLiveReaction
} from '~/utils/botPersonas'
import {
  computeBotMove,
  evaluateBoard
} from '~/utils/chessBotEngine'

test('BOT_PERSONAS defines default plus 4 distinct sparring personas without em dashes', () => {
  const ids = BOT_PERSONAS.map((p) => p.id)
  assert.deepEqual(ids, ['default', 'gambiteer', 'positional', 'trickster', 'fortress'])
  for (const p of BOT_PERSONAS) {
    assert.ok(!p.nameId.includes('—'))
    assert.ok(!p.taglineId.includes('—'))
    assert.ok(!p.descriptionId.includes('—'))
  }
})

test('evaluateBoard shifts evaluation according to gambiteer vs fortress persona priorities', () => {
  // White has sacrificed a pawn to swarm Black's uncastled king on e8 with Queen + Bishop + Knight,
  // while leaving White's b2 and g2 loose.
  const attackingFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/3P1Q2/PPP2PPP/RNB1K2R w KQkq - 4 6'
  const game = new Chess(attackingFen)

  const gambiteerEval = evaluateBoard(game, 0.8, true, 'gambiteer')
  const fortressEval = evaluateBoard(game, 0.3, true, 'fortress')

  assert.notEqual(
    gambiteerEval,
    fortressEval,
    'Gambiteer and Fortress should evaluate aggressive attacking positions differently'
  )
  assert.ok(
    gambiteerEval > fortressEval,
    `Expected Gambiteer (${gambiteerEval}) to value king-swarm initiative higher than Fortress (${fortressEval})`
  )
})

test('computeBotMove with persona avoids absurd random Queen giveaway when safer moves exist', () => {
  // Black to move: Black Queen on d5 is attacked by White Knight on c3.
  // Even for an 800-1050 ELO bot with persona active, it should not randomly blunder into mate or leave Queen en prise 100% blindly.
  const fen = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 2'
  const res = computeBotMove(
    fen,
    { elo: 1150 },
    ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
    'fortress'
  )

  assert.ok(res.move !== null)
  assert.equal(
    res.move.from,
    'd5',
    `Expected Fortress bot to rescue attacked Queen from d5, got ${res.move.san}`
  )
})

test('getPersonaLiveReaction returns contextual Indonesian sparring dialogue without em dashes', () => {
  const persona = getBotPersona('gambiteer')
  assert.equal(persona.id, 'gambiteer')

  const startLine = getPersonaLiveReaction('gambiteer', 'match_start')
  const checkLine = getPersonaLiveReaction('trickster', 'check_delivered')
  assert.ok(startLine.length > 8 && !startLine.includes('—'))
  assert.ok(checkLine.length > 8 && !checkLine.includes('—'))
})

test('different personas choose genuinely distinct openings from move 1', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const gambiteerMove = computeBotMove(startFen, { elo: 1050 }, [], 'gambiteer')
  const fortressMove = computeBotMove(startFen, { elo: 1050 }, [], 'fortress')
  assert.equal(gambiteerMove.move?.san, 'e4')
  assert.ok(
    fortressMove.move?.san === 'd4' || fortressMove.move?.san === 'Nf3',
    `Expected Fortress to open with d4 or Nf3, got ${fortressMove.move?.san}`
  )
})
