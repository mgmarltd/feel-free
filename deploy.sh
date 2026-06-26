#!/usr/bin/env bash
#
# Deploy the Calmutopia server to production via GitHub.
#
# Flow:
#   1. Push the current branch's commits to GitHub (origin/main).
#   2. SSH to the Hetzner box, pull origin/main into the build clone, and
#      sync the server/ subfolder into the live app dir — preserving the
#      production .env, data/ (real user store) and node_modules.
#   3. Restart the feelfree-api PM2 process.
#
# This deploys ONLY the backend (server/). The Expo/React Native app points
# at the live server and ships its own UI changes via a separate app build.
#
# Usage:
#   ./deploy.sh                 # push main + deploy
#   SKIP_PUSH=1 ./deploy.sh     # deploy whatever is already on origin/main
#
# Requirements: sshpass, rsync, ssh, git. Credentials are read from
# .env.server (ip / User / Password). Override with HOST / SSH_USER / SSH_PASS.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# ── Config ───────────────────────────────────────────────────────────────
BRANCH="main"
REMOTE_SRC="/opt/feel-free-src"   # git clone on the server (source of truth)
LIVE_DIR="/opt/feelfree-api"      # what PM2 runs
PM2_APP="feelfree-api"
REPO_URL="https://github.com/mgmarltd/feel-free.git"

# Credentials: env overrides, else parsed from .env.server
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
run_remote() { sshpass -e ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HOST}" "$@"; }

# ── 1. Push to GitHub ────────────────────────────────────────────────────
if [[ "${SKIP_PUSH:-0}" != "1" ]]; then
  echo "→ Pushing ${BRANCH} to GitHub..."
  git push origin "${BRANCH}"
else
  echo "→ SKIP_PUSH=1, deploying whatever is on origin/${BRANCH}"
fi

# ── 2 & 3. Pull on server, sync, restart ─────────────────────────────────
echo "→ Deploying to ${SSH_USER}@${HOST}..."
export SSHPASS="${SSH_PASS}"
run_remote "bash -s" <<REMOTE
set -euo pipefail
if [ -d "${REMOTE_SRC}/.git" ]; then
  cd "${REMOTE_SRC}" && GIT_TERMINAL_PROMPT=0 git fetch --quiet origin && git reset --hard "origin/${BRANCH}"
else
  rm -rf "${REMOTE_SRC}" && GIT_TERMINAL_PROMPT=0 git clone --quiet "${REPO_URL}" "${REMOTE_SRC}" && cd "${REMOTE_SRC}"
fi
echo "  HEAD: \$(git rev-parse --short HEAD) \$(git log -1 --pretty=%s)"

# Sync backend code only. Preserve prod secrets, user data, and deps.
rsync -a --exclude .env --exclude data --exclude node_modules --exclude dist \
  "${REMOTE_SRC}/server/" "${LIVE_DIR}/"

# Install deps only if package.json changed since last install.
cd "${LIVE_DIR}"
if [ package.json -nt node_modules ] 2>/dev/null; then
  echo "  package.json changed -> npm install"
  npm install --omit=dev --no-audit --no-fund
fi

pm2 restart "${PM2_APP}" --update-env
echo "  ✓ ${PM2_APP} restarted"
REMOTE

# ── Verify ───────────────────────────────────────────────────────────────
echo "→ Health check..."
code="$(curl -s -m 15 -o /dev/null -w '%{http_code}' "http://${HOST}:3900/" || true)"
echo "  Server responded: HTTP ${code} (404 on / is expected — no root route)"
echo "✓ Deploy complete."
