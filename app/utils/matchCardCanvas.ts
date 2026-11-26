import { Chess, type Color, type PieceSymbol } from 'chess.js'
import type { BoardPalette, PieceSetKey } from '~/composables/useTheme'

export interface AchievementCardOptions {
  title: string
  subtitle: string
  badgeLabel: string
  fen: string
  orientation?: Color
  accuracyPercent: number
  streakDays: number
  extraMetricLabel?: string
  extraMetricValue?: string
  highlightSan?: string
  highlightLabel?: string
  palette: BoardPalette
  pieceSet: PieceSetKey
  theme?: 'editorial-dark' | 'editorial-light' | 'cosmic' | 'cream'
  filename?: string
}

const CLASSIC_GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
}

const ANIMAL_BADGES: Record<Color, Record<PieceSymbol, { bg: string; ring: string; label: string; glyph: string }>> = {
  w: {
    k: { bg: '#FFF1C9', ring: '#E3B94B', label: 'SINGA', glyph: 'L' },
    q: { bg: '#FFE0EA', ring: '#E489A4', label: 'ANGSA', glyph: 'A' },
    r: { bg: '#DDF3EC', ring: '#5E9F8B', label: 'GAJAH', glyph: 'G' },
    b: { bg: '#E6E2FF', ring: '#8F80D9', label: 'HANTU', glyph: 'H' },
    n: { bg: '#FCE6D8', ring: '#D9855B', label: 'PONI', glyph: 'K' },
    p: { bg: '#F4F2EC', ring: '#A59E92', label: 'KELINCI', glyph: 'P' }
  },
  b: {
    k: { bg: '#473F6E', ring: '#F9C74F', label: 'BERUANG', glyph: 'B' },
    q: { bg: '#5B3D60', ring: '#F4A7B9', label: 'RUBAH', glyph: 'R' },
    r: { bg: '#2F5556', ring: '#4ECDC4', label: 'BADAK', glyph: 'T' },
    b: { bg: '#3A3A63', ring: '#9D8DF1', label: 'GAGAK', glyph: 'G' },
    n: { bg: '#5A403A', ring: '#F26B5B', label: 'SERIGALA', glyph: 'S' },
    p: { bg: '#37354C', ring: '#A6A2C4', label: 'PANDA', glyph: 'P' }
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) break
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current)
  }
  return lines
}

