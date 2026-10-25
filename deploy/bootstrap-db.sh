#!/usr/bin/env bash
# Chatbot-DB (172.20.3.26). Run as root.
#   export DEPOT=... DEPOT_USER=sarmad DEPOT_PASS=...
#   curl -fsSL -u "$DEPOT_USER:$DEPOT_PASS" "$DEPOT/bootstrap-db.sh" | sudo -E bash
#
# Idempotent: safe to re-run. Restores only if the data is not already there.
set -euo pipefail

# Must not run straight off a pipe: several docker compose exec calls attach
# stdin and would consume the rest of this script. Download, then run.
if [ ! -t 0 ] && [ ! -f "${BASH_SOURCE[0]:-}" ]; then
  echo "FATAL: do not pipe this script into bash."
  echo "  curl -fsSL -u \"\$DEPOT_USER:\$DEPOT_PASS\" \"\$DEPOT/bootstrap-db.sh\" -o /tmp/bootstrap-db.sh"
  echo "  sudo -E bash /tmp/bootstrap-db.sh"
  exit 1
fi

: "${DEPOT:?}" ; : "${DEPOT_USER:?}" ; : "${DEPOT_PASS:?}"
HOST_IP=${HOST_IP:-172.20.3.26}
D=/opt/sarmad
log(){ printf '\n== %s\n' "$*"; }
get(){ [ -s "$D/dl/$1" ] || curl -fsSL --retry 5 -C - -u "$DEPOT_USER:$DEPOT_PASS" -o "$D/dl/$1" "$DEPOT/$1"; }

mkdir -p $D/{dl,db/backups}

for c in docker zstd gpg curl python3; do
  command -v $c >/dev/null || { echo "FATAL: $c not found on this host"; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin missing"; exit 1; }

log "docker network preflight"
# Docker's DEFAULT pool is 172.17.0.0/12 in /16 chunks, which lands straight on
# the other VMs (172.17.1.x DMZ, 172.20.3.x DB, 172.20.4.x App) and blackholes
# ssh to them. "bip" alone does NOT fix it — that only moves docker0, while
# every compose network comes from default-address-pools.
curl -fsSL --retry 5 -u "$DEPOT_USER:$DEPOT_PASS" -o $D/dl/docker-network-fix.sh "$DEPOT/docker-network-fix.sh"
bash $D/dl/docker-network-fix.sh

log "fetch artefacts"
cd $D/dl
get SHA256SUMS; get globals.sql; get pg.dump; get env.tar.zst.gpg
grep -E ' (globals.sql|pg.dump|env.tar.zst.gpg)$' SHA256SUMS | sha256sum -c -

if [ ! -f $D/env/open-webui.env ]; then
  log "decrypt the secrets bundle (passphrase was sent to you out of band)"
  mkdir -p $D/env
  gpg --batch --yes --passphrase "${ENV_PASS:?set ENV_PASS to the bundle passphrase}" \
      -d env.tar.zst.gpg | tar -I zstd -x -C $D
  chmod -R go-rwx $D/env
fi

PGPW=$(grep -m1 '^SERVICE_PASSWORD_POSTGRES=' $D/env/open-webui.env | cut -d= -f2-)
JWTS=$(grep -m1 '^SERVICE_PASSWORD_JWT='      $D/env/open-webui.env | cut -d= -f2-)
[ -n "$PGPW" ] && [ -n "$JWTS" ] || { echo "FATAL: secrets not found in bundle"; exit 1; }

log "log in to the image mirror (this box cannot reach Docker Hub either)"
echo "$DEPOT_PASS" | docker login dev.bizgpt.info -u "$DEPOT_USER" --password-stdin

log "write stack"
cat > $D/db/.env <<ENV
HOST_IP=$HOST_IP
POSTGRES_PASSWORD=$PGPW
JWT_SECRET=$JWTS
ENV
chmod 600 $D/db/.env

cat > $D/db/nginx.conf <<'NGINX'
# All that is left of Supabase Kong: supabase-py calls
# {SUPABASE_URL}/rest/v1/<table>, PostgREST wants /<table>.
server {
    listen 8000;
    server_name _;

    location /rest/v1/ {
        # Resolve at request time via docker's embedded DNS. With a literal
        # upstream, nginx resolves once at startup and exits if the name is
        # missing — so a restarting postgrest would take nginx down with it.
        resolver 127.0.0.11 valid=10s ipv6=off;
        set $pgrst postgrest;
        rewrite ^/rest/v1/(.*)$ /$1 break;
        proxy_pass http://$pgrst:3000;
        proxy_set_header Host            $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location = / { return 200 "sarmad-db\n"; }
}
NGINX

cat > $D/db/docker-compose.yml <<'YML'
name: sarmad-db
services:
  postgres:
    # Same image as the source: the dump carries CREATE EXTENSION for pgsodium,
    # vault, pg_net and pg_graphql plus supabase-owned roles.
    image: dev.bizgpt.info/sarmad/postgres:15.1.1.78
    restart: unless-stopped
    environment:
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?}
      JWT_SECRET: ${JWT_SECRET:?}
      JWT_EXP: 3600
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf, -c, log_min_messages=fatal]
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    ports: ["${HOST_IP:?}:5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 12

  postgrest:
    image: dev.bizgpt.info/sarmad/postgrest:v12.2.0
    restart: unless-stopped
    depends_on:
      postgres: {condition: service_healthy}
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD:?}@postgres:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET:?}

  nginx:
    image: dev.bizgpt.info/sarmad/nginx:1.27-alpine
    restart: unless-stopped
    depends_on: [postgrest]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports: ["${HOST_IP:?}:8000:8000"]

