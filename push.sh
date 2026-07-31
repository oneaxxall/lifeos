#!/usr/bin/env bash
#
# push.sh — git add + commit + push sekali jalan
# Pemakaian:
#   ./push.sh "pesan commit"        → commit + push ke branch aktif
#   ./push.sh                       → pakai pesan default (waktu)
#   ./push.sh "pesan" nama-branch   → push ke branch tertentu
#
set -euo pipefail

# ── Warna output ─────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✘${NC} $1"; exit 1; }

# ── Konfigurasi ──────────────────────────────────────────
BRANCH="${2:-$(git branch --show-current)}"
MSG="${1:-chore: update $(date '+%Y-%m-%d %H:%M')}"

# ── Cek repo & remote ────────────────────────────────────
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Bukan direktori git."
git remote get-url origin >/dev/null 2>&1 || warn "Remote 'origin' tidak ada — push akan gagal."

# ── Cek perubahan ────────────────────────────────────────
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  warn "Tidak ada perubahan untuk di-commit."
  exit 0
fi

# ── Cek email author (biar tidak kena aturan GitHub) ─────
if [ -z "$(git config user.email)" ]; then
  warn "git user.email belum di-set. Set dulu:"
  echo "    git config user.email \"email@example.com\""
fi

# ── Jalan ────────────────────────────────────────────────
echo "── Menambahkan semua perubahan (docs/planning/todos otomatis diabaikan) ──"
git add -A

echo "── Commit ──"
git commit -m "$MSG"

echo "── Push ke origin/$BRANCH ──"
git push origin "$BRANCH"

ok "Selesai! '$MSG' sudah di-push ke $BRANCH."
