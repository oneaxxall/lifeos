#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# LifeOS — Pull & Update Script
#
# Cara pakai:
#   ./update.sh            # pull source terbaru + rebuild + restart
#
# Yang dilakukan:
#   1. git pull (ambil source terbaru dari origin/main)
#   2. Rebuild image Docker (dengan cache, cepat jika tanpa perubahan)
#   3. Restart container tanpa menyentuh data (volume aman)
# ═══════════════════════════════════════════════════════════
set -euo pipefail

C_RESET="\033[0m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"; C_RED="\033[31m"; C_CYAN="\033[36m"
info()  { echo -e "${C_CYAN}[INFO]${C_RESET} $*"; }
ok()    { echo -e "${C_GREEN}[OK]${C_RESET} $*"; }
warn()  { echo -e "${C_YELLOW}[WARN]${C_RESET} $*"; }
fail()  { echo -e "${C_RED}[GAGAL]${C_RESET} $*"; exit 1; }

# ── Pastikan di direktori repo ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f docker-compose.yml ]; then
  fail "docker-compose.yml tidak ditemukan di $SCRIPT_DIR"
fi

# ── 1. Git pull (stash dulu kalau ada perubahan lokal) ──
info "Mengambil source terbaru dari origin/main…"

# Simpan perubahan lokal (mis. package.json yang diubah npm approve-scripts)
if ! git diff --quiet; then
  warn "Ada perubahan lokal — di-stash dulu agar pull tidak gagal."
  git stash push -m "auto-stash oleh update.sh" >/dev/null
  STASHED=1
else
  STASHED=0
fi

if git pull --ff-only 2>&1 | grep -q "Already up to date"; then
  warn "Repo sudah up-to-date (tidak ada perubahan source)."
else
  ok "Source terbaru berhasil di-pull."
fi

# Kembalikan perubahan lokal (aman jika tidak konflik dengan file yang di-pull)
if [ "$STASHED" = "1" ]; then
  if git stash pop 2>/dev/null; then
    ok "Perubahan lokal dikembalikan."
  else
    warn "Stash pop gagal (kemungkinan konflik). Cek: git stash list"
  fi
fi

# ── 2. Rebuild & restart ──
info "Rebuild image Docker & restart container…"
if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  sudo docker compose up -d --build
else
  docker compose up -d --build
fi

# ── 3. Verifikasi (tunggu sampai healthy, max 60 detik) ──
DOCKER="docker"
if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  DOCKER="sudo docker"
fi

info "Menunggu container healthy…"
STATUS="starting"
for i in $(seq 1 20); do
  sleep 3
  STATUS=$($DOCKER inspect --format '{{.State.Health.Status}}' lifeos-app 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then
    break
  fi
done

echo
if [ "$STATUS" = "healthy" ]; then
  ok "Update selesai — LifeOS berjalan (healthy)."
  echo
  info "Akses: http://<IP_SERVER>:6002"
else
  warn "Container status: $STATUS (belum healthy — cek dengan: docker logs lifeos-app)"
fi
