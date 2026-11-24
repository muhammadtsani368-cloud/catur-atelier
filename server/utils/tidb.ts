import fs from 'node:fs'
import path from 'node:path'
import mysql, { type Pool, type PoolOptions } from 'mysql2/promise'
import type { H3Event } from 'h3'
import { getCookie, getHeader, getQuery } from 'h3'

interface TiDbResolvedConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl: boolean
  caPath: string
}

let cachedPool: Pool | null = null
let schemaReadyPromise: Promise<void> | null = null
let dotEnvFallbackCache: Record<string, string> | null = null

function readDotEnvFallback(): Record<string, string> {
  if (dotEnvFallbackCache) return dotEnvFallbackCache
  const parsed: Record<string, string> = {}
  try {
    const envFile = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8')
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eqIdx = line.indexOf('=')
        if (eqIdx <= 0) continue
        const key = line.slice(0, eqIdx).trim()
        let val = line.slice(eqIdx + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        parsed[key] = val
      }
    }
  } catch {
    // Ignore local .env fallback errors in serverless deployments
  }
  dotEnvFallbackCache = parsed
  return parsed
}

function sanitizeIdentifier(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '')
  return clean || 'grandmaster_atelier'
}

export function resolveTiDbConfig(): TiDbResolvedConfig {
  const rc = useRuntimeConfig()
  const fallback = readDotEnvFallback()

  const host = String(process.env.TIDB_HOST || rc.tidbHost || fallback.TIDB_HOST || '').trim()
  const port = Number(process.env.TIDB_PORT || rc.tidbPort || fallback.TIDB_PORT || 4000)
  const user = String(process.env.TIDB_USER || rc.tidbUser || fallback.TIDB_USER || '').trim()
  const password = String(
    process.env.TIDB_PASSWORD || rc.tidbPassword || fallback.TIDB_PASSWORD || ''
  ).trim()
  const database = sanitizeIdentifier(
    String(
      process.env.TIDB_DATABASE ||
        rc.tidbDatabase ||
        fallback.TIDB_DATABASE ||
        'grandmaster_atelier'
    ).trim()
  )
  const rawSsl = process.env.TIDB_SSL ?? fallback.TIDB_SSL
  const ssl = rawSsl !== undefined ? rawSsl !== 'false' : Boolean(rc.tidbSsl ?? true)
  const caPath = String(
    process.env.TIDB_CA_PATH || rc.tidbCaPath || fallback.TIDB_CA_PATH || ''
  ).trim()

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 4000,
    user,
    password,
    database,
    ssl,
    caPath
  }
}

export function isTiDbConfigured(): boolean {
  const cfg = resolveTiDbConfig()
  return Boolean(cfg.host && cfg.user && cfg.password)
}

function buildSslOptions(cfg: TiDbResolvedConfig): PoolOptions['ssl'] {
  if (!cfg.ssl) return undefined
  if (cfg.caPath && fs.existsSync(cfg.caPath)) {
    return {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      ca: fs.readFileSync(cfg.caPath, 'utf8')
    }
  }
  return {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
}

export const TIDB_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS atelier_profiles (
    profile_id VARCHAR(64) NOT NULL PRIMARY KEY,
    total_attempts INT NOT NULL DEFAULT 0,
    correct_moves INT NOT NULL DEFAULT 0,
    streak_days INT NOT NULL DEFAULT 0,
    last_practice_date VARCHAR(16) NULL,
    mastered_line_ids JSON NOT NULL,
    line_stats JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atelier_custom_openings (
    id VARCHAR(96) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    side CHAR(1) NOT NULL,
    eco VARCHAR(32) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_custom_profile (profile_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atelier_mistake_queue (
    id VARCHAR(96) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(64) NOT NULL,
    source VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    fen VARCHAR(120) NOT NULL,
    expected_san VARCHAR(32) NOT NULL,
    side CHAR(1) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_profile_fen_san (profile_id, fen, expected_san),
    INDEX idx_mistake_profile_created (profile_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atelier_match_history (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    profile_id VARCHAR(64) NOT NULL,
    game_mode VARCHAR(16) NOT NULL,
    opponent_name VARCHAR(120) NOT NULL,
    opponent_elo INT NOT NULL DEFAULT 0,
    human_side CHAR(1) NOT NULL,
    result_winner VARCHAR(16) NOT NULL,
    result_title VARCHAR(180) NOT NULL,
    accuracy_percent INT NOT NULL DEFAULT 0,
    total_plies INT NOT NULL DEFAULT 0,
    final_fen VARCHAR(120) NOT NULL,
    pgn TEXT NULL,
    eval_history JSON NULL,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_match_profile_played (profile_id, played_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS atelier_preferences (
    profile_id VARCHAR(64) NOT NULL PRIMARY KEY,
    is_dark TINYINT(1) NOT NULL DEFAULT 0,
    board_theme VARCHAR(16) NOT NULL DEFAULT 'sage',
    piece_set VARCHAR(16) NOT NULL DEFAULT 'classic',
    is_muted TINYINT(1) NOT NULL DEFAULT 0,
    cinematic_effects TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
]

async function initializePoolAndSchema(): Promise<void> {
  const cfg = resolveTiDbConfig()
  if (!cfg.host || !cfg.user || !cfg.password) {
    throw new Error('Konfigurasi TiDB Cloud belum lengkap (TIDB_HOST, TIDB_USER, TIDB_PASSWORD).')
  }

  const sslOptions = buildSslOptions(cfg)

  // Step 1: Ensure dedicated database exists without polluting system `sys` schema
  const bootstrapConn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    ssl: sslOptions,
    connectTimeout: 12000
  })

  try {
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  } finally {
    await bootstrapConn.end()
  }

  // Step 2: Create reusable connection pool bound to target database
  if (!cachedPool) {
    cachedPool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: sslOptions,
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 12000
    })
  }

  // Step 3: Ensure all 5 application tables exist
  for (const ddl of TIDB_SCHEMA_STATEMENTS) {
    await cachedPool.query(ddl)
  }
}

export async function getTiDbPool(): Promise<Pool> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = initializePoolAndSchema().catch((err) => {
      schemaReadyPromise = null
      throw err
    })
  }
  await schemaReadyPromise
  if (!cachedPool) {
    throw new Error('Pool koneksi TiDB belum siap.')
  }
  return cachedPool
}

export function parseJsonColumn<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
  if (typeof raw === 'object') {
    return raw as T
  }
  return fallback
}

export function sanitizeProfileId(raw: unknown): string {
  if (typeof raw !== 'string') return 'default'
  const clean = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return clean || 'default'
}

export function getProfileIdFromEvent(event: H3Event): string {
  const fromHeader = getHeader(event, 'x-atelier-profile')
  if (fromHeader) return sanitizeProfileId(fromHeader)
  const query = getQuery(event)
  if (typeof query.profileId === 'string') return sanitizeProfileId(query.profileId)
  const fromCookie = getCookie(event, 'atelier_profile_id')
  if (fromCookie) return sanitizeProfileId(fromCookie)
  return 'default'
}