volumes:
  pgdata:

networks:
  default:
    ipam:
      config:
        - subnet: 10.201.10.0/24
YML

cd $D/db
log "start postgres"
docker compose up -d postgres
until docker compose exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1 </dev/null; do sleep 2; done

if docker compose exec -T postgres psql -U postgres -d postgres -tAc "select to_regclass('public.chat')" </dev/null | grep -q chat; then
  log "data already present, skipping restore"
else
  log "restore roles, then data"
  docker compose exec -T postgres psql -U postgres -d postgres < $D/dl/globals.sql >/dev/null 2>&1 || true
  docker cp $D/dl/pg.dump $(docker compose ps -q postgres):/tmp/pg.dump
  docker compose exec -T postgres pg_restore -U postgres -d postgres -j4 /tmp/pg.dump </dev/null || true
  docker compose exec -T postgres rm -f /tmp/pg.dump </dev/null
fi

log "ensure the PostgREST login role is usable"
# globals.sql carries ALTER ROLE authenticator ... PASSWORD, but that restore
# runs with errors ignored, and on a fresh supabase/postgres the role is
# created by the image's init WITHOUT a password — so postgrest gets
# "password authentication failed ... has no password assigned" and crash-loops.
# Set it explicitly; idempotent. Must run as supabase_admin: in this image
# `postgres` is NOT a superuser (usesuper=f) and `authenticator` is a
# reserved role that only a superuser may modify. The active pg_hba has
# "local all supabase_admin scram-sha-256", so the socket needs a password —
# which on a fresh instance is POSTGRES_PASSWORD.
docker compose exec -T -e PGPASSWORD="$PGPW" postgres \
  psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 </dev/null <<SQL
ALTER ROLE authenticator WITH LOGIN PASSWORD \$\$${PGPW}\$\$;
GRANT anon, authenticated, service_role TO authenticator;
SQL

echo -n "  authenticator can log in -> "
docker compose exec -T postgres env PGPASSWORD="$PGPW" \
  psql -h 127.0.0.1 -U authenticator -d postgres -tAc "select 'yes'" </dev/null 2>&1 | tail -1

log "start postgrest + nginx"
docker compose up -d

cat > /etc/systemd/system/sarmad.service <<UNIT
[Unit]
Description=Sarmad DB stack
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$D/db
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now sarmad.service >/dev/null 2>&1 || true

log "ROW COUNTS — these must match rowcounts.txt from the old box"
docker compose exec -T postgres psql -U postgres -d postgres -c \
"SELECT 'chat' t, count(*) FROM chat
 UNION ALL SELECT 'user', count(*) FROM \"user\"
 UNION ALL SELECT 'model', count(*) FROM model
 UNION ALL SELECT 'knowledge', count(*) FROM knowledge
 UNION ALL SELECT 'file', count(*) FROM file
 UNION ALL SELECT 'config', count(*) FROM config;" </dev/null

log "expected (old box)"
cat <<'EXP'
 chat      | 45487
 user      |   197
 model     |     2
 knowledge |     3
 file      |   637
 config    |     1
EXP

log "postgrest check"
sleep 3
curl -fsS -o /dev/null -w "  /rest/v1/chat -> %{http_code}\n" "http://$HOST_IP:8000/rest/v1/chat?limit=1" \
  -H "apikey: $(grep -m1 '^SERVICE_SUPABASESERVICE_KEY=' $D/env/open-webui.env | cut -d= -f2-)" \
  -H "Authorization: Bearer $(grep -m1 '^SERVICE_SUPABASESERVICE_KEY=' $D/env/open-webui.env | cut -d= -f2-)" || true
echo; echo "DB done."
