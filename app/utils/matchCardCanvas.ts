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
  palette: BoardPalette
  pieceSet: PieceSetKey
  theme?: 'cosmic' | 'cream'
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

  const isCosmic = (options.theme ?? 'cosmic') === 'cosmic'
  const bg = isCosmic ? '#1E1B38' : '#FAF8F5'
  const cardSurface = isCosmic ? '#2A264A' : '#FFFFFF'
  const ink = isCosmic ? '#FAF8F5' : '#1E1B38'
  const inkMuted = isCosmic ? '#C4C0DC' : '#5A5673'

  // 1. Canvas Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Soft nebula radial glows
  const g1 = ctx.createRadialGradient(920, 140, 20, 920, 140, 480)
  g1.addColorStop(0, isCosmic ? 'rgba(157, 141, 241, 0.34)' : 'rgba(157, 141, 241, 0.2)')
  g1.addColorStop(1, 'rgba(157, 141, 241, 0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, width, height)

  const g2 = ctx.createRadialGradient(140, 1180, 20, 140, 1180, 460)
  g2.addColorStop(0, isCosmic ? 'rgba(78, 205, 196, 0.24)' : 'rgba(78, 205, 196, 0.16)')
  g2.addColorStop(1, 'rgba(78, 205, 196, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, width, height)

  // Decorative cosmic orbit arcs
  ctx.save()
  ctx.strokeStyle = isCosmic ? 'rgba(157, 141, 241, 0.18)' : 'rgba(59, 53, 97, 0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(910, 170, 260, 110, -0.35, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = isCosmic ? 'rgba(78, 205, 196, 0.16)' : 'rgba(78, 205, 196, 0.2)'
  ctx.beginPath()
  ctx.ellipse(150, 1210, 280, 95, 0.32, 0, Math.PI * 2)
  ctx.stroke()

  // Scattered starlight specks
  const stars = [
    [95, 92, 3, '#F9C74F'],
    [220, 165, 2.2, '#4ECDC4'],
    [820, 88, 3.5, '#F9C74F'],
    [980, 250, 2.6, '#FAF8F5'],
    [105, 760, 2.4, '#9D8DF1'],
    [975, 860, 3.2, '#F26B5B'],
    [920, 1240, 2.8, '#F9C74F'],
    [180, 1280, 2.2, '#4ECDC4']
  ] as const
  for (const [sx, sy, sr, sc] of stars) {
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    ctx.fillStyle = sc
    ctx.fill()
  }
  ctx.restore()

  // 2. Main Story Card Frame
  drawRoundedRect(ctx, 56, 56, width - 112, height - 112, 46)
  ctx.fillStyle = isCosmic ? 'rgba(42, 38, 74, 0.72)' : 'rgba(255, 255, 255, 0.92)'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = isCosmic ? 'rgba(157, 141, 241, 0.28)' : 'rgba(59, 53, 97, 0.12)'
  ctx.stroke()

  // 3. Brand Masthead
  drawRoundedRect(ctx, 108, 108, 56, 56, 18)
  ctx.fillStyle = isCosmic ? '#FAF8F5' : '#1E1B38'
  ctx.fill()
  ctx.fillStyle = isCosmic ? '#1E1B38' : '#FAF8F5'
  ctx.font = '700 32px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♔', 136, 138)

  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '600 30px "Playfair Display", Georgia, serif'
  ctx.fillText('Grandmaster Atelier', 184, 127)
  ctx.fillStyle = inkMuted
  ctx.font = '600 15px "JetBrains Mono", monospace'
  ctx.fillText('STUDIO REPERTOAR & BABAK AKHIR', 184, 156)

  // Right Pill Badge
  ctx.font = '700 16px "JetBrains Mono", monospace'
  const badgeText = options.badgeLabel.toUpperCase()
  const badgeW = Math.min(300, ctx.measureText(badgeText).width + 44)
  drawRoundedRect(ctx, width - 108 - badgeW, 114, badgeW, 44, 22)
  ctx.fillStyle = 'rgba(242, 107, 91, 0.18)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#F26B5B'
  ctx.stroke()
  ctx.fillStyle = isCosmic ? '#FFADA3' : '#C94738'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, width - 108 - badgeW / 2, 136)

  // 4. Achievement Title & Subtitle
  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '700 48px "Playfair Display", Georgia, serif'
  const titleLines = wrapTextLines(ctx, options.title, width - 216, 2)
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, 108, 240 + idx * 58)
  })

  ctx.fillStyle = inkMuted
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillText(options.subtitle.slice(0, 74), 108, 240 + titleLines.length * 58 + 16)

  // 5. Centered Live 8x8 Chessboard
  const boardSize = 560
  const boardX = (width - boardSize) / 2
  const boardY = 415
  drawChessBoardPreview(
    ctx,
    options.fen,
    options.orientation ?? 'w',
    options.palette,
    options.pieceSet,
    boardX,
    boardY,
    boardSize,
    isCosmic
  )

  // 6. Metric Strip (Akurasi, Streak Harian, Extra)
  const metricY = 1040
  const metrics = [
    {
      label: 'AKURASI',
      value: `${Math.max(0, Math.min(100, Math.round(options.accuracyPercent)))}%`,
      accent: '#4ECDC4'
    },
    {
      label: 'STREAK HARIAN',
      value: `${options.streakDays} Hari`,
      accent: '#F9C74F'
    },
    {
      label: (options.extraMetricLabel ?? 'GAYA PAPAN').toUpperCase(),
      value: options.extraMetricValue ?? `${options.palette.label}`,
      accent: '#9D8DF1'
    }
  ]

  const gap = 22
  const boxW = (width - 216 - gap * 2) / 3
  const boxH = 128

  metrics.forEach((m, idx) => {
    const bx = 108 + idx * (boxW + gap)
    drawRoundedRect(ctx, bx, metricY, boxW, boxH, 26)
    ctx.fillStyle = cardSurface
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = isCosmic ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 53, 97, 0.1)'
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
  ctx.font = '500 17px "JetBrains Mono", monospace'
  ctx.fillText(
    `Grandmaster Atelier · Set Bidak ${options.pieceSet === 'animal' ? 'Hewan Pastel' : 'Klasik Staunton'}`,
    width / 2,
    height - 100
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
