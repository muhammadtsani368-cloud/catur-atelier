import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'
import { analyzeBoardVision, computeTieredHint } from '~/utils/adaptiveLensEngine'
import { BOT_CATALOG, buildCustomEngineBot } from '~/utils/botCatalog'
import { BOT_PERSONAS } from '~/utils/botPersonas'
import { computeBotMove } from '~/utils/chessBotEngine'
import { CURATED_ENDGAMES, CURATED_OPENINGS } from '~/utils/chessData'
import { computeBestEndgameMove } from '~/utils/endgameEngine'
import { analyzeCompletedMatch, type ReviewSnapshotInput } from '~/utils/gameReviewEngine'
import { PRO_TACTICS_VIDEOS } from '~/utils/proTacticsVideos'
import { PUZZLE_BANK } from '~/utils/puzzleBank'
import { generateDailyAutoPuzzle, generateUniquePuzzle, normalizeFenKey } from '~/utils/puzzleGenerator'
import {
  formatMoveCommentForLens,
  generateSocraticReview,
  suggestCandidatesForFen
} from '~/utils/socraticCoachEngine'
import {
  applyOpponentReplyInWhatIf,
  createWhatIfSession,
  rewindWhatIfPly,
  stepWhatIfMove
} from '~/utils/whatIfSimulator'

test('1. All curated openings and endgame scenarios have 100% legal chess.js sequences & FENs', () => {
  assert.ok(CURATED_OPENINGS.length >= 4, 'Expected curated openings')
  for (const op of CURATED_OPENINGS) {
    assert.ok(op.lines.length >= 1, `Opening ${op.id} should have lines`)
    for (const line of op.lines) {
      const g = new Chess()
      for (const step of line.moves) {
        const mv = g.move(step.san)
        assert.ok(mv, `Illegal opening move ${step.san} in ${op.id}/${line.id}`)
      }
    }
  }

  assert.ok(CURATED_ENDGAMES.length >= 1, 'Expected curated endgames')
  for (const eg of CURATED_ENDGAMES) {
    assert.ok(eg.scenarios.length >= 1)
    for (const sc of eg.scenarios) {
      const g = new Chess(sc.fen)
      assert.ok(!g.isGameOver(), `Endgame scenario ${sc.id} should not already be game over`)
      const reply = computeBestEndgameMove(sc.fen, 2, 80)
      assert.ok(reply.move !== null, `Endgame engine should find move for ${sc.id}`)
    }
  }
})

test('2. All Sinema Taktik videos have valid FENs, keyMoveSan, and playable demo sequences', () => {
  assert.ok(PRO_TACTICS_VIDEOS.length >= 8)
  for (const vid of PRO_TACTICS_VIDEOS) {
    const gCrucial = new Chess(vid.fen)
    const keyMove = gCrucial.move(vid.keyMoveSan)
    assert.ok(keyMove, `Video ${vid.id} keyMoveSan ${vid.keyMoveSan} illegal on fen`)

    const gDemo = new Chess(vid.demoStartFen)
    for (const san of vid.demoMoves) {
      const dm = gDemo.move(san)
      assert.ok(dm, `Video ${vid.id} demo move ${san} illegal`)
    }
  }
})

test('3. Puzzle Bank (20) + Auto-Generator (50 unique across 5 themes) + Daily Puzzle all 100% legal & non-repeating', () => {
  for (const pz of PUZZLE_BANK) {
    const g = new Chess(pz.fen)
    const mv = g.move(pz.solutionSan)
    assert.ok(mv && mv.san === pz.solutionSan, `Bank puzzle ${pz.id} failed SAN check`)
  }

  const seen = new Set<string>()
  const themes = ['Skakmat', 'Garpu', 'Pin', 'Pengorbanan', 'Babak Akhir'] as const
  for (let i = 1; i <= 50; i++) {
    const theme = themes[(i - 1) % themes.length]!
    const p = generateUniquePuzzle({ themes: [theme], seenKeys: seen, sequenceNumber: i })
    const key = normalizeFenKey(p.fen)
    assert.ok(!seen.has(key), `Duplicate puzzle generated at #${i}: ${p.id}`)
    seen.add(key)
    const g = new Chess(p.fen)
    const mv = g.move(p.solutionSan)
    assert.ok(mv && mv.san === p.solutionSan, `Auto puzzle ${p.id} invalid SAN ${p.solutionSan}`)
  }

  const daily = generateDailyAutoPuzzle()
  const dg = new Chess(daily.fen)
  const dmv = dg.move(daily.solutionSan)
  assert.ok(dmv && dmv.san === daily.solutionSan, 'Daily auto puzzle invalid')
})

test('4. All 15 Catalog Bots + Custom ELO extremes (250, 1500, 3200) + all 5 Personas return legal moves safely', () => {
  const testFens = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    // In-check position (Qh4+ where White must legally reply g3)
    'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3'
  ]

  for (const bot of BOT_CATALOG) {
    const res = computeBotMove(testFens[1]!, bot, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])
    assert.ok(res.move !== null, `Bot ${bot.id} failed to produce a move`)
    const g = new Chess(testFens[1]!)
    assert.ok(g.move(res.move!), `Bot ${bot.id} returned illegal move`)
  }

  for (const elo of [250, 1500, 3200]) {
    const customBot = buildCustomEngineBot(elo)
    for (const fen of testFens) {
      const res = computeBotMove(fen, customBot, [])
      assert.ok(res.move !== null, `Custom ${elo} failed on ${fen}`)
    }
  }

  for (const persona of BOT_PERSONAS) {
    const res = computeBotMove(testFens[0]!, { elo: 1200 }, [], persona.id)
    assert.ok(res.move !== null, `Persona ${persona.id} failed on opening`)
  }
})

