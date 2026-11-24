# catur-atelier

**Grandmaster Atelier** — Studio interaktif pelatih repertoar pembukaan, taktik babak akhir, Sinema Taktik, arena pertandingan Bot (250–3200 ELO) / 2 Pemain, dan Sandbox PGN/FEN dalam Bahasa Indonesia dengan sinkronisasi database **TiDB Cloud Serverless**.

## Fitur Utama
- **Pelatih Repertoar Pembukaan & Babak Akhir**: Mode Belajar & Ujian, petunjuk langkah, peta kontrol pusat, dan *Mistake Queue* (Latihan Ulang Kesalahan).
- **Sinema Taktik**: Kurasi partai taktik Grandmaster dengan video YouTube *lazy-load*, demo papan interaktif, dan integrasi langsung ke Sandbox.
- **Arena Main Bot & 2 Pemain**: 5 tingkatan bot (250–2850 ELO), Mesin Kustom hingga 3200 ELO, laporan pasca-pertandingan (*Advantage Graph*), dan ekspor kartu hasil PNG.
- **Sinkronisasi TiDB Cloud**: Penyimpanan cloud otomatis untuk progres latihan, pembukaan kustom, *Mistake Queue*, preferensi tema, dan arsip riwayat pertandingan dengan fallback `localStorage`.

## Setup Lokal

1. Instal dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env` dan isi kredensial TiDB Cloud Anda:
   ```bash
   cp .env.example .env
   ```
3. Inisialisasi database dan tabel di TiDB Cloud:
   ```bash
   npm run db:init
   ```
4. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
