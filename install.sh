#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# LifeOS — Installer untuk semua distro Linux (VPS/rumahan)
#
# Cara pakai:
#   # Dari repo yang sudah di-clone:
#   ./install.sh
#
#   # Tanpa clone (curl langsung):
#   curl -fsSL https://raw.githubusercontent.com/oneaxxall/lifeos/main/install.sh | bash
#
# Mendukung: Debian, Ubuntu, Linux Mint, Fedora, RHEL, CentOS, Rocky,
#            AlmaLinux, Arch, Manjaro, Alpine, openSUSE, dan turunannya.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Warna output ──
C_RESET="\033[0m"; C_BOLD="\033[1m"
C_GREEN="\033[32m"; C_YELLOW="\033[33m"; C_RED="\033[31m"; C_CYAN="\033[36m"
info()  { echo -e "${C_CYAN}[INFO]${C_RESET} $*"; }
ok()    { echo -e "${C_GREEN}[OK]${C_RESET} $*"; }
warn()  { echo -e "${C_YELLOW}[WARN]${C_RESET} $*"; }
fail()  { echo -e "${C_RED}[GAGAL]${C_RESET} $*"; exit 1; }

# ── Deteksi root / sudo ──
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    warn "Menjalankan ulang dengan sudo…"
    exec sudo bash "$0" "$@"
  else
    fail "Jalankan sebagai root (sudo su) atau install sudo terlebih dahulu."
  fi
fi

# ── Deteksi distro & package manager ──
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="$ID"
    DISTRO_NAME="$NAME"
    DISTRO_LIKE="${ID_LIKE:-}"
  elif [ -f /etc/redhat-release ]; then
    DISTRO_ID="rhel"; DISTRO_NAME="RHEL"; DISTRO_LIKE=""
  else
    DISTRO_ID="unknown"; DISTRO_NAME="Unknown"; DISTRO_LIKE=""
  fi
}
detect_pkgmgr() {
  if   command -v apt-get >/dev/null 2>&1; then PKG="apt"
  elif command -v dnf     >/dev/null 2>&1; then PKG="dnf"
  elif command -v yum     >/dev/null 2>&1; then PKG="yum"
  elif command -v pacman  >/dev/null 2>&1; then PKG="pacman"
  elif command -v apk     >/dev/null 2>&1; then PKG="apk"
  elif command -v zypper  >/dev/null 2>&1; then PKG="zypper"
  else PKG="none"; fi
}
detect_distro; detect_pkgmgr
ok "Distro terdeteksi: ${DISTRO_NAME:-$DISTRO_ID} (package manager: $PKG)"

# ── Banner ──
echo
echo -e "${C_BOLD}${C_GREEN}  ██╗     ██╗███████╗███████╗ ██████╗ ███████╗${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}  ██║     ██║██╔════╝██╔════╝██╔═══██╗██╔════╝${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}  ██║     ██║█████╗  █████╗  ██║   ██║███████╗${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}  ██║     ██║██╔══╝  ██╔══╝  ██║   ██║╚════██║${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}  ███████╗██║██║     ███████╗╚██████╔╝███████║${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}  ╚══════╝╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚══════╝${C_RESET}"
echo -e "${C_BOLD}      Installer — Second Brain & AI Personal Assistant${C_RESET}\n"

# ── Lokasi install ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/docker-compose.yml" ] && [ -f "$SCRIPT_DIR/Dockerfile" ]; then
  APP_DIR="$SCRIPT_DIR"
  info "Ditemukan repo LifeOS di: $APP_DIR"
else
  APP_DIR="/opt/lifeos"
  if [ ! -d "$APP_DIR" ]; then
    info "Clone repo LifeOS ke $APP_DIR …"
    command -v git >/dev/null 2>&1 || { apt-get install -y git >/dev/null 2>&1 || dnf install -y git >/dev/null 2>&1 || apk add git >/dev/null 2>&1 || fail "Git tidak tersedia."; }
    git clone --depth 1 https://github.com/oneaxxall/lifeos.git "$APP_DIR" || fail "Gagal clone repo."
  else
    info "Repo sudah ada di $APP_DIR — update…"
    git -C "$APP_DIR" pull --ff-only || warn "Gagal update (lanjut dengan versi lama)."
  fi
fi
cd "$APP_DIR"

# ── Install Docker + Compose ──
install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker + Compose sudah terinstall."
    return
  fi
  info "Menginstall Docker + Docker Compose ($PKG)…"
  case "$PKG" in
    apt)
      apt-get update -y
      apt-get install -y ca-certificates curl
      # Coba repo resmi Docker (lebih baru), fallback ke paket distro
      if ! curl -fsSL https://get.docker.com | sh; then
        warn "Repo resmi gagal — pakai paket distro."
        apt-get install -y docker.io docker-compose-v2
      fi
      ;;
    dnf|yum)
      if ! curl -fsSL https://get.docker.com | sh; then
        warn "Repo resmi gagal — pakai paket distro."
        dnf install -y docker docker-compose-plugin || yum install -y docker docker-compose-plugin
      fi
      ;;
    pacman)
      pacman -Sy --noconfirm docker docker-compose
      ;;
    apk)
      apk add --no-cache docker docker-compose
      # Alpine pakai openrc (bukan systemd) — jika openrc ada, daftarkan service
      if command -v rc-update >/dev/null 2>&1 && command -v rc-service >/dev/null 2>&1; then
        rc-update add docker default >/dev/null 2>&1 || true
        rc-service docker start >/dev/null 2>&1 || true
      fi
      ;;
    zypper)
      zypper --non-interactive install docker docker-compose-plugin
      ;;
    *)
      fail "Package manager '$PKG' belum didukung — install Docker manual lalu jalankan ulang."
      ;;
  esac

  # Aktifkan service (systemd atau openrc)
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now docker >/dev/null 2>&1 || true
    systemctl start docker >/dev/null 2>&1 || true
  fi
  command -v docker >/dev/null 2>&1 || fail "Docker gagal terinstall."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose (plugin) belum ada."
  ok "Docker $(docker --version | awk '{print $3}') + Compose siap."
}
install_docker

