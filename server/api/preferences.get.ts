import type { RowDataPacket } from 'mysql2/promise'
import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured
} from '../utils/tidb'

interface PreferenceRow extends RowDataPacket {
  is_dark: number
  board_theme: string
  piece_set: string
  is_muted: number
  cinematic_effects: number
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    return { ok: false, exists: false, preferences: null }
  }

  const profileId = getProfileIdFromEvent(event)
  const pool = await getTiDbPool()

  const [rows] = await pool.query<PreferenceRow[]>(
    `SELECT is_dark, board_theme, piece_set, is_muted, cinematic_effects
     FROM atelier_preferences
     WHERE profile_id = ?`,
    [profileId]
  )

  const row = rows[0]
  if (!row) {
    return { ok: true, exists: false, profileId, preferences: null }
  }

  return {
    ok: true,
    exists: true,
    profileId,
    preferences: {
      isDark: Boolean(row.is_dark),
      boardTheme:
        row.board_theme === 'walnut' || row.board_theme === 'stone' ? row.board_theme : 'sage',
      pieceSet: row.piece_set === 'animal' ? 'animal' : 'classic',
      isMuted: Boolean(row.is_muted),
      cinematicEffects: Boolean(row.cinematic_effects)
    }
  }
})
