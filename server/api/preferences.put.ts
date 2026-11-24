import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured
} from '../utils/tidb'

interface PreferencesPayload {
  isDark?: boolean
  boardTheme?: string
  pieceSet?: string
  isMuted?: boolean
  cinematicEffects?: boolean
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi.' })
  }

  const profileId = getProfileIdFromEvent(event)
  const body = (await readBody<PreferencesPayload>(event)) ?? {}

  const isDark = body.isDark ? 1 : 0
  const boardTheme =
    body.boardTheme === 'walnut' || body.boardTheme === 'stone' ? body.boardTheme : 'sage'
  const pieceSet = body.pieceSet === 'animal' ? 'animal' : 'classic'
  const isMuted = body.isMuted ? 1 : 0
  const cinematicEffects = body.cinematicEffects === false ? 0 : 1

  const pool = await getTiDbPool()
  await pool.execute(
    `INSERT INTO atelier_preferences
      (profile_id, is_dark, board_theme, piece_set, is_muted, cinematic_effects)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      is_dark = VALUES(is_dark),
      board_theme = VALUES(board_theme),
      piece_set = VALUES(piece_set),
      is_muted = VALUES(is_muted),
      cinematic_effects = VALUES(cinematic_effects)`,
    [profileId, isDark, boardTheme, pieceSet, isMuted, cinematicEffects]
  )

  return { ok: true, profileId }
})
