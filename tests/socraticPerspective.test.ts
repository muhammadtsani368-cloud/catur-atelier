import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnalyzedMove } from '~/utils/gameReviewEngine'
import { generateSocraticReview, suggestCandidatesForFen } from '~/utils/socraticCoachEngine'

function makeOpponentBlunder(): AnalyzedMove {
  // Opponent (Black) played a blunder in this sample position context
  return {
    ply: 4,
    moveNumber: 2,
    color: 'b',
    san: 'Nxe4',
    from: 'f6',
    to: 'e4',
    beforeFen: 'rnbqkb1r/pppppppp/5n2/7Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 2 2',
    afterFen: 'rnbqkb1r/pppppppp/8/7Q/4n3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3',
    evalBefore: -0.2,
    evalAfter: 4.5,
    bestMoveSan: 'g6',
    bestMoveFrom: 'g7',
    bestMoveTo: 'g6',
    cpLoss: 470,
    winPctLoss: 35,
    classification: 'blunder',
    isCapture: true,
    isCheck: false,
    isMate: false,
    phase: 'opening',
    commentId: 'Blunder.'
  }
}

test('generateSocraticReview reframes opponent moves from the human perspective', () => {
  const move = makeOpponentBlunder()
  const insight = generateSocraticReview(move, 'apprentice', 'w')

  assert.ok(insight.socraticQuestion.length > 10)
  assert.match(insight.humanExplanation, /Hitam memainkan Nxe4/)
  assert.match(insight.lensNote, /sudut pandangmu|langkah lawan/i)
  // Should guide the human to respond, not coach the opponent as "you"
  assert.match(insight.socraticQuestion, /kamu|respons|antisipasi|memanfaatkan/i)
})

test('generateSocraticReview keeps coaching tone for the human player move', () => {
  const move: AnalyzedMove = {
    ply: 3,
    moveNumber: 2,
    color: 'w',
    san: 'Qh5',
    from: 'd1',
    to: 'h5',
    beforeFen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
    afterFen: 'rnbqkb1r/pppppppp/5n2/7Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 2 2',
    evalBefore: 0.3,
    evalAfter: -8.2,
    bestMoveSan: 'Nc3',
    bestMoveFrom: 'b1',
    bestMoveTo: 'c3',
    cpLoss: 850,
    winPctLoss: 78,
    classification: 'blunder',
    isCapture: false,
    isCheck: false,
    isMate: false,
    phase: 'opening',
    commentId: 'Blunder.'
  }

  const insight = generateSocraticReview(move, 'apprentice', 'w')
  assert.ok(!/langkah lawan/i.test(insight.lensNote))
  assert.ok(insight.socraticQuestion.endsWith('?'))
})

test('suggestCandidatesForFen returns best-first candidates within limit and no duplicates', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const candidates = suggestCandidatesForFen(fen, 4)

  assert.ok(candidates.length >= 1)
  assert.ok(candidates.length <= 4)
  assert.equal(new Set(candidates).size, candidates.length)
  // Should suggest legal SAN moves
  for (const san of candidates) {
    assert.match(san, /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/)
  }
})

test('suggestCandidatesForFen returns empty array for invalid FEN', () => {
  assert.deepEqual(suggestCandidatesForFen('not-a-fen'), [])
})

test('generateSocraticReview on opponent checkmate suggests rewinding and never recommends opponent moves', () => {
  // Black just delivered checkmate Qh4# against White's Fool's Mate
  const mateMove: AnalyzedMove = {
    ply: 4,
    moveNumber: 2,
    color: 'b',
    san: 'Qh4#',
    from: 'd8',
    to: 'h4',
    beforeFen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    afterFen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    evalBefore: -10,
    evalAfter: -10,
    bestMoveSan: 'Qh4#',
    bestMoveFrom: 'd8',
    bestMoveTo: 'h4',
    cpLoss: 0,
    winPctLoss: 0,
    classification: 'best',
    isCapture: false,
    isCheck: true,
    isMate: true,
    phase: 'opening',
    commentId: 'Skakmat.'
  }

  const insight = generateSocraticReview(mateMove, 'apprentice', 'w')
  assert.equal(insight.suggestRewindToHumanTurn, true)
  assert.deepEqual(insight.suggestedCandidates, [])
  assert.match(insight.humanExplanation, /skakmat/i)
})

test('generateSocraticReview on opponent non-mate move suggests ONLY human legal replies on afterFen', () => {
  const move = makeOpponentBlunder()
  const insight = generateSocraticReview(move, 'apprentice', 'w')
  assert.equal(insight.whatIfStartsOnAfterFen, true)
  assert.ok(insight.suggestedCandidates.length >= 4)
  // On afterFen it is White's turn: g6 (Black's move on beforeFen) must NEVER be suggested!
  assert.ok(!insight.suggestedCandidates.includes('g6'))
})