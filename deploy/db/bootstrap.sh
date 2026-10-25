#!/usr/bin/env bash
# Chatbot-DB  172.20.3.26
#   export DEPOT=https://user:pass@host/<secret-path>
#   curl -fsSL "$DEPOT/bootstrap-db.sh" | sudo -E bash
source <(curl -fsSL "${DEPOT:?}/common.sh")

HOST_IP=${HOST_IP:-172.20.3.26}
mkdir -p "$STACK_DIR"/{dl,db/backups}

require_tools
rm -f "$STACK_DIR/dl/SHA256SUMS"
fetch SHA256SUMS "$STACK_DIR/dl/SHA256SUMS"
unpack_env
unpack_stack db
load_images db

fetch globals.sql
fetch pg.dump
verify_sums globals.sql pg.dump

cd "$STACK_DIR/db"
echo "HOST_IP=$HOST_IP" >> "$STACK_DIR/env/db.env"
ln -sf "$STACK_DIR/env/db.env" .env

docker compose up -d postgres
log "wait for postgres"
until docker compose exec -T postgres pg_isready -U postgres -d postgres; do sleep 2; done

if ! docker compose exec -T postgres psql -U postgres -d postgres -tAc \
      "select to_regclass('public.chat')" | grep -q chat; then
  log "restore globals (roles) then data"
  docker compose exec -T postgres psql -U postgres -d postgres < "$STACK_DIR/dl/globals.sql" || true
  docker compose cp "$STACK_DIR/dl/pg.dump" postgres:/tmp/pg.dump
  docker compose exec -T postgres pg_restore -U postgres -d postgres -j4 /tmp/pg.dump
  docker compose exec -T postgres rm -f /tmp/pg.dump
else
  log "data already present, skipping restore"
fi

docker compose up -d
install_unit db

log "row counts — diff these against the old box"
docker compose exec -T postgres psql -U postgres -d postgres -c "
SELECT 'chat' t, count(*) FROM chat
UNION ALL SELECT 'user',      count(*) FROM \"user\"
UNION ALL SELECT 'model',     count(*) FROM model
UNION ALL SELECT 'knowledge', count(*) FROM knowledge
UNION ALL SELECT 'file',      count(*) FROM file
UNION ALL SELECT 'config',    count(*) FROM config;"
