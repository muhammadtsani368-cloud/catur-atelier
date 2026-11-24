import type { ResultSetHeader } from 'mysql2/promise'
import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured
} from '../utils/tidb'

interface SaveMatchPayload {
  gameMode?: 'bot' | 'custom' | 'pvp'
  opponentName?: string
  opponentElo?: number
  humanSide?: 'w' | 'b'
  resultWinner?: 'w' | 'b' | 'draw'
  resultTitle?: string
  accuracyPercent?: number
  totalPlies?: number
  finalFen?: string
  pgn?: string
  evalHistory?: unknown[]
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi.' })
  }

  const profileId = getProfileIdFromEvent(event)
  const body = (await readBody<SaveMatchPayload>(event)) ?? {}

  const gameMode =
    body.gameMode === 'custom' || body.gameMode === 'pvp' ? body.gameMode : 'bot'
  const opponentName = String(body.opponentName ?? 'Lawan').trim().slice(0, 120) || 'Lawan'
  const opponentElo = Math.max(0, Math.min(4000, Math.floor(Number(body.opponentElo ?? 0) || 0)))
  const humanSide = body.humanSide === 'b' ? 'b' : 'w'
  const resultWinner =
    body.resultWinner === 'w' || body.resultWinner === 'b' ? body.resultWinner : 'draw'
  const resultTitle =
    String(body.resultTitle ?? 'Pertandingan Selesai').trim().slice(0, 180) ||
    'Pertandingan Selesai'
  const accuracyPercent = Math.max(
    0,
    Math.min(100, Math.round(Number(body.accuracyPercent ?? 0) || 0))
  )
  const totalPlies = Math.max(0, Math.floor(Number(body.totalPlies ?? 0) || 0))
  const finalFen = String(body.finalFen ?? '').trim().slice(0, 120)
  const pgn = typeof body.pgn === 'string' ? body.pgn.slice(0, 16000) : null
  const evalHistory = Array.isArray(body.evalHistory) ? body.evalHistory.slice(0, 400) : []

  const pool = await getTiDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO atelier_match_history
      (profile_id, game_mode, opponent_name, opponent_elo, human_side, result_winner,
       result_title, accuracy_percent, total_plies, final_fen, pgn, eval_history)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profileId,
      gameMode,
      opponentName,
      opponentElo,
      humanSide,
      resultWinner,
      resultTitle,
      accuracyPercent,
      totalPlies,
      finalFen,
      pgn,
      JSON.stringify(evalHistory)
    ]
  )

  return {
    ok: true,
    id: Number(result.insertId),
    profileId
  }
})
