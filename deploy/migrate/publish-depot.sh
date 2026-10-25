#!/usr/bin/env bash
# Runs on YOUR machine. Builds the role env files, packs the stacks, and
# publishes everything to the depot on bizgpt-dev, from which the three VPC
# servers pull. They cannot be pushed to; they can pull. That is the whole
# trick.
#
#   ./publish-depot.sh                 # everything
#   ./publish-depot.sh stacks          # just re-publish compose/config changes
set -euo pipefail

OLD=${OLD:-root@158.220.104.166}
RELAY=${RELAY:-bizgpt-dev}
DEPOT_ROOT=${DEPOT_ROOT:-/srv/sarmad-migration}
HERE=$(cd "$(dirname "$0")/.." && pwd)
STAGE=${STAGE:-/tmp/sarmad-depot}
: "${DEPOT_PATH:?a long random path segment, e.g. DEPOT_PATH=\$(openssl rand -hex 16)}"
DEPOT_DIR="$DEPOT_ROOT/$DEPOT_PATH"

log() { printf '\n== %s\n' "$*"; }

log "relay disk — this box sits near 84% full, abort if it is tight"
ssh "$RELAY" 'df -h / | tail -1'

mkdir -p "$STAGE"

pack_stacks() {
  log "pack stacks"
  for role in db app dmz; do
    tar -C "$HERE" -I 'zstd -3' -cf "$STAGE/stack-$role.tar.zst" "$role"
  done
  cp "$HERE/common.sh" "$STAGE/common.sh"
  cp "$HERE/db/bootstrap.sh"  "$STAGE/bootstrap-db.sh"
  cp "$HERE/app/bootstrap.sh" "$STAGE/bootstrap-app.sh"
  cp "$HERE/dmz/bootstrap.sh" "$STAGE/bootstrap-dmz.sh"
  cp "$HERE/migrate/verify.sh" "$STAGE/verify.sh"
}

pull_data() {
  log "pull the export from the old box (through here — the two servers have no key to each other)"
  ssh "$OLD" 'tar -C /root/sarmad-export -cf - .' | tar -C "$STAGE" -xf -
}

build_env() {
  log "build role env files from the captured container environments"
  local E="$STAGE/env"
  v() { grep -m1 "^$1=" "$E/$2" | cut -d= -f2- ; }

  local PG JWT
  PG=$(v SERVICE_PASSWORD_POSTGRES open-webui.env)
  JWT=$(v SERVICE_PASSWORD_JWT     open-webui.env)
  [ -n "$PG" ] && [ -n "$JWT" ] || { echo "FATAL: could not read postgres/jwt secrets"; exit 1; }

  # New secrets, minted here. Nothing is reused from the other product on the
  # relay box.
  local MASTER LLDB
  MASTER=sk-$(openssl rand -hex 24)
  LLDB=$(openssl rand -hex 24)

  cat > "$E/db.env" <<X
POSTGRES_PASSWORD=$PG
JWT_SECRET=$JWT
BACKUP_RETAIN=7
X
  cat > "$E/app.env" <<X
POSTGRES_PASSWORD=$PG
LITELLM_KEY_OPENWEBUI=$MASTER
LITELLM_KEY_PIPELINES=$MASTER
X
  cat > "$E/dmz.env" <<X
POSTGRES_PASSWORD=$PG
LITELLM_MASTER_KEY=$MASTER
LITELLM_DB_PASSWORD=$LLDB
RELAY_BASE=${RELAY_BASE:-https://CHANGE-ME/openrouter}
RELAY_KEY=${RELAY_KEY:-CHANGE-ME}
SSO_UPSTREAM=${SSO_UPSTREAM:-https://sandbox.hz3.co}
X
  echo "LITELLM_MASTER_KEY=$MASTER   <- mint per-app keys from this after Phase 7"

  log "encrypt env (you will be asked for a passphrase — send it out of band)"
  tar -C "$STAGE" -I zstd -cf - env | age -p > "$STAGE/env.tar.zst.age"
  rm -rf "$E"
}

publish() {
  log "publish to $RELAY:$DEPOT_DIR"
  ssh "$RELAY" "sudo mkdir -p '$DEPOT_DIR' && sudo chown \$(id -u):\$(id -g) '$DEPOT_DIR'"
  rsync -avP --exclude env/ "$STAGE/" "$RELAY:$DEPOT_DIR/"
  ssh "$RELAY" "cd '$DEPOT_DIR' && sha256sum * > SHA256SUMS && ls -lh && df -h / | tail -1"
  cat <<X

Depot published. On each VPC server, in the web console, paste:

  export DEPOT='https://<user>:<pass>@<depot-host>/$DEPOT_PATH'
  curl -fsSL "\$DEPOT/bootstrap-dmz.sh" | sudo -E bash     # DMZ first
  curl -fsSL "\$DEPOT/bootstrap-db.sh"  | sudo -E bash
  curl -fsSL "\$DEPOT/bootstrap-app.sh" | sudo -E bash

Delete the depot at Phase 10:  ssh $RELAY 'sudo rm -rf $DEPOT_DIR'
X
}

case "${1:-all}" in
  stacks) pack_stacks; publish ;;
  data)   pull_data; build_env; publish ;;
  all)    pull_data; build_env; pack_stacks; publish ;;
  *) echo "usage: $0 [all|data|stacks]"; exit 1 ;;
esac