function drawChessBoardPreview(
  ctx: CanvasRenderingContext2D,
  fen: string,
  orientation: Color,
  palette: BoardPalette,
  pieceSet: PieceSetKey,
  x: number,
  y: number,
  size: number,
  isCosmic: boolean
) {
  // Tactile outer bezel
  const pad = 18
  drawRoundedRect(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2, 34)
  ctx.fillStyle = isCosmic ? '#2A264A' : '#ECE7DE'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = isCosmic ? 'rgba(157, 141, 241, 0.38)' : 'rgba(59, 53, 97, 0.16)'
  ctx.stroke()

  // Clip inner board
  ctx.save()
  drawRoundedRect(ctx, x, y, size, size, 22)
  ctx.clip()

  const sqSize = size / 8
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  let board: ReturnType<Chess['board']>
  try {
    board = new Chess(fen).board()
  } catch {
    board = new Chess().board()
  }

  const rowOrder = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const colOrder = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]

  for (let dr = 0; dr < 8; dr++) {
    const r = rowOrder[dr]!
    for (let dc = 0; dc < 8; dc++) {
      const c = colOrder[dc]!
      const sx = x + dc * sqSize
      const sy = y + dr * sqSize
      const isLight = (r + c) % 2 === 0

      ctx.fillStyle = isLight ? palette.light : palette.dark
      ctx.fillRect(sx, sy, sqSize, sqSize)

      // Edge coordinates
      if (dc === 0) {
        ctx.fillStyle = isLight ? palette.coordOnLight : palette.coordOnDark
        ctx.font = '600 15px "JetBrains Mono", monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(ranks[r]!, sx + 6, sy + 5)
      }
      if (dr === 7) {
        ctx.fillStyle = isLight ? palette.coordOnLight : palette.coordOnDark
        ctx.font = '600 15px "JetBrains Mono", monospace'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText(files[c]!, sx + sqSize - 6, sy + sqSize - 5)
      }

      const piece = board[r]?.[c]
      if (!piece) continue

      const cx = sx + sqSize / 2
      const cy = sy + sqSize / 2

      if (pieceSet === 'animal') {
        const badge = ANIMAL_BADGES[piece.color][piece.type]
        const rad = sqSize * 0.36
        // Cute ear nubs
        ctx.fillStyle = badge.bg
        ctx.strokeStyle = badge.ring
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx - rad * 0.62, cy - rad * 0.68, rad * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx + rad * 0.62, cy - rad * 0.68, rad * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Main pastel animal face token
        ctx.beginPath()
        ctx.arc(cx, cy + 2, rad, 0, Math.PI * 2)
        ctx.fillStyle = badge.bg
        ctx.fill()
        ctx.strokeStyle = badge.ring
        ctx.lineWidth = 3.5
        ctx.stroke()

        // Piece initial + cute eyes
        ctx.fillStyle = piece.color === 'w' ? '#1E1B38' : '#FAF8F5'
        ctx.beginPath()
        ctx.arc(cx - rad * 0.32, cy - 3, 2.8, 0, Math.PI * 2)
        ctx.arc(cx + rad * 0.32, cy - 3, 2.8, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = '700 18px "Plus Jakarta Sans", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badge.glyph, cx, cy + rad * 0.36)
      } else {
        // Classic Staunton medallion glyph
        const glyph = CLASSIC_GLYPHS[piece.color][piece.type]
        ctx.font = `700 ${Math.round(sqSize * 0.72)}px Georgia, "Times New Roman", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Crisp subtle drop shadow for piece contrast
        ctx.fillStyle = 'rgba(18, 15, 36, 0.25)'
        ctx.fillText(glyph, cx + 1.5, cy + 3.5)

        if (piece.color === 'w') {
          ctx.lineWidth = 2.2
          ctx.strokeStyle = '#1E1B38'
          ctx.strokeText(glyph, cx, cy + 1)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillText(glyph, cx, cy + 1)
        } else {
          ctx.lineWidth = 1.6
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
          ctx.strokeText(glyph, cx, cy + 1)
          ctx.fillStyle = '#1E1B38'
          ctx.fillText(glyph, cx, cy + 1)
        }
      }
    }
  }

  ctx.restore()
}

/**
 * Generates a Cosmic Storybook 1080x1350 achievement PNG via HTML5 Canvas API and triggers download.
 */
export function exportAchievementCardPng(options: AchievementCardOptions): boolean {
  if (typeof document === 'undefined') return false

  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const resolvedTheme = options.theme ?? 'editorial-dark'
  const isEditorial = resolvedTheme === 'editorial-dark' || resolvedTheme === 'editorial-light'
  const isDarkSurface = resolvedTheme === 'editorial-dark' || resolvedTheme === 'cosmic'
  const bg =
    resolvedTheme === 'editorial-dark'
      ? '#141416'
      : resolvedTheme === 'editorial-light'
        ? '#F7F5F0'
        : isDarkSurface
          ? '#1E1B38'
          : '#FAF8F5'
  const cardSurface =
    resolvedTheme === 'editorial-dark'
      ? '#1C1D20'
      : resolvedTheme === 'editorial-light'
        ? '#FFFFFF'
        : isDarkSurface
          ? '#2A264A'
          : '#FFFFFF'
  const ink = isDarkSurface ? '#F7F5F0' : '#202321'
  const inkMuted = isDarkSurface ? '#A8B0AA' : '#5E645F'

  // 1. Canvas Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  if (isEditorial) {
    // Architectural Editorial warm gold + sage subtle vignette & hairline grid
    const g1 = ctx.createRadialGradient(920, 120, 20, 920, 120, 520)
    g1.addColorStop(0, isDarkSurface ? 'rgba(197, 155, 70, 0.18)' : 'rgba(197, 155, 70, 0.14)')
    g1.addColorStop(1, 'rgba(197, 155, 70, 0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, width, height)

    const g2 = ctx.createRadialGradient(140, 1200, 20, 140, 1200, 480)
    g2.addColorStop(0, isDarkSurface ? 'rgba(82, 104, 87, 0.22)' : 'rgba(82, 104, 87, 0.14)')
    g2.addColorStop(1, 'rgba(82, 104, 87, 0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, width, height)

    // Editorial double gold/stone hairline border
    drawRoundedRect(ctx, 42, 42, width - 84, height - 84, 38)
    ctx.lineWidth = 2
    ctx.strokeStyle = isDarkSurface ? 'rgba(197, 155, 70, 0.35)' : 'rgba(197, 155, 70, 0.45)'
    ctx.stroke()

    drawRoundedRect(ctx, 56, 56, width - 112, height - 112, 32)
    ctx.fillStyle = isDarkSurface ? 'rgba(25, 26, 29, 0.94)' : 'rgba(255, 255, 255, 0.95)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = isDarkSurface ? 'rgba(255, 255, 255, 0.08)' : 'rgba(32, 35, 33, 0.1)'
    ctx.stroke()
  } else {
    // Soft nebula radial glows (legacy cosmic/cream)
    const g1 = ctx.createRadialGradient(920, 140, 20, 920, 140, 480)
    g1.addColorStop(0, isDarkSurface ? 'rgba(157, 141, 241, 0.34)' : 'rgba(157, 141, 241, 0.2)')
    g1.addColorStop(1, 'rgba(157, 141, 241, 0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, width, height)

    const g2 = ctx.createRadialGradient(140, 1180, 20, 140, 1180, 460)
    g2.addColorStop(0, isDarkSurface ? 'rgba(78, 205, 196, 0.24)' : 'rgba(78, 205, 196, 0.16)')
    g2.addColorStop(1, 'rgba(78, 205, 196, 0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, width, height)

    // Main Story Card Frame
    drawRoundedRect(ctx, 56, 56, width - 112, height - 112, 46)
    ctx.fillStyle = isDarkSurface ? 'rgba(42, 38, 74, 0.72)' : 'rgba(255, 255, 255, 0.92)'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = isDarkSurface ? 'rgba(157, 141, 241, 0.28)' : 'rgba(59, 53, 97, 0.12)'
    ctx.stroke()
  }

  // 3. Brand Masthead
  drawRoundedRect(ctx, 108, 102, 58, 58, 16)
  ctx.fillStyle = isEditorial ? '#181A19' : isDarkSurface ? '#FAF8F5' : '#1E1B38'
  ctx.fill()
  if (isEditorial) {
    ctx.lineWidth = 2
    ctx.strokeStyle = '#C59B46'
    ctx.stroke()
  }
  ctx.fillStyle = isEditorial ? '#E7C878' : isDarkSurface ? '#1E1B38' : '#FAF8F5'
  ctx.font = '700 32px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♔', 137, 133)

  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '600 30px "Playfair Display", Georgia, serif'
  ctx.fillText('Grandmaster Atelier', 184, 123)
  ctx.fillStyle = inkMuted
  ctx.font = '600 14px "JetBrains Mono", monospace'
  ctx.fillText('POSTER PARTAI EDITORIAL · STUDIO CATUR', 184, 152)

  // Right Pill Badge
  ctx.font = '700 15px "JetBrains Mono", monospace'
  const badgeText = options.badgeLabel.toUpperCase()
  const badgeW = Math.min(310, ctx.measureText(badgeText).width + 44)
  drawRoundedRect(ctx, width - 108 - badgeW, 110, badgeW, 44, 22)
  ctx.fillStyle = isEditorial ? 'rgba(82, 104, 87, 0.2)' : 'rgba(242, 107, 91, 0.18)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = isEditorial ? '#718675' : '#F26B5B'
  ctx.stroke()
  ctx.fillStyle = isEditorial
    ? isDarkSurface
      ? '#B8D4BE'
      : '#3B5240'
    : isDarkSurface
      ? '#FFADA3'
      : '#C94738'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, width - 108 - badgeW / 2, 132)

  // 4. Achievement Title & Subtitle
  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '700 46px "Playfair Display", Georgia, serif'
  const titleLines = wrapTextLines(ctx, options.title, width - 216, 2)
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, 108, 228 + idx * 54)
  })

  ctx.fillStyle = inkMuted
  ctx.font = '500 21px "Plus Jakarta Sans", sans-serif'
  ctx.fillText(options.subtitle.slice(0, 74), 108, 228 + titleLines.length * 54 + 10)

  // Optional Highlighted Move Editorial Ribbon (e.g. "Momen Terbaik: 16. Qb8+!!")
  let boardY = 398
  if (options.highlightSan) {
    const ribbonY = 342
    drawRoundedRect(ctx, 108, ribbonY, width - 216, 46, 14)
    ctx.fillStyle = isDarkSurface ? 'rgba(197, 155, 70, 0.16)' : 'rgba(197, 155, 70, 0.14)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(197, 155, 70, 0.55)'
    ctx.stroke()

    ctx.fillStyle = isDarkSurface ? '#F0D285' : '#8C6A1F'
    ctx.font = '700 18px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labelText = options.highlightLabel
      ? `${options.highlightLabel.toUpperCase()} · ${options.highlightSan}`
      : `MOMEN SOROTAN · ${options.highlightSan}`
    ctx.fillText(labelText, width / 2, ribbonY + 24)
    boardY = 418
  }

  // 5. Centered Live 8x8 Chessboard
  const boardSize = 548
  const boardX = (width - boardSize) / 2
  drawChessBoardPreview(
    ctx,
    options.fen,
    options.orientation ?? 'w',
    options.palette,
    options.pieceSet,
    boardX,
    boardY,
    boardSize,
    isDarkSurface
  )

  // 6. Metric Strip (Akurasi, Streak Harian, Extra)
  const metricY = 1028
  const metrics = [
    {
      label: 'AKURASI',
      value: `${Math.max(0, Math.min(100, Math.round(options.accuracyPercent)))}%`,
      accent: isEditorial ? '#718675' : '#4ECDC4'
    },
    {
      label: 'STREAK HARIAN',
      value: `${options.streakDays} Hari`,
      accent: isEditorial ? '#C59B46' : '#F9C74F'
    },
    {
      label: (options.extraMetricLabel ?? 'GAYA PAPAN').toUpperCase(),
      value: options.extraMetricValue ?? `${options.palette.label}`,
      accent: isEditorial ? '#B85D43' : '#9D8DF1'
    }
  ]

  const gap = 22
  const boxW = (width - 216 - gap * 2) / 3
  const boxH = 128

  metrics.forEach((m, idx) => {
    const bx = 108 + idx * (boxW + gap)
    drawRoundedRect(ctx, bx, metricY, boxW, boxH, 24)
    ctx.fillStyle = cardSurface
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = isDarkSurface ? 'rgba(255, 255, 255, 0.1)' : 'rgba(32, 35, 33, 0.1)'
    ctx.stroke()

    // Accent bar
    drawRoundedRect(ctx, bx + 24, metricY + 22, 36, 6, 3)
    ctx.fillStyle = m.accent
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.fillStyle = inkMuted
    ctx.font = '600 14px "JetBrains Mono", monospace'
    ctx.fillText(m.label, bx + 24, metricY + 52)

    ctx.fillStyle = ink
    ctx.font = '700 32px "Playfair Display", Georgia, serif'
    ctx.fillText(m.value, bx + 24, metricY + 96)
  })

  // 7. Footer Signature
  ctx.textAlign = 'center'
  ctx.fillStyle = inkMuted
  ctx.font = '500 16px "JetBrains Mono", monospace'
  ctx.fillText(
    `Grandmaster Atelier · ${options.pieceSet === 'animal' ? 'Bidak Hewan Pastel' : 'Bidak Klasik Staunton'}`,
    width / 2,
    height - 96
  )

  // Trigger PNG download
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = options.filename ?? 'grandmaster-atelier-prestasi.png'
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch {
    return false
  }
}
