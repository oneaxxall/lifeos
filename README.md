# 🧠 LifeOS — Second Brain & AI Personal Assistant

> **Satu portal untuk semua aspek kehidupan** — Todo, Keuangan, Kesehatan, Keluarga, Spiritual, Bisnis, Networking, Tim, dan lainnya — didukung **AI personal assistant** yang menganalisis data Anda secara privat.

LifeOS adalah aplikasi web pribadi (self-hosted) yang dibangun di atas **Next.js**. Semua data tersimpan **lokal di perangkat Anda** (SQLite) — bukan di cloud pihak ketiga. AI bekerja melalui API provider (DeepSeek / OpenAI / OpenRouter) yang Anda konfigurasi sendiri.

---

## ✨ Fitur

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | **Dashboard** | Beranda: greeting dinamis per jam, Quote of the Day (slider auto-rotate + generate per hari via AI), statistik & sisa uang bulan ini, recent activity lintas fitur |
| 2 | **Knowledge** | Second brain: catatan kaya (rich text editor), kategori & tag, pencarian, memori AI |
| 3 | **Todo** | Kanban drag & drop (backlog → done), filter pencarian/prioritas/area/jatuh tempo, prioritas AI harian, pecah tugas besar, deteksi penundaan |
| 4 | **Finance** | Transaksi masuk/keluar, kategori, ringkasan bulanan + chart, subscription tracker, budget per kategori, analisa pemborosan AI |
| 5 | **Time** | Timer aktivitas, blok waktu, kategori (produktif/netral/buang), insight penggunaan waktu AI |
| 6 | **Activity** | Pencatatan aktivitas manual (deskripsi, start/end, kategori, tags), dashboard ringkasan, filter riwayat |
| 7 | **Pomodoro** | Timer fokus/istirahat (persistent via localStorage, break auto-start), suara Web Audio, statistik harian, **Picture-in-Picture** (kartu identik + theme-aware) |
| 8 | **Financial Planning** | Perencanaan keuangan: **FIRE calculator** (rule of 25, alokasi saham/obligasi/deposito), dana sekolah anak (inflasi pendidikan), tabungan darurat — profil asumsi tersimpan |
| 9 | **Stocks** | **Portofolio** (tampilan Stockbit Complete View: Code/Lot, Invested/Avg, Market/Current, P&L/Gain — input harga seamless), **Avg Down/Up**, **Right Issue (HMETD)**, Lot & Fee, rencana tersimpan per kode saham |
| 10 | **Hutang & Piutang** | Utang-piutang 2 arah, mode **1x bayar / cicilan (anti riba — total auto = per-cicilan × jumlah, tanpa bunga)**, status otomatis (belum/sebagian/lunas), jatuh tempo, aksi bayar/terima |
| 11 | **Health** | Entri kesehatan harian, target, tren, insight AI |
| 12 | **Mental** | Mood tracker, jurnal, deteksi sinyal butuh dukungan |
| 13 | **Sick** | Catatan tidak enak badan, saran AI |
| 14 | **Family** | Curhatan/jurnal keluarga + AI penasehat (empati & langkah kecil; topik sensitif → saran keselamatan) |
| 15 | **Life Story** | 🌳 Pohon kehidupan: biodata (tanggal lahir, nilai, luka masa kecil, pola asuh) → **timeline per stage usia** (zigzag, fase & bulan-tahun per stage) → cerita per stage (RichText) + **AI Teman Curhat** (halaman terpisah, streaming token, riwayat tersimpan per stage) |
| 16 | **Spiritual** | Ritual harian (sholat/quran/dzikir/doa), streak, target khatam, refleksi |
| 17 | **Business** | Ide & proyek bisnis, tahapan (Riset→MVP→Luncur→Tumbuh), rencana eksekusi 30 hari → Todo, prioritas AI |
| 18 | **Networking** | Kontak & relasi profesional, follow-up > 90 hari, saran pesan AI, saran mingguan |
| 19 | **Team** | Anggota tim, catatan 1-on-1, deteksi dini AI (anggota lama tanpa sesi), persiapan meeting |
| 20 | **Insights** | ❤️ Jantung LifeOS: brief harian AI, laporan mingguan + korelasi lintas fitur, tanya jawab natural ("Berapa pengeluaranku bulan ini?") |
| 21 | **Backup & Restore** | Ekspor seluruh data ke file JSON, backup otomatis lokal, restore sekali klik |

**Plus:**
- 🎨 UI cantik (shadcn/ui) — terang & gelap, responsif mobile, font Literata untuk bacaan
- 📱 **PWA installable** — bisa "Install App" dari browser (Android/iOS/desktop)
- 🔐 **Login** — proteksi dengan username/password dari `.env` (tanpa database)
- 🤖 Panel AI **collapsible + lazy load** — AI hanya dipanggil saat Anda membukanya (hemat biaya)
- 💰 **RupiahInput** — komponen input rupiah dengan format titik ribuan otomatis (dipakai di semua fitur keuangan)
- 🗂️ **Menu berkelompok** — Produktivitas (Todo/Time/Activity/Pomodoro) & Keuangan (Finance/Financial Planning/Stocks/Hutang & Piutang)

