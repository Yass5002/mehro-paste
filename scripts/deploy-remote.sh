#!/usr/bin/env bash
# Runs on the VPS. Swaps in a release built by GitHub Actions, restarts pm2,
# and rolls back automatically if the app does not come up.
# Usage: deploy-remote.sh <git-sha>
set -euo pipefail

SHA="${1:-unknown}"
APP="$HOME/mehro-paste"
NEW="$HOME/mehro-paste.new"
PREV="$HOME/mehro-paste.prev"
TARBALL="$HOME/mehro-paste-release.tgz"
ENV_FILE="web/apps/paste/.env.local"
PM2_NAME="mehro-paste"
HEALTH_URL="http://127.0.0.1:3008/"

log() { echo "[deploy $(date -u +%T)] $*"; }

[ -f "$TARBALL" ] || { log "missing $TARBALL"; exit 1; }
[ -f "$APP/$ENV_FILE" ] || { log "missing $APP/$ENV_FILE"; exit 1; }

log "unpacking release $SHA"
rm -rf "$NEW"
mkdir -p "$NEW/web"
tar xzf "$TARBALL" -C "$NEW/web"
install -m 600 "$APP/$ENV_FILE" "$NEW/$ENV_FILE"
echo "$SHA" > "$NEW/REVISION"

log "switching release"
rm -rf "$PREV"
mv "$APP" "$PREV"
mv "$NEW" "$APP"
pm2 restart "$PM2_NAME" --update-env >/dev/null

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 3 "$HEALTH_URL"; then return 0; fi
    sleep 2
  done
  return 1
}

if healthy; then
  rm -f "$TARBALL"
  log "deployed $SHA"
else
  log "health check failed, rolling back"
  rm -rf "$APP.failed"
  mv "$APP" "$APP.failed"
  mv "$PREV" "$APP"
  pm2 restart "$PM2_NAME" --update-env >/dev/null
  healthy && log "rollback OK" || log "rollback ALSO unhealthy, check pm2 logs"
  exit 1
fi
