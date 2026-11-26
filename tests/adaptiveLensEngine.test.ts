import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADAPTIVE_LENS_PRESETS,
  analyzeBoardVision,
  computeTieredHint,
  evaluateMoveRisk
} from '~/utils/adaptiveLensEngine'

test('ADAPTIVE_LENS_PRESETS defines apprentice, club, and master presets without em dashes', () => {
  const ids = ADAPTIVE_LENS_PRESETS.map((p) => p.id)
  assert.deepEqual(ids, ['apprentice', 'club', 'master'])
  for (const preset of ADAPTIVE_LENS_PRESETS) {
    assert.ok(!preset.label.includes('—'))
    assert.ok(!preset.shortDesc.includes('—'))
  }
})

test('analyzeBoardVision detects hanging piece and threat arrows in apprentice lens', () => {
  // White Knight on e5 is undefended and attacked by Black Knight on c6
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3'
  const vision = analyzeBoardVision(fen, 'w', 'apprentice')

  assert.ok(vision.hangingSquares.includes('e5'), 'Expected e5 knight to be flagged as hanging')
  assert.ok(
    vision.threatArrows.some((a) => a.from === 'c6' && a.to === 'e5' && a.tone === 'threat'),
    'Expected threat arrow from c6 to e5'
  )
  assert.ok(vision.planSummary.headline.length > 0)
})

test('analyzeBoardVision filters out hanging pieces in club lens and clears all overlays in master lens', () => {
  // Position with central pawn tension (e4 vs d5) and undefended knight on g5 attacked by Qxg5
  const fen = 'rnbqkbnr/ppp1pppp/8/3p2N1/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 1 2'

  const clubVision = analyzeBoardVision(fen, 'w', 'club')
  assert.deepEqual(clubVision.hangingSquares, [])
  assert.deepEqual(clubVision.threatArrows, [])
  assert.ok(clubVision.tensionSquares.includes('d5') || clubVision.tensionSquares.includes('e4'))
  assert.ok(clubVision.planSummary.headline.length > 0)

  const masterVision = analyzeBoardVision(fen, 'w', 'master')
  assert.deepEqual(masterVision.hangingSquares, [])
  assert.deepEqual(masterVision.tensionSquares, [])
  assert.deepEqual(masterVision.threatArrows, [])
  assert.deepEqual(masterVision.planArrows, [])
})

test('computeTieredHint progressively reveals Socratic clue, origin square, then full move', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const tier1 = computeTieredHint(startFen, 1)
  assert.equal(tier1.hintFrom, null)
  assert.equal(tier1.hintTo, null)
  assert.ok(tier1.message.length > 10)

  const tier2 = computeTieredHint(startFen, 2)
  assert.ok(typeof tier2.hintFrom === 'string' && tier2.hintFrom.length === 2)
  assert.equal(tier2.hintTo, null)

  const tier3 = computeTieredHint(startFen, 3)
  assert.ok(typeof tier3.hintFrom === 'string' && tier3.hintFrom.length === 2)
  assert.ok(typeof tier3.hintTo === 'string' && tier3.hintTo.length === 2)
  assert.ok(tier3.bestSan.length >= 2)
})

test('evaluateMoveRisk warns on severe blunder in apprentice mode but stays silent in club/master or sound moves', () => {
  // White Queen on d1 can blunder onto g4 where Black Bishop on c8 captures it for free
  const fen = 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2'
  // Wait: let's test an unambiguous Queen blunder: White plays Qh5?? when Black Knight is on f6!
  const qBlunderFen = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2'

  const apprenticeBlunder = evaluateMoveRisk(qBlunderFen, { from: 'd1', to: 'h5' }, 'apprentice')
  assert.equal(apprenticeBlunder.shouldWarn, true)
  assert.ok(apprenticeBlunder.opponentPunishmentSan.includes('Nxh5'))

  const clubNoInterrupt = evaluateMoveRisk(qBlunderFen, { from: 'd1', to: 'h5' }, 'club')
  assert.equal(clubNoInterrupt.shouldWarn, false)

  const soundMove = evaluateMoveRisk(qBlunderFen, { from: 'b1', to: 'c3' }, 'apprentice')
  assert.equal(soundMove.shouldWarn, false)
})

test('analyzeBoardVision NEVER draws an illegal blocked pawn arrow (b5 -> b6 regression)', () => {
  // Exact endgame scenario from user screenshot: White pawn on b5 blocked by Black pawn on b6
  const blockedPawnFen = '6r1/2Bn1pp1/1p2p3/1P1p4/1b1k4/7P/8/3K4 w - - 0 40'
  const vision = analyzeBoardVision(blockedPawnFen, 'w', 'apprentice')
  const illegalArrow = vision.planArrows.find((a) => a.from === 'b5' && a.to === 'b6')
  assert.equal(illegalArrow, undefined, 'Must never suggest illegal blocked pawn push b5 -> b6')
})