---

## 🛠️ Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript + Turbopack |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide-react |
| Database | SQLite (`data/lifeos.db`) + Drizzle ORM + better-sqlite3 |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/openai`) — provider-agnostic |
| Editor | react-quill-new (RichText), DOMPurify (sanitasi) |
| Kanban | @dnd-kit |
| Chart | recharts |
| PWA | Web App Manifest + Service Worker |

---

## 🚀 Memulai

### Prasyarat
- **Node.js 20+** (direkomendasikan 22.x)
- **npm** (atau pnpm/yarn/bun)

### 1. Install dependencies

```bash
npm install
```

### 2. Konfigurasi environment

Buat file `.env.local` di root project (jangan pernah di-commit):

```env
# ── AI (opsional — tanpa ini semua insight berjalan mode heuristik/offline) ──
AI_PROVIDER=openai        # openai | deepseek | openrouter
AI_BASE_URL=              # kosongkan untuk default; isi untuk provider relay (mis. https://opencode.ai/zen/go/v1)
AI_API_KEY=sk-xxx         # API key Anda
AI_MODEL=deepseek-v4-flash # model default

# ── Auth login (wajib untuk mengaktifkan halaman login) ──
AUTH_USERNAME=admin
AUTH_PASSWORD=ganti-password-ini
AUTH_SECRET=              # generate: openssl rand -hex 32
```

> 💡 **Tanpa `AI_API_KEY`**: semua fitur AI tetap berjalan dengan **heuristik lokal** (badge "offline") — analisa berbasis aturan sederhana tanpa biaya.
>
> 💡 **Tanpa `AUTH_*`**: halaman login tetap ada, tapi proxy akan menolak semua login. Isi ketiganya untuk mengaktifkan proteksi.

### 3. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — migrasi database **otomatis** berjalan saat pertama kali server dinyalakan.

### 4. Build produksi

```bash
npm run build && npm start
```

---

## 🚀 Deploy ke VPS (Linux)

LifeOS siap diinstall di VPS mana pun (Ubuntu, Debian, Fedora, CentOS, Rocky, Arch, Alpine, openSUSE, dll.) dengan **satu perintah** — `install.sh` menangani semuanya otomatis: deteksi distro → install Docker + Compose → konfigurasi kredensial → build & jalankan.

### Cara 1 — Installer otomatis (disarankan)

```bash
# Langsung dari internet (tanpa clone):
curl -fsSL https://raw.githubusercontent.com/oneaxxall/lifeos/main/install.sh | bash

# Atau dari repo yang sudah di-clone:
./install.sh
```

Installer akan menanyakan:
- **Username & password admin** (login LifeOS)
- **API key AI** (opsional — kosongkan untuk mode offline)
- **Port aplikasi** (default: `6002`)

Selesai — LifeOS berjalan di **`http://<IP_SERVER>:6002`** dengan migrasi database otomatis.

### Cara 2 — Manual (Docker)

```bash
# 1. Install Docker + Compose (sesuai distro), lalu:
mkdir -p ~/lifeos && cd ~/lifeos

# 2. Upload file: Dockerfile, docker-compose.yml, .env.example
# 3. Buat environment:
cp .env.example .env && nano .env   # isi AUTH_USERNAME/PASSWORD/SECRET

# 4. Build & jalankan:
docker compose up -d --build
```

### 🌐 Akses via domain (reverse proxy)

LifeOS **tidak mengikat port 80/443** — aplikasi berjalan di port `6002` (atau port yang Anda pilih). Untuk domain + HTTPS, arahkan reverse proxy apa pun ke port tersebut:

| Reverse proxy | Konfigurasi |
|---------------|-------------|
| **Nginx Proxy Manager** | Proxy Host → `http://localhost:6002` (pilih SSL cert) |
| **Nginx** | `proxy_pass http://127.0.0.1:6002;` |
| **Caddy** | `reverse_proxy 127.0.0.1:6002` |
| **Cloudflare Tunnel** | Service URL → `http://localhost:6002` |

### 🔄 Update aplikasi di VPS

```bash
cd ~/lifeos
git pull                       # jika clone dari repo
docker compose up -d --build   # rebuild image baru
```

> 💾 **Data aman**: SQLite tersimpan di Docker volume (`lifeos-data`) — tidak terhapus saat rebuild. Backup via halaman `/backup` di LifeOS.

---

## 🔐 Login (berbasis .env, tanpa database)

LifeOS diproteksi halaman login sederhana — kredensial disimpan di `.env.local`, bukan di database:

1. Isi `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET` di `.env.local`
2. Semua halaman (kecuali `/login`) otomatis terproteksi oleh **proxy middleware**
3. Session aman: cookie `httpOnly` berisi token HMAC-signed (kedaluwarsa 7 hari)
4. Tombol **Keluar** tersedia di sidebar

Halaman login menampilkan **slider preview fitur + quotes motivasi** di sisi kanan (desktop).

---

## 🤖 Cara Kerja AI

