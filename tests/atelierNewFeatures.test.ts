import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDailyRoutineTasks, getTodayLocalIso } from '~/utils/dailyRoutine'
import { computePlayerDnaProfile } from '~/utils/playerDnaEngine'

test('Player DNA Radar computes 5 bounded axes, archetype, and 3 core prescriptions with zero deleted routes', () => {
  const dna = computePlayerDnaProfile(
    {
      totalAttempts: 40,
      correctMoves: 34,
      streakDays: 5,
      lastPracticeDate: '2026-11-26',
      masteredLineIds: ['ruy-lopez-main', 'endgame-lucena-1'],
      lineStats: {},
      customOpenings: [],
      mistakeQueue: []
    },
    [
      {
        gameMode: 'bot',
        opponentName: 'Citra',
        opponentElo: 1050,
        humanSide: 'w',
        resultWinner: 'w',
        resultTitle: 'Skakmat',
        accuracyPercent: 86,
        totalPlies: 32,
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6'
      }
    ]
  )

  assert.equal(dna.axes.length, 5)
  for (const ax of dna.axes) {
    assert.ok(ax.score >= 18 && ax.score <= 98, `Axis ${ax.key} out of range: ${ax.score}`)
  }
  assert.ok(dna.archetypeName.length > 0)
  assert.equal(dna.prescriptions.length, 3)
  for (const rx of dna.prescriptions) {
    assert.ok(rx.to.startsWith('/'))
    assert.ok(!rx.to.includes('/atelier'), `Prescription must not link to deleted /atelier: ${rx.to}`)
    assert.ok(!rx.to.includes('clinic'), `Prescription must not link to deleted clinic: ${rx.to}`)
  }
})

test('Daily 5-Minute Routine builds 3 clean core tasks without deleted Studio links', () => {
  assert.match(getTodayLocalIso(new Date(2026, 10, 26)), /^2026-11-26$/)

  const tasksWithMistakes = buildDailyRoutineTasks(
    { date: '2026-11-26', completedIds: ['daily-puzzle'] },
    { mistakeCount: 3, quickDrillRoute: '/trainer/opening/ruy-lopez-morphy' }
  )
  assert.equal(tasksWithMistakes.length, 3)
  assert.equal(tasksWithMistakes[0]!.done, true)
  assert.ok(tasksWithMistakes[2]!.title.includes('3'))

  const tasksClean = buildDailyRoutineTasks(
    { date: '2026-11-26', completedIds: [] },
    { mistakeCount: 0, quickDrillRoute: '/trainer/opening/ruy-lopez-morphy' }
  )
  for (const t of [...tasksWithMistakes, ...tasksClean]) {
    assert.ok(!t.to.includes('/atelier'), `Routine task must not link to /atelier: ${t.to}`)
    assert.ok(!t.to.includes('clinic'), `Routine task must not link to clinic: ${t.to}`)
  }
})
