import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile()

const host = (process.env.TIDB_HOST || '').trim()
const port = Number(process.env.TIDB_PORT || 4000)
const user = (process.env.TIDB_USER || '').trim()
const password = (process.env.TIDB_PASSWORD || '').trim()
const database = (process.env.TIDB_DATABASE || 'grandmaster_atelier').replace(/[^a-zA-Z0-9_]/g, '') || 'grandmaster_atelier'
const useSsl = process.env.TIDB_SSL !== 'false'
const caPath = (process.env.TIDB_CA_PATH || '').trim()

if (!host || !user || !password) {
  console.error('Error: TIDB_HOST, TIDB_USER, dan TIDB_PASSWORD harus diisi di file .env')
  process.exit(1)
}

const ssl = useSsl
  ? caPath && fs.existsSync(caPath)
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') }
    : { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  : undefined

const DDL_STATEMENTS = [
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

async function main() {
  console.log(`Menghubungkan ke TiDB Cloud: ${host}:${port} ...`)
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    ssl,
    connectTimeout: 15000
  })

  try {
    const [verRows] = await conn.query('SELECT VERSION() AS version')
    const version = Array.isArray(verRows) && verRows[0] ? verRows[0].version : 'unknown'
    console.log(`Terhubung! Versi TiDB: ${version}`)

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await conn.query(`USE \`${database}\``)
    console.log(`Database aktif: ${database}`)

    for (const ddl of DDL_STATEMENTS) {
      await conn.query(ddl)
    }

    const [tables] = await conn.query('SHOW TABLES')
    const tableNames = Array.isArray(tables) ? tables.map((row) => Object.values(row)[0]) : []
    console.log(`Tabel siap (${tableNames.length}): ${tableNames.join(', ')}`)

    // Verifikasi cepat baca/tulis/hapus menggunakan profil uji sementara
    const probeId = `__probe_${Date.now()}`
    await conn.execute(
      `INSERT INTO atelier_preferences (profile_id, is_dark, board_theme, piece_set, is_muted, cinematic_effects)
       VALUES (?, 0, 'sage', 'classic', 0, 1)`,
      [probeId]
    )
    const [probeRows] = await conn.execute(
      'SELECT profile_id, board_theme FROM atelier_preferences WHERE profile_id = ?',
      [probeId]
    )
    await conn.execute('DELETE FROM atelier_preferences WHERE profile_id = ?', [probeId])

    if (!Array.isArray(probeRows) || probeRows.length !== 1) {
      throw new Error('Verifikasi baca/tulis TiDB gagal.')
    }
    console.log('Verifikasi CRUD (INSERT -> SELECT -> DELETE): SUKSES')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('Gagal inisialisasi TiDB Cloud:', err)
  process.exit(1)
})