- **Server-side**: semua panggilan AI terjadi di API routes (`src/app/api/**`) — kunci API tidak pernah terekspos ke browser
- **Provider-agnostic**: ganti provider cukup edit `.env.local` (`src/lib/ai/provider.ts`)
- **Lazy & cache**: panel AI hanya memanggil LLM saat Anda **membuka panel** (klik chevron), hasilnya di-cache 15 menit — membuka menu tidak menghabiskan biaya
- **Streaming token**: AI Teman Curhat menampilkan balasan **token real-time** (chunk per chunk) — teks muncul mengetik, bukan loading diam
- **Konteks personal**: Life Story & AI curhat membaca **profil hidup** (nilai, luka masa kecil, pola asuh) + cerita per stage sebagai konteks balasan
- **Riwayat tersimpan**: percakapan curhat disimpan per stage usia di SQLite — bisa dilanjutkan kapan saja
- **Fallback heuristik**: jika API key kosong/gagal, hasilnya tetap muncul (berbasis aturan lokal) dengan label sumber

---

## 💾 Backup & Restore

Halaman **Backup** (`/backup`) menyediakan:

- **Buat backup** — snapshot seluruh data (42 tabel) disimpan ke `data/backups/`
- **Unduh JSON** — ekspor manual untuk disimpan di tempat lain
- **Restore** — upload file JSON backup atau pilih dari riwayat lokal; seluruh data diganti dalam **satu transaksi** (aman — rollback otomatis jika gagal)
- **Riwayat** — daftar backup lokal dengan ukuran & tanggal, bisa dihapus

---

## 🧱 Struktur Project

```
smt-lifeos/
├── src/
│   ├── app/                    # Routes (App Router)
│   │   ├── (dashboard)/        # Halaman berfitur (todo, finance, dll)
│   │   ├── api/                # API routes (data + AI)
│   │   ├── login/              # Halaman login
│   │   └── manifest.ts         # PWA manifest
│   ├── components/
│   │   ├── ui/                 # Komponen shadcn/ui + reusable (CategoryMenu, ConfirmDialog)
│   │   └── {fitur}/            # Komponen per fitur (feature-first)
│   ├── lib/
│   │   ├── db/                 # Schema Drizzle + repo per fitur + backup.ts
│   │   ├── ai/                 # Provider, prompt builder, insight per fitur
│   │   └── auth.ts / auth-edge.ts  # Login & verifikasi session
│   ├── proxy.ts                # Middleware proteksi halaman (Next 16.2)
├── drizzle/                    # Migrasi SQL (0000–0027, 42 tabel)
├── public/
│   ├── icons/                  # Ikon PWA (192/512/maskable/apple-touch)
│   └── sw.js                   # Service worker
├── data/                       # ❗ LOKAL: lifeos.db + backups (gitignored)
├── docs/ planning/ todos/      # ❗ LOKAL: dokumentasi & catatan (gitignored)
├── Dockerfile                  # Build image (multi-stage, untuk VPS)
├── docker-compose.yml          # Orkestrasi app + volume persisten (port 6002)
├── install.sh                  # Installer otomatis untuk semua distro Linux
├── .env.example                # Template environment (VPS)
└── push.sh                     # Commit + push sekali jalan
```

### Pola penting
- **Feature-first**: `src/components/{fitur}/` — komponen fitur tidak saling import
- **Client-safe**: logika yang dipakai komponen client dipisah ke file khusus (tanpa import server/db)
- **Key-remount**: form di-reset via `key` prop (hindari lint set-state-in-effect)
- **Tanpa `window.confirm`**: semua konfirmasi pakai `AlertDialog` (shadcn); alert sukses pakai `sonner`
- **RupiahInput** (`src/components/ui/rupiah-input.tsx`): input rupiah dengan format titik ribuan otomatis — value tetap angka murni, mode `ghost` untuk inline-edit seamless (dipakai harga saham)
- **RichTextEditor** (`src/components/ui/rich-text-editor.tsx`): editor Quill reusable; konten HTML **wajib** lewat `sanitizeHtml()` sebelum render
- **Streaming API**: route chat mengembalikan `ReadableStream` (text/plain) — client baca `response.body.getReader()` untuk token real-time
- **Keyboard-aware mobile**: `interactiveWidget: resizes-content` + hook `visualViewport` agar input chat tidak tertutup keyboard

---

## 📝 Catatan Pengembangan

- **Migrasi**: `npx drizzle-kit generate --name <nama>` → SQL di `drizzle/` → auto-apply saat server start
- **Lint & build**: `npm run lint` dan `npm run build` harus bersih sebelum push
- **Folder lokal** (`data/`, `docs/`, `planning/`, `todos/`, `SOUL.md`, `.env*`) **tidak pernah di-push**
- **Commit**: gunakan `./push.sh "pesan commit"` (sudah mengatur git identity)
- **AI di development**: panggilan LLM nyata terjadi di dev — panel lazy-load membantu menghemat kuota

---

## 🧪 Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server (Turbopack, migrasi auto) |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npx drizzle-kit generate --name x` | Buat migrasi baru |

---

## 📄 Lisensi

Private / personal use. Dibangun sebagai "second brain" pribadi — data Anda, perangkat Anda, kendali Anda. 🔒
