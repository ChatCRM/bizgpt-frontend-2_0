#!/usr/bin/env bash
# Chatbot-DMZ  172.17.1.26 — run this one FIRST.
#   export DEPOT=https://user:pass@host/<secret-path>
#   curl -fsSL "$DEPOT/bootstrap-dmz.sh" | sudo -E bash
source <(curl -fsSL "${DEPOT:?}/common.sh")

HOST_IP=${HOST_IP:-172.17.1.26}
APP_IP=${APP_IP:-172.20.4.26}
DB_IP=${DB_IP:-172.20.3.26}
mkdir -p "$STACK_DIR"/{dl,dmz/backups}

require_tools
rm -f "$STACK_DIR/dl/SHA256SUMS"
fetch SHA256SUMS "$STACK_DIR/dl/SHA256SUMS"
unpack_env
unpack_stack dmz
load_images dmz

cd "$STACK_DIR/dmz"
{ echo "HOST_IP=$HOST_IP"; echo "APP_IP=$APP_IP"; echo "DB_IP=$DB_IP"; } >> "$STACK_DIR/env/dmz.env"
ln -sf "$STACK_DIR/env/dmz.env" .env

docker compose up -d
install_unit dmz

log "push images into the local registry so App and DB can pull after the cord is cut"
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'chatcrm|supabase/postgres|postgrest|caddy|litellm|postgres:16'); do
  tag="$HOST_IP:5000/${img##*/}"
  docker tag "$img" "$tag" && docker push "$tag" || echo "skip $img"
done

log "smoke tests"
curl -fsS -o /dev/null -w 'litellm readiness %{http_code}\n' "http://$HOST_IP:4000/health/readiness"
curl -fsS -H "Authorization: Bearer $LITELLM_MASTER_KEY" "http://$HOST_IP:4000/v1/models" | jq -r '.data[].id'
log "embedding dimensions — must print 3072"
curl -fsS -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"text-embedding-3-large","input":"ping"}' \
  "http://$HOST_IP:4000/v1/embeddings" | jq '.data[0].embedding | length'
