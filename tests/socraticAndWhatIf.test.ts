import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnalyzedMove } from '~/utils/gameReviewEngine'
import {
  generateLiveCoPilotBrief,
  generateSocraticReview
} from '~/utils/socraticCoachEngine'
import {
  applyOpponentReplyInWhatIf,
  createWhatIfSession,
  rewindWhatIfPly,
  stepWhatIfMove
} from '~/utils/whatIfSimulator'

function makeMockBlunderMove(): AnalyzedMove {
  // Position after 1. e4 Nf6, White plays 2. Qh5?? (leaving Queen attacked by Nxh5) instead of 2. e5 or 2. Nc3
  return {
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
}

test('generateSocraticReview produces Socratic question, causal Indonesian explanation, and candidate moves without em dashes', () => {
  const blunderMove = makeMockBlunderMove()
  const apprenticeInsight = generateSocraticReview(blunderMove, 'apprentice')
  const masterInsight = generateSocraticReview(blunderMove, 'master')

  assert.ok(apprenticeInsight.socraticQuestion.endsWith('?'))
  assert.ok(!apprenticeInsight.socraticQuestion.includes('—'))
  assert.ok(!apprenticeInsight.humanExplanation.includes('—'))
  assert.ok(!apprenticeInsight.bestPlanNarrative.includes('—'))
  assert.ok(
    apprenticeInsight.humanExplanation.includes('Menteri') ||
      apprenticeInsight.humanExplanation.includes('h5'),
    'Explanation should mention the concrete piece or square involved'
  )
  assert.ok(apprenticeInsight.suggestedCandidates.includes('Nc3'))
  assert.notEqual(
    apprenticeInsight.lensNote,
    masterInsight.lensNote,
    'Apprentice and Master lens notes should adapt to the chosen preset'
  )
})

test('generateLiveCoPilotBrief adapts output across apprentice, club, and master presets', () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
  const appBrief = generateLiveCoPilotBrief(fen, 'Nc6', 'w', 'apprentice')
  const masterBrief = generateLiveCoPilotBrief(fen, 'Nc6', 'w', 'master')

  assert.equal(appBrief.visibleOnStage, true)
  assert.ok(appBrief.promptText.length > 10 && !appBrief.promptText.includes('—'))
  assert.equal(masterBrief.visibleOnStage, false)
})

test('whatIfSimulator evaluates alternative candidate move vs blunder move and reveals opponent refutation', () => {
  const beforeFen = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2'
  const session = createWhatIfSession(beforeFen, 'Langkah 2 Putih', 'Qh5')

  // Test sound alternative Nc3
  const goodOutcome = stepWhatIfMove(session, 'Nc3')
  assert.equal(goodOutcome.valid, true)
  assert.ok(
    goodOutcome.verdictTone === 'strong' || goodOutcome.verdictTone === 'playable',
    `Expected Nc3 to be strong or playable, got ${goodOutcome.verdictTone}`
  )
  assert.ok(!goodOutcome.coachSummaryId.includes('—'))
  assert.equal(goodOutcome.nextSession.branchMoves.length, 1)

  // Test blunder Qh5 in What-If sandbox
  const badOutcome = stepWhatIfMove(session, { from: 'd1', to: 'h5' })
  assert.equal(badOutcome.valid, true)
  assert.equal(badOutcome.verdictTone, 'refuted')
  assert.equal(badOutcome.opponentReplySan, 'Nxh5')
  assert.ok(badOutcome.refutationArrow !== null)
  assert.equal(badOutcome.refutationArrow?.from, 'f6')
  assert.equal(badOutcome.refutationArrow?.to, 'h5')

  // Advance opponent reply onto the sandbox board, then rewind back cleanly to White's turn!
  const afterReply = applyOpponentReplyInWhatIf(badOutcome.nextSession)
  assert.equal(afterReply.branchMoves.length, 2)
  assert.equal(afterReply.branchMoves[1]?.san, 'Nxh5')

  // Attempting to play a move during opponent's turn must be blocked cleanly
  const illegalDuringOpponentTurn = stepWhatIfMove(badOutcome.nextSession, 'Nxh5')
  assert.equal(illegalDuringOpponentTurn.valid, false)

  // Rewinding after opponent reply must return cleanly to White's turn (0 plies -> originFen), NEVER Black's turn!
  const rewound = rewindWhatIfPly(afterReply)
  assert.equal(rewound.branchMoves.length, 0)
  assert.equal(rewound.currentFen, beforeFen)
})
