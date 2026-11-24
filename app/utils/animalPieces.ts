import type { Color, PieceSymbol } from 'chess.js'

export interface AnimalPieceMeta {
  color: Color
  piece: PieceSymbol
  animalName: string
  pieceLabel: string
  paletteHint: string
  accentBg: string
}

export const ANIMAL_PIECES_META: Record<Color, Record<PieceSymbol, AnimalPieceMeta>> = {
  w: {
    k: {
      color: 'w',
      piece: 'k',
      animalName: 'Singa',
      pieceLabel: 'Raja',
      paletteHint: 'Surai merah hangat',
      accentBg: '#FCE3A6'
    },
    q: {
      color: 'w',
      piece: 'q',
      animalName: 'Kelinci',
      pieceLabel: 'Menteri',
      paletteHint: 'Pastel pink lembut',
      accentBg: '#F9D6E0'
    },
    r: {
      color: 'w',
      piece: 'r',
      animalName: 'Gajah',
      pieceLabel: 'Benteng',
      paletteHint: 'Abu-abu lembut',
      accentBg: '#D4DCE4'
    },
    b: {
      color: 'w',
      piece: 'b',
      animalName: 'Jerapah',
      pieceLabel: 'Gajah',
      paletteHint: 'Kuning karamel',
      accentBg: '#FCE28D'
    },
    n: {
      color: 'w',
      piece: 'n',
      animalName: 'Panda Merah',
      pieceLabel: 'Kuda',
      paletteHint: 'Oranye hangat',
      accentBg: '#F6B185'
    },
    p: {
      color: 'w',
      piece: 'p',
      animalName: 'Anak Ayam',
      pieceLabel: 'Pion',
      paletteHint: 'Kuning pastel',
      accentBg: '#FFE88A'
    }
  },
  b: {
    k: {
      color: 'b',
      piece: 'k',
      animalName: 'Harimau',
      pieceLabel: 'Raja',
      paletteHint: 'Loreng dengan tanda 王',
      accentBg: '#E69B4F'
    },
    q: {
      color: 'b',
      piece: 'q',
      animalName: 'Kucing',
      pieceLabel: 'Menteri',
      paletteHint: 'Abu-abu kecokelatan',
      accentBg: '#B2A398'
    },
    r: {
      color: 'b',
      piece: 'r',
      animalName: 'Beruang',
      pieceLabel: 'Benteng',
      paletteHint: 'Cokelat hangat',
      accentBg: '#9B7056'
    },
    b: {
      color: 'b',
      piece: 'b',
      animalName: 'Penguin',
      pieceLabel: 'Gajah',
      paletteHint: 'Hitam putih',
      accentBg: '#3A4150'
    },
    n: {
      color: 'b',
      piece: 'n',
      animalName: 'Koala',
      pieceLabel: 'Kuda',
      paletteHint: 'Biru keabu-abuan',
      accentBg: '#8EA2B8'
    },
    p: {
      color: 'b',
      piece: 'p',
      animalName: 'Babi',
      pieceLabel: 'Pion',
      paletteHint: 'Pink pastel',
      accentBg: '#F3B0C0'
    }
  }
}

export function getAnimalPieceMeta(color: Color, piece: PieceSymbol): AnimalPieceMeta {
  return ANIMAL_PIECES_META[color][piece]
}
