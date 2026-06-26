#!/usr/bin/env bash
#
# Deploy the Calmutopia admin dashboard (SPA) to production.
#
# Flow:
#   1. Build dashboard/ with Vite (same-origin API base — nginx proxies /api/
#      to the node server on 127.0.0.1:3900).
#   2. rsync the build into the nginx web root on the Hetzner box.
#
# This deploys ONLY the dashboard. The backend ships via ./deploy.sh and the
# mobile app via a separate Expo build.
#
# Usage:
#   ./deploy-dashboard.sh
#
# Requirements: sshpass, rsync, node/npm. Credentials read from .env.server
# (ip / User / Password); override with HOST / SSH_USER / SSH_PASS.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

WEB_ROOT="/var/www/calmutopia-admin"   # nginx root for admin.dsfhgjkadf.com
# Same-origin: API_BASE resolves to "" so requests go to /api/... (proxied).
export VITE_API_BASE="/"

ENV_SERVER="$REPO_DIR/.env.server"
HOST="${HOST:-$(grep -i '^ip:' "$ENV_SERVER" | awk '{print $2}')}"
SSH_USER="${SSH_USER:-$(grep -i '^User:' "$ENV_SERVER" | awk '{print $2}')}"
SSH_PASS="${SSH_PASS:-$(grep -i '^Password:' "$ENV_SERVER" | awk '{print $2}')}"

if [[ -z "${HOST}" || -z "${SSH_USER}" || -z "${SSH_PASS}" ]]; then
  echo "✗ Missing host/user/password. Set them in .env.server or via env vars." >&2
  exit 1
fi
command -v sshpass >/dev/null || { echo "✗ sshpass not installed (brew install sshpass)" >&2; exit 1; }

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
export SSHPASS="${SSH_PASS}"

# ── 1. Build ───────────────────────────────────────────────────────────────
echo "→ Building dashboard (VITE_API_BASE=${VITE_API_BASE})..."
cd "$REPO_DIR/dashboard"
if [ ! -d node_modules ]; then
  echo "  installing deps..."
  npm install
fi
npm run build
cd "$REPO_DIR"

# ── 2. Upload ──────────────────────────────────────────────────────────────
echo "→ Deploying to ${SSH_USER}@${HOST}:${WEB_ROOT}..."
# --delete removes stale hashed assets from previous builds.
sshpass -e rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  "$REPO_DIR/dashboard/dist/" "${SSH_USER}@${HOST}:${WEB_ROOT}/"

echo "→ Reloading nginx..."
sshpass -e ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HOST}" "nginx -t && systemctl reload nginx" || \
  echo "  (nginx reload skipped/failed — static files are already in place)"

echo "✓ Dashboard deployed → https://admin.dsfhgjkadf.com"
