import type { RowDataPacket } from 'mysql2/promise'
import {
  getProfileIdFromEvent,
  getTiDbPool,
  isTiDbConfigured,
  parseJsonColumn
} from '../utils/tidb'

interface MatchHistoryRow extends RowDataPacket {
  id: number
  game_mode: 'bot' | 'custom' | 'pvp'
  opponent_name: string
  opponent_elo: number
  human_side: 'w' | 'b'
  result_winner: 'w' | 'b' | 'draw'
  result_title: string
  accuracy_percent: number
  total_plies: number
  final_fen: string
  pgn: string | null
  eval_history: unknown
  played_at: Date | string
}

export default defineEventHandler(async (event) => {
  if (!isTiDbConfigured()) {
    return { ok: false, matches: [] }
  }

  const profileId = getProfileIdFromEvent(event)
  const pool = await getTiDbPool()

  const [rows] = await pool.query<MatchHistoryRow[]>(
    `SELECT id, game_mode, opponent_name, opponent_elo, human_side, result_winner,
            result_title, accuracy_percent, total_plies, final_fen, pgn, eval_history, played_at
     FROM atelier_match_history
     WHERE profile_id = ?
     ORDER BY played_at DESC
     LIMIT 20`,
    [profileId]
  )

  const matches = rows.map((row) => ({
    id: Number(row.id),
    gameMode: row.game_mode,
    opponentName: row.opponent_name,
    opponentElo: Number(row.opponent_elo ?? 0),
    humanSide: row.human_side === 'b' ? 'b' : 'w',
    resultWinner: row.result_winner,
    resultTitle: row.result_title,
    accuracyPercent: Number(row.accuracy_percent ?? 0),
    totalPlies: Number(row.total_plies ?? 0),
    finalFen: row.final_fen,
    pgn: row.pgn ?? '',
    evalHistory: parseJsonColumn<unknown[]>(row.eval_history, []),
    playedAt:
      row.played_at instanceof Date ? row.played_at.toISOString() : String(row.played_at)
  }))

  return { ok: true, profileId, matches }
})