# ── Konfigurasi .env ──
setup_env() {
  [ -f .env ] && { info ".env sudah ada — dibiarkan."; return; }
  [ -f .env.example ] || fail ".env.example tidak ditemukan di $APP_DIR."
  cp .env.example .env
  info "Konfigurasi kredensial login LifeOS…"
  read -rp "  Username admin [$([ -n "${AUTH_USERNAME:-}" ] && echo "$AUTH_USERNAME" || echo admin)]: " _user
  AUTH_USERNAME="${_user:-${AUTH_USERNAME:-admin}}"
  while :; do
    read -rsp "  Password admin (min 8 karakter): " _pass; echo
    [ "${#_pass}" -ge 8 ] && break
    warn "Password terlalu pendek — minimal 8 karakter."
  done
  AUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  sed -i "s|^AUTH_USERNAME=.*|AUTH_USERNAME=$AUTH_USERNAME|" .env
  sed -i "s|^AUTH_PASSWORD=.*|AUTH_PASSWORD=$_pass|" .env
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$AUTH_SECRET|" .env
  # AI opsional
  read -rp "  API key AI (kosongkan untuk mode offline): " _aikey
  if [ -n "$_aikey" ]; then
    read -rp "  Base URL AI [kosongkan untuk default]: " _aiurl
    read -rp "  Model AI [deepseek-v4-flash]: " _aimodel
    sed -i "s|^AI_API_KEY=.*|AI_API_KEY=$_aikey|" .env
    [ -n "$_aiurl" ] && sed -i "s|^AI_BASE_URL=.*|AI_BASE_URL=$_aiurl|" .env
    sed -i "s|^AI_MODEL=.*|AI_MODEL=${_aimodel:-deepseek-v4-flash}|" .env
  fi
  chmod 600 .env
  ok ".env dibuat (kredensial aman, mode 600)."
}
setup_env

# ── Port default ──
APP_PORT="6002"
read -rp "  Port aplikasi [$APP_PORT]: " _port
APP_PORT="${_port:-$APP_PORT}"
case "$APP_PORT" in
  ''|*[!0-9]*) fail "Port harus angka." ;;
esac
# Sesuaikan port di docker-compose.yml ("6002:3000" → "PORT:3000")
sed -i "s|^\s*- \".*:3000\"\s*$|      - \"$APP_PORT:3000\"|" docker-compose.yml
ok "Port aplikasi: $APP_PORT"

# ── Firewall (jika aktif) ──
setup_firewall() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow "$APP_PORT/tcp" >/dev/null 2>&1
    ok "Firewall ufw: port $APP_PORT diizinkan."
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    firewall-cmd --permanent --add-port="$APP_PORT/tcp" >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    ok "Firewall firewalld: port $APP_PORT diizinkan."
  else
    info "Firewall tidak terdeteksi aktif — pastikan port $APP_PORT terbuka di panel VPS."
  fi
}
setup_firewall

# ── Build & jalankan ──
info "Membangun image & menjalankan LifeOS (pertama kali butuh beberapa menit)…"
docker compose up -d --build

# ── Health check ──
info "Menunggu aplikasi siap…"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/login" 2>/dev/null; then
    break
  fi
  sleep 3
  [ "$i" -eq 30 ] && warn "Aplikasi belum merespons — cek: docker compose logs app"
done

# ── Ringkasan ──
echo
echo -e "${C_GREEN}${C_BOLD}══════════════════════════════════════════════════════════${C_RESET}"
echo -e "${C_GREEN}${C_BOLD}  ✅ LifeOS berhasil diinstall!${C_RESET}"
echo -e "${C_GREEN}${C_BOLD}══════════════════════════════════════════════════════════${C_RESET}"
echo -e "  🌐 Buka:  ${C_BOLD}http://<IP_SERVER>:$APP_PORT${C_RESET}"
echo -e "  👤 Login: ${C_BOLD}$AUTH_USERNAME${C_RESET} / (password yang tadi dibuat)"
echo
echo "  🔗 Mau pakai domain? Arahkan reverse proxy ke port $APP_PORT:"
echo "     - Nginx Proxy Manager (NPM): proxy host → http://localhost:$APP_PORT"
echo "     - Nginx:  proxy_pass http://127.0.0.1:$APP_PORT;"
echo "     - Caddy:  reverse_proxy 127.0.0.1:$APP_PORT"
echo
echo "  Perintah berguna:"
echo "    docker compose logs -f app   # lihat log"
echo "    docker compose up -d --build # update/rebuild"
echo "    docker compose down          # stop"
echo "    docker compose down -v       # stop + HAPUS SEMUA DATA (hati-hati!)"
echo
echo "  💾 Backup data: buka halaman /backup di LifeOS, atau:"
echo "     docker run --rm -v lifeos_lifeos-data:/data -v \$(pwd):/backup alpine cp -r /data /backup/lifeos-data-backup"
echo
echo -e "${C_YELLOW}Terima kasih memakai LifeOS! 🔒 Data Anda 100% di server Anda.${C_RESET}"
