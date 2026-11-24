import type { RowDataPacket } from 'mysql2/promise'
import { getTiDbPool, isTiDbConfigured, resolveTiDbConfig } from '../../utils/tidb'

export default defineEventHandler(async (event) => {
  const cfg = resolveTiDbConfig()
  if (!isTiDbConfigured()) {
    return {
      ok: false,
      configured: false,
      database: cfg.database,
      message: 'Variabel TIDB_HOST, TIDB_USER, atau TIDB_PASSWORD belum diatur.'
    }
  }

  const startedAt = Date.now()
  try {
    const pool = await getTiDbPool()
    const [infoRows] = await pool.query<RowDataPacket[]>(
      'SELECT VERSION() AS version, DATABASE() AS db'
    )
    const [tableRows] = await pool.query<RowDataPacket[]>('SHOW TABLES')
    const tables = tableRows.map((row) => String(Object.values(row)[0] ?? ''))

    return {
      ok: true,
      configured: true,
      database: String(infoRows[0]?.db ?? cfg.database),
      version: String(infoRows[0]?.version ?? 'TiDB Cloud'),
      tables,
      latencyMs: Date.now() - startedAt
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal terhubung ke TiDB Cloud.'
    setResponseStatus(event, 503)
    return {
      ok: false,
      configured: true,
      database: cfg.database,
      message
    }
  }
})
