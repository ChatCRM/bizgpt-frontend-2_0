#!/usr/bin/env bash
# Runs on the OLD box (158.220.104.166). Read-only against the running stack
# except for what it writes into $OUT.
#
#   scp deploy/migrate/export.sh root@158.220.104.166:/root/
#   ssh root@158.220.104.166 'bash /root/export.sh'          # rehearsal pass
#   ssh root@158.220.104.166 'FREEZE=1 bash /root/export.sh' # cutover pass
#
# FREEZE=1 stops open-webui and bubble-chat-api first, so the dump and the
# vector store are a single consistent moment. Without it the stack stays up
# and this is safe to run during business hours.
set -euo pipefail

SVC=wso8c0oc4c88ksgkkcgc8g8w
BUBBLE=c4sk00cc4w00480kk0kwkkwc
OUT=${OUT:-/root/sarmad-export}
OWUI=open-webui-$SVC
DB=supabase-db-$SVC
VOL=/var/lib/docker/volumes/${SVC}_open-webui/_data

mkdir -p "$OUT"/env
cd "$OUT"
log() { printf '\n== %s\n' "$*"; }
df -h / | tail -1

if [ "${FREEZE:-0}" = 1 ]; then
  log "FREEZE — stopping open-webui and bubble-chat-api"
  docker stop "$OWUI" "sarmad-bubble-chat-api-$BUBBLE"
  trap 'log "restarting old containers"; docker start "$OWUI" "sarmad-bubble-chat-api-$BUBBLE" || true' EXIT
fi

log "postgres"
# Roles first — PostgREST needs authenticator/anon/authenticated/service_role,
# and the dump's objects are owned by them.
docker exec "$DB" pg_dumpall -U postgres --globals-only > globals.sql
# public/auth/storage only. _supabase is 38 GB of logflare log_events and is
# deliberately left behind.
docker exec "$DB" pg_dump -U postgres -Fc -d postgres \
  -n public -n auth -n storage -n graphql_public > pg.dump
docker exec "$DB" psql -U postgres -d postgres -tAc "
SELECT 'chat='||(SELECT count(*) FROM chat)
     ||' user='||(SELECT count(*) FROM \"user\")
     ||' model='||(SELECT count(*) FROM model)
     ||' knowledge='||(SELECT count(*) FROM knowledge)
     ||' file='||(SELECT count(*) FROM file)" | tee rowcounts.txt

log "effective env — from the running containers, not from Coolify"
# Coolify hardcodes some values in docker_compose_raw which override .env, so
# the container is the only honest source.
docker exec "$OWUI"                          env > env/open-webui.env
docker exec "pipelines-$SVC"                 env > env/pipelines.env
docker exec "feedback-report-$SVC"           env > env/feedback-report.env
docker exec "sarmad-bubble-chat-api-$BUBBLE" env > env/bubble-chat-api.env
docker exec "$OWUI" cat /app/backend/.webui_secret_key > env/webui_secret_key
docker exec "$DB" psql -U postgres -d postgres -tAc \
  "SELECT data FROM config WHERE id=1" > env/openwebui-config.json

log "chroma — live slice"
# 1031 collections on disk, بیمبا reads three. Ship those; backfill the rest
# after cutover. Two segment rows per collection (metadata + vector).
docker exec "$OWUI" sqlite3 /app/backend/data/vector_db/chroma.sqlite3 \
  ".backup /tmp/chroma.sqlite3" 2>/dev/null \
  || docker exec "$OWUI" python3 -c "
import sqlite3
s=sqlite3.connect('/app/backend/data/vector_db/chroma.sqlite3')
d=sqlite3.connect('/tmp/chroma.sqlite3')
s.backup(d); d.close()"
docker cp "$OWUI":/tmp/chroma.sqlite3 ./chroma.sqlite3
docker exec "$OWUI" rm -f /tmp/chroma.sqlite3

LIVE=$(sqlite3 ./chroma.sqlite3 "
SELECT s.id FROM collections c JOIN segments s ON s.collection = c.id
WHERE c.name IN ('26634167-21ca-4f9e-8a99-07235264f4bb',
                 '098744e2-e048-4b33-af80-b07d3d6a671b',
                 '9c9fce9c-0453-400e-8eed-6bd7f6ec73fe');" 2>/dev/null \
  || docker run --rm -v "$OUT":/w keinos/sqlite3 sqlite3 /w/chroma.sqlite3 "
SELECT s.id FROM collections c JOIN segments s ON s.collection = c.id
WHERE c.name IN ('26634167-21ca-4f9e-8a99-07235264f4bb',
                 '098744e2-e048-4b33-af80-b07d3d6a671b',
                 '9c9fce9c-0453-400e-8eed-6bd7f6ec73fe');")
echo "$LIVE" | tee live-segments.txt
[ -n "$LIVE" ] || { echo "FATAL: no live segments resolved"; exit 1; }

mkdir -p stage/vector_db
cp ./chroma.sqlite3 stage/vector_db/
for s in $LIVE; do cp -a "$VOL/vector_db/$s" stage/vector_db/; done
tar -C stage -I 'zstd -3 -T0' -cf chroma-core.tar.zst vector_db
rm -rf stage

log "chroma — the other ~14 GB, backfilled after cutover"
tar -C "$VOL" -I 'zstd -3 -T0' -cf chroma-rest.tar.zst \
  $(printf -- '--exclude=vector_db/%s ' $LIVE) \
  --exclude=vector_db/chroma.sqlite3 vector_db

log "caches — whisper, embedding model, tiktoken. App has no internet to refetch these."
tar -C "$VOL" -I 'zstd -3 -T0' -cf cache.tar.zst cache
tar -C "$VOL" -I 'zstd -3 -T0' -cf uploads.tar.zst uploads

log "nltk — currently in the container's writable layer, lost on every recreate"
rm -rf nltk_data && docker cp "$OWUI":/root/nltk_data ./nltk_data 2>/dev/null || mkdir -p nltk_data
tar -I 'zstd -3 -T0' -cf nltk.tar.zst nltk_data && rm -rf nltk_data

log "images — as tarballs, so a registry credential can never block the migration"
docker save -o images-db.tar  supabase/postgres:15.1.1.78 postgrest/postgrest:v12.2.0 caddy:2-alpine
docker save -o images-app.tar \
  ghcr.io/chatcrm/openwebui-integration:sarmad-d646806470c18addc8eb8b375fc536214a638f83 \
  ghcr.io/chatcrm/bizgpt-openwebui-pipeline:bizgpt-122d091db920efb41661852cf8f1794b60d2418e
docker pull -q ghcr.io/berriai/litellm:main-v1.83.14-stable postgres:16-alpine registry:2 || true
docker save -o images-dmz.tar \
  ghcr.io/chatcrm/bubble-chat-api:sarmad-a60507bfb10acb3cb11e349ee249ce9f64418bd2 \
  ghcr.io/chatcrm/openwebui-feedback-report:sarmad-d1b7a16910ef0c3806cf0fd3957a00b55fdc794c \
  ghcr.io/berriai/litellm:main-v1.83.14-stable postgres:16-alpine registry:2 caddy:2-alpine

rm -f chroma.sqlite3
log "done"
ls -lh "$OUT"
df -h / | tail -1
