import type { RowDataPacket } from 'mysql2/promise'
import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured,
  parseJsonColumn
} from '../utils/tidb'

interface ProfileRow extends RowDataPacket {
  total_attempts: number
  correct_moves: number
  streak_days: number
  last_practice_date: string | null
  mastered_line_ids: unknown
  line_stats: unknown
}

interface CustomOpeningRow extends RowDataPacket {
  payload: unknown
}

interface MistakeRow extends RowDataPacket {
  id: string
  source: 'opening' | 'endgame' | 'daily'
  title: string
  fen: string
  expected_san: string
  side: 'w' | 'b'
  created_at: Date | string
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    return { ok: false, exists: false, progress: null }
  }

  const profileId = getProfileIdFromEvent(event)
  const pool = await getTiDbPool()

  const [profileRows] = await pool.query<ProfileRow[]>(
    `SELECT total_attempts, correct_moves, streak_days, last_practice_date, mastered_line_ids, line_stats
     FROM atelier_profiles
     WHERE profile_id = ?`,
    [profileId]
  )

  const [customRows] = await pool.query<CustomOpeningRow[]>(
    `SELECT payload
     FROM atelier_custom_openings
     WHERE profile_id = ?
     ORDER BY created_at DESC`,
    [profileId]
  )

  const [mistakeRows] = await pool.query<MistakeRow[]>(
    `SELECT id, source, title, fen, expected_san, side, created_at
     FROM atelier_mistake_queue
     WHERE profile_id = ?
     ORDER BY created_at DESC
     LIMIT 30`,
    [profileId]
  )

  const profile = profileRows[0]
  if (!profile && customRows.length === 0 && mistakeRows.length === 0) {
    return { ok: true, exists: false, profileId, progress: null }
  }

  const masteredLineIds = parseJsonColumn<string[]>(profile?.mastered_line_ids, [])
  const lineStats = parseJsonColumn<Record<string, unknown>>(profile?.line_stats, {})
  const customOpenings = customRows
    .map((r) => parseJsonColumn<Record<string, unknown> | null>(r.payload, null))
    .filter((item): item is Record<string, unknown> => item !== null)

  const mistakeQueue = mistakeRows.map((m) => ({
    id: m.id,
    source: m.source === 'endgame' || m.source === 'daily' ? m.source : 'opening',
    title: m.title,
    fen: m.fen,
    expectedSan: m.expected_san,
    side: m.side === 'b' ? 'b' : 'w',
    createdAt:
      m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)
  }))

  return {
    ok: true,
    exists: true,
    profileId,
    progress: {
      totalAttempts: Number(profile?.total_attempts ?? 0),
      correctMoves: Number(profile?.correct_moves ?? 0),
      streakDays: Number(profile?.streak_days ?? 0),
      lastPracticeDate: profile?.last_practice_date ?? null,
      masteredLineIds: Array.isArray(masteredLineIds) ? masteredLineIds : [],
      lineStats: lineStats && typeof lineStats === 'object' ? lineStats : {},
      customOpenings,
      mistakeQueue
    }
  }
})
