#!/usr/bin/env bash
# Chatbot-App  172.20.4.26
#   export DEPOT=https://user:pass@host/<secret-path>
#   curl -fsSL "$DEPOT/bootstrap-app.sh" | sudo -E bash
#
# Restores the critical-path chroma slice only (~1.5 GB). Run with
# BACKFILL=1 after cutover to pull the remaining ~14 GB of dead collections.
source <(curl -fsSL "${DEPOT:?}/common.sh")

HOST_IP=${HOST_IP:-172.20.4.26}
DMZ_IP=${DMZ_IP:-172.17.1.26}
DB_IP=${DB_IP:-172.20.3.26}
mkdir -p "$STACK_DIR"/dl

require_tools
allow_dmz_registry "$DMZ_IP:5000"
rm -f "$STACK_DIR/dl/SHA256SUMS"
fetch SHA256SUMS "$STACK_DIR/dl/SHA256SUMS"
unpack_env
unpack_stack app
load_images app

cd "$STACK_DIR/app"
{ echo "HOST_IP=$HOST_IP"; echo "DMZ_IP=$DMZ_IP"; echo "DB_IP=$DB_IP"; } >> "$STACK_DIR/env/app.env"
ln -sf "$STACK_DIR/env/app.env" .env

# Create the volume, then unpack data straight into it. OpenWebUI must be down
# while chroma.sqlite3 is written.
docker compose up --no-start
VOL=$(docker volume inspect sarmad-app_openwebui -f '{{.Mountpoint}}')

restore() { # restore <artifact> <marker-path>
  [ -e "$VOL/$2" ] && { log "$1 already restored"; return; }
  fetch "$1"
  verify_sums "$1"
  log "unpack $1"
  tar -I zstd -xf "$STACK_DIR/dl/$1" -C "$VOL"
}

if [ "${BACKFILL:-0}" = 1 ]; then
  docker compose stop open-webui || true
  restore chroma-rest.tar.zst .chroma-rest-done
  touch "$VOL/.chroma-rest-done"
  docker compose up -d
  log "backfill complete"
  exit 0
fi

restore chroma-core.tar.zst vector_db/chroma.sqlite3
restore cache.tar.zst       cache/tiktoken
restore uploads.tar.zst     uploads
restore nltk.tar.zst        nltk_data

docker compose up -d
install_unit app

log "health"
sleep 10
docker compose exec -T open-webui curl -fsS http://127.0.0.1:8080/health && echo
log "reachability — both must answer"
curl -fsS -o /dev/null -w 'litellm %{http_code}\n' "http://$DMZ_IP:4000/health/readiness" || true
docker compose exec -T open-webui python3 -c "
import psycopg2, os, urllib.parse as u
d = u.urlparse(os.environ['DATABASE_URL'])
psycopg2.connect(host=d.hostname, port=d.port, user=d.username, password=d.password, dbname=d.path[1:]).close()
print('postgres ok')"