test('5. Full end-to-end Match -> Game Review -> Socratic (3 lenses) -> Multi-Ply What-If + Rewind + Adaptive Lens legality', async () => {
  // Simulate a complete short game ending in Scholar's Mate (White wins)
  const movesSan = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
  const g = new Chess()
  const snapshots: ReviewSnapshotInput[] = [
    { fen: g.fen(), lastMove: null, san: '', color: 'w', moveNumber: 0 }
  ]

  for (let i = 0; i < movesSan.length; i++) {
    const played = g.move(movesSan[i]!)
    assert.ok(played)
    snapshots.push({
      fen: g.fen(),
      lastMove: { from: played.from, to: played.to },
      san: played.san,
      color: played.color,
      moveNumber: Math.ceil((i + 1) / 2)
    })

    // Check Adaptive Lens legality on every single board state for BOTH sides & ALL lenses!
    if (!g.isGameOver()) {
      for (const lens of ['apprentice', 'club', 'master'] as const) {
        const vision = analyzeBoardVision(g.fen(), g.turn(), lens)
        const legalMoves = g.moves({ verbose: true })
        for (const arrow of vision.planArrows) {
          const isLegal = legalMoves.some((m) => m.from === arrow.from && m.to === arrow.to)
          assert.ok(
            isLegal,
            `Illegal Adaptive Lens planArrow ${arrow.from}->${arrow.to} on ply ${i + 1} (${lens})`
          )
        }
      }
      const hint = computeTieredHint(g.fen(), 3, 'apprentice')
      assert.ok(hint.bestSan.length >= 2)
    }
  }

  // Run full Game Review analysis
  const report = await analyzeCompletedMatch(snapshots, {
    whiteName: 'Anda',
    blackName: 'Citra',
    referenceOpponentElo: 1050,
    humanSide: 'w'
  })

  assert.equal(report.moves.length, movesSan.length)
  assert.ok(report.whiteAccuracy > 0 && report.whiteAccuracy <= 100)
  assert.ok(report.blackAccuracy >= 0 && report.blackAccuracy <= 100)
  assert.equal(report.phaseGrades.length, 4)

  // Verify Socratic Review for EVERY move across all 3 lenses (from White's perspective AND Black's perspective)
  for (const mv of report.moves) {
    for (const lens of ['apprentice', 'club', 'master'] as const) {
      const comment = formatMoveCommentForLens(mv, lens, 'w')
      assert.ok(comment.length > 5)

      const insightAsWhite = generateSocraticReview(mv, lens, 'w')
      assert.ok(insightAsWhite.socraticQuestion.length > 10)
      assert.ok(!insightAsWhite.humanExplanation.includes('—'))

      // Verify every suggested candidate is 100% legal on the intended FEN!
      const expectedFen = insightAsWhite.whatIfStartsOnAfterFen ? mv.afterFen : mv.beforeFen
      const checkGame = new Chess(expectedFen)
      const legalSans = checkGame.moves()
      for (const cand of insightAsWhite.suggestedCandidates) {
        assert.ok(
          legalSans.includes(cand),
          `Suggested candidate ${cand} is NOT legal on expected FEN for ply ${mv.ply} (${mv.san})`
        )
      }
    }
  }

  // Verify multi-ply What-If (4 plies deep) + Rewind always stays on human's color (Black defending ply 6: Nf6?? -> g6)
  const blackBlunder = report.moves[5]! // 3... Nf6??
  assert.equal(blackBlunder.san, 'Nf6')
  let session = createWhatIfSession(blackBlunder.beforeFen, 'Langkah 3... (alternatif Nf6)', 'Nf6', 'apprentice')
  assert.equal(session.moverPerspective, 'b')

  const cands = suggestCandidatesForFen(session.currentFen, 8)
  assert.ok(cands.length >= 6, `Expected rich What-If candidates (>=6), got ${cands.length}`)
  assert.ok(cands.includes('g6') || cands.includes('Qe7'))

  // Play 2 full cycles (4 plies): Black -> White reply -> Black -> White reply
  const step1 = stepWhatIfMove(session, 'g6', 'apprentice')
  assert.equal(step1.valid, true)
  session = applyOpponentReplyInWhatIf(step1.nextSession, 'apprentice')
  assert.equal(session.branchMoves.length, 2)
  assert.equal(new Chess(session.currentFen).turn(), 'b', 'Must be Black turn after opponent reply')

  const nextCands = suggestCandidatesForFen(session.currentFen, 8)
  assert.ok(nextCands.length >= 1)
  const step2 = stepWhatIfMove(session, nextCands[0]!, 'apprentice')
  assert.equal(step2.valid, true)
  session = applyOpponentReplyInWhatIf(step2.nextSession, 'apprentice')
  assert.equal(session.branchMoves.length, 4)
  assert.equal(new Chess(session.currentFen).turn(), 'b')

  // Rewind 1 full turn -> must land cleanly back at ply 2 (Black's turn!)
  session = rewindWhatIfPly(session, 'apprentice')
  assert.equal(session.branchMoves.length, 2)
  assert.equal(new Chess(session.currentFen).turn(), 'b', 'Rewind must keep human perspective!')
})
