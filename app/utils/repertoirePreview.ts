import { Chess, type Square } from 'chess.js'
import type { EndgameScenario, OpeningLine, RepertoireModule } from '~/utils/chessData'

export interface PreviewMoveMotion {
  from: Square
  to: Square
  afterFen: string
}

export interface BoardPreviewResult {
  fen: string | null
  highlights: string[]
  notationSnippet: string
  hoverMove: PreviewMoveMotion | null
}

// Each opening stops 1 ply before its signature move, so hovering smoothly plays that exact signature move!
const SIGNATURE_PREVIEW_CONFIG: Record<string, { ply?: number; squares: string[] }> = {
  'ruy-lopez-morphy': { ply: 5, squares: ['b5', 'c6', 'e5'] }, // Hover plays 3. Bb5
  'sicilian-najdorf': { ply: 10, squares: ['a6', 'd4', 'e5'] }, // Hover plays 5...a6
  'queens-gambit-declined': { ply: 7, squares: ['d4', 'd5', 'c4'] }, // Hover plays 4. cxd5
  'caro-kann-classical': { ply: 8, squares: ['f5', 'e4', 'd5'] }, // Hover plays 4...Bf5
  'italian-game-giuoco-piano': { ply: 5, squares: ['c4', 'f7', 'e4'] }, // Hover plays 3. Bc4
  'london-system': { ply: 3, squares: ['f4', 'd4', 'e5'] }, // Hover plays 2. Bf4
  'french-defense-classical': { ply: 6, squares: ['c5', 'd4', 'e5'] }, // Hover plays 3...c5
  'kings-indian-defense': { ply: 12, squares: ['g7', 'e5', 'd4'] }, // Hover plays 6...e5
  'endgame-lucena-philidor': { squares: ['b7', 'd1', 'd4'] }, // Hover plays 1. Rd1+
  'endgame-king-pawn-opposition': { squares: ['d6', 'e6', 'f6'] }, // Hover plays 1. Kd6
  'endgame-basic-checkmates': { squares: ['d6', 'e8', 'e3'] }, // Hover plays 1. Qd6
  'endgame-pawn-breakthrough': { squares: ['g6', 'f5', 'h5'] } // Hover plays 1. g6!!
}

export function formatOpeningLineSnippet(line: OpeningLine, maxPlies = 10): string {
  const parts: string[] = []
  const limit = Math.min(line.moves.length, maxPlies)
  for (let i = 0; i < limit; i++) {
    const move = line.moves[i]
    if (!move) break
    if (i % 2 === 0) {
      parts.push(`${Math.floor(i / 2) + 1}. ${move.san}`)
    } else {
      parts.push(move.san)
    }
  }
  if (line.moves.length > limit) {
    parts.push('…')
  }
  return parts.join(' ')
}

export function computeOpeningLinePreview(
  line: OpeningLine | undefined,
  startingFen?: string,
  targetPlyOverride?: number,
  configuredSquares?: string[]
): BoardPreviewResult {
  if (!line || line.moves.length === 0) {
    if (startingFen) {
      try {
        const g = new Chess(startingFen)
        return { fen: g.fen(), highlights: configuredSquares ?? [], notationSnippet: '', hoverMove: null }
      } catch {
        return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }
      }
    }
    return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }
  }

  let g: Chess
  try {
    g = startingFen ? new Chess(startingFen) : new Chess()
  } catch {
    return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }
  }

  // Play up to (targetPly - 1) for the resting position, and animate the signature targetPly move on hover
  const desiredPly = Math.min(targetPlyOverride ?? Math.min(6, line.moves.length), line.moves.length)
  const restPlies = Math.max(0, desiredPly - 1)

  for (let i = 0; i < restPlies; i++) {
    const node = line.moves[i]
    if (!node) break
    try {
      g.move(node.san)
    } catch {
      break
    }
  }

  const baseFen = g.fen()
  let hoverMove: PreviewMoveMotion | null = null
  let fallbackHighlights: string[] = []

  const signatureNode = line.moves[restPlies]
  if (signatureNode) {
    try {
      const m = g.move(signatureNode.san)
      hoverMove = {
        from: m.from,
        to: m.to,
        afterFen: g.fen()
      }
      fallbackHighlights = [m.from, m.to]
    } catch {
      hoverMove = null
    }
  }

  return {
    fen: baseFen,
    highlights: configuredSquares ?? fallbackHighlights,
    notationSnippet: formatOpeningLineSnippet(line, 12),
    hoverMove
  }
}

export function computeScenarioPreview(
  scenario: EndgameScenario | undefined,
  configuredSquares?: string[]
): BoardPreviewResult {
  if (!scenario?.fen) {
    return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }
  }
  try {
    const g = new Chess(scenario.fen)
    const baseFen = g.fen()
    let hoverMove: PreviewMoveMotion | null = null
    const firstRec = scenario.recommendedFirstMoves[0]
    if (firstRec) {
      try {
        const m = g.move(firstRec)
        hoverMove = {
          from: m.from,
          to: m.to,
          afterFen: g.fen()
        }
      } catch {
        hoverMove = null
      }
    }

    return {
      fen: baseFen,
      highlights: configuredSquares ?? (hoverMove ? [hoverMove.from, hoverMove.to] : []),
      notationSnippet: scenario.recommendedFirstMoves.length
        ? `Ide kunci: ${scenario.recommendedFirstMoves.join(' / ')}`
        : '',
      hoverMove
    }
  } catch {
    return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }
  }
}

export function getModulePreview(mod: RepertoireModule): BoardPreviewResult {
  const cfg = SIGNATURE_PREVIEW_CONFIG[mod.id]
  if (mod.category === 'endgame') {
    return computeScenarioPreview(mod.scenarios[0], cfg?.squares)
  }
  return computeOpeningLinePreview(mod.lines[0], mod.startingFen, cfg?.ply, cfg?.squares)
}
