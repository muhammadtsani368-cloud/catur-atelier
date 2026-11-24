import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured
} from '../utils/tidb'

interface CustomOpeningInput {
  id: string
  title?: string
  side?: string
  eco?: string
  [key: string]: unknown
}

interface MistakeInput {
  id: string
  source?: string
  title?: string
  fen?: string
  expectedSan?: string
  side?: string
  createdAt?: string
}

interface ProgressPayload {
  totalAttempts?: number
  correctMoves?: number
  streakDays?: number
  lastPracticeDate?: string | null
  masteredLineIds?: string[]
  lineStats?: Record<string, unknown>
  customOpenings?: CustomOpeningInput[]
  mistakeQueue?: MistakeInput[]
}

function toMySqlTimestamp(iso?: string): Date {
  if (!iso) return new Date()
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi.' })
  }

  const profileId = getProfileIdFromEvent(event)
  const body = (await readBody<ProgressPayload>(event)) ?? {}

  const totalAttempts = Math.max(0, Math.floor(Number(body.totalAttempts ?? 0) || 0))
  const correctMoves = Math.max(0, Math.floor(Number(body.correctMoves ?? 0) || 0))
  const streakDays = Math.max(0, Math.floor(Number(body.streakDays ?? 0) || 0))
  const lastPracticeDate =
    typeof body.lastPracticeDate === 'string' && body.lastPracticeDate.trim()
      ? body.lastPracticeDate.trim().slice(0, 16)
      : null
  const masteredLineIds = Array.isArray(body.masteredLineIds)
    ? body.masteredLineIds.filter((id): id is string => typeof id === 'string')
    : []
  const lineStats =
    body.lineStats && typeof body.lineStats === 'object' && !Array.isArray(body.lineStats)
      ? body.lineStats
      : {}
  const customOpenings = Array.isArray(body.customOpenings) ? body.customOpenings : []
  const mistakeQueue = Array.isArray(body.mistakeQueue) ? body.mistakeQueue.slice(0, 30) : []

  const pool = await getTiDbPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO atelier_profiles
        (profile_id, total_attempts, correct_moves, streak_days, last_practice_date, mastered_line_ids, line_stats)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        total_attempts = VALUES(total_attempts),
        correct_moves = VALUES(correct_moves),
        streak_days = VALUES(streak_days),
        last_practice_date = VALUES(last_practice_date),
        mastered_line_ids = VALUES(mastered_line_ids),
        line_stats = VALUES(line_stats)`,
      [
        profileId,
        totalAttempts,
        correctMoves,
        streakDays,
        lastPracticeDate,
        JSON.stringify(masteredLineIds),
        JSON.stringify(lineStats)
      ]
    )

    // Sync custom openings for this profile
    await conn.execute('DELETE FROM atelier_custom_openings WHERE profile_id = ?', [profileId])
    for (const op of customOpenings) {
      if (!op || typeof op.id !== 'string' || !op.id.trim()) continue
      const opId = op.id.trim().slice(0, 96)
      const title = String(op.title ?? 'Pembukaan Kustom').slice(0, 255)
      const side = op.side === 'b' ? 'b' : 'w'
      const eco = String(op.eco ?? 'Kustom').slice(0, 32)
      await conn.execute(
        `INSERT INTO atelier_custom_openings (id, profile_id, title, side, eco, payload)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          side = VALUES(side),
          eco = VALUES(eco),
          payload = VALUES(payload)`,
        [opId, profileId, title, side, eco, JSON.stringify(op)]
      )
    }

    // Sync mistake queue for this profile
    await conn.execute('DELETE FROM atelier_mistake_queue WHERE profile_id = ?', [profileId])
    for (const item of mistakeQueue) {
      if (!item || typeof item.id !== 'string') continue
      const fen = String(item.fen ?? '').trim().slice(0, 120)
      const expectedSan = String(item.expectedSan ?? '').trim().slice(0, 32)
      if (!fen || !expectedSan) continue
      const id = item.id.trim().slice(0, 96)
      const source =
        item.source === 'endgame' || item.source === 'daily' ? item.source : 'opening'
      const title = String(item.title ?? 'Latihan Ulang').slice(0, 255)
      const side = item.side === 'b' ? 'b' : 'w'
      const createdAt = toMySqlTimestamp(item.createdAt)

      await conn.execute(
        `INSERT INTO atelier_mistake_queue
          (id, profile_id, source, title, fen, expected_san, side, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          id = VALUES(id),
          source = VALUES(source),
          title = VALUES(title),
          side = VALUES(side),
          created_at = VALUES(created_at)`,
        [id, profileId, source, title, fen, expectedSan, side, createdAt]
      )
    }

    await conn.commit()
    return { ok: true, profileId, syncedAt: new Date().toISOString() }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})
