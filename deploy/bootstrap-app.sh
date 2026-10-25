#!/usr/bin/env bash
# Chatbot-App (172.20.4.26). Download, then run — do not pipe.
#   curl -fsSL -u "$DEPOT_USER:$DEPOT_PASS" "$DEPOT/bootstrap-app.sh" -o /tmp/b.sh
#   sudo -E bash /tmp/b.sh
#
# Restores the live chroma slice only (~86 MB compressed). The other ~14 GB is
# dead collections from the per-character-chunking era and is not needed.
set -euo pipefail
if [ ! -t 0 ] && [ ! -f "${BASH_SOURCE[0]:-}" ]; then
  echo "FATAL: do not pipe this script into bash (docker compose exec would eat it)."; exit 1
fi
: "${DEPOT:?}"; : "${DEPOT_USER:?}"; : "${DEPOT_PASS:?}"; : "${ENV_PASS:?}"
HOST_IP=${HOST_IP:-172.20.4.26}
DMZ_IP=${DMZ_IP:-172.17.1.26}
DB_IP=${DB_IP:-172.20.3.26}
D=/opt/sarmad
log(){ printf '\n== %s\n' "$*"; }
get(){ [ -s "$D/dl/$1" ] || curl -fsSL --retry 5 -C - -u "$DEPOT_USER:$DEPOT_PASS" -o "$D/dl/$1" "$DEPOT/$1"; }

for c in docker zstd gpg curl python3; do
  command -v $c >/dev/null || { echo "FATAL: $c not found"; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin missing"; exit 1; }
mkdir -p $D/{dl,app}

log "docker network preflight"
curl -fsSL --retry 5 -u "$DEPOT_USER:$DEPOT_PASS" -o $D/dl/docker-network-fix.sh "$DEPOT/docker-network-fix.sh"
bash $D/dl/docker-network-fix.sh

log "fetch artefacts"
cd $D/dl
rm -f SHA256SUMS; get SHA256SUMS
for f in env.tar.zst.gpg chroma-core.tar.zst cache-tiktoken.tar.zst uploads.tar.zst nltk.tar.zst; do get $f; done
grep -E ' (env.tar.zst.gpg|chroma-core.tar.zst|cache-tiktoken.tar.zst|uploads.tar.zst|nltk.tar.zst)$' SHA256SUMS | sha256sum -c -

if [ ! -f $D/env/open-webui.env ]; then
  log "decrypt secrets"
  mkdir -p $D/env
  gpg --batch --yes --passphrase "$ENV_PASS" -d env.tar.zst.gpg | tar -I zstd -x -C $D
  chmod -R go-rwx $D/env
fi
pick(){ grep -m1 "^$1=" "$D/env/$2" | cut -d= -f2-; }
PGPW=$(pick SERVICE_PASSWORD_POSTGRES open-webui.env)
SSO=$(pick SARMAD_SSO_URL open-webui.env)
SSO_PATH=$(printf '%s' "$SSO" | sed -E 's#https?://[^/]+##')
# Same derivation as the DMZ box, so the two agree without a key being shipped.
WSK=$(pick WEBUI_SECRET_KEY open-webui.env); [ -n "$WSK" ] || WSK=$(pick SERVICE_PASSWORD_JWT open-webui.env)
MASTER="sk-$(printf '%s' "${WSK}litellm-master" | sha256sum | cut -c1-40)"
[ -n "$PGPW" ] || { echo "FATAL: secrets missing from bundle"; exit 1; }

log "log in to the image mirror (the VPC cannot reach ghcr.io or Docker Hub)"
echo "$DEPOT_PASS" | docker login dev.bizgpt.info -u "$DEPOT_USER" --password-stdin

log "write stack"
umask 077
cat > $D/app/.env <<ENV
HOST_IP=$HOST_IP
DMZ_IP=$DMZ_IP
DB_IP=$DB_IP
POSTGRES_PASSWORD=$PGPW
LITELLM_KEY=$MASTER
SSO_URL=http://$DMZ_IP:8082$SSO_PATH
ENV
umask 022

cat > $D/app/docker-compose.yml <<'YML'
name: sarmad-app
services:
  open-webui:
    image: dev.bizgpt.info/sarmad/openwebui-integration:sarmad-d646806470c18addc8eb8b375fc536214a638f83
    restart: unless-stopped
    # The full env captured from the old container, so nothing silently goes
    # missing; everything that must change is overridden below, in one place.
    env_file: ../env/open-webui.env
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?}@${DB_IP:?}:5432/postgres
      OPENAI_API_BASE_URL: http://${DMZ_IP:?}:4000/v1     # the only way out
      OPENAI_API_KEY: ${LITELLM_KEY:?}
      SARMAD_SSO_URL: ${SSO_URL:?}                        # via DMZ; App has no route out
      NLTK_DATA: /app/backend/data/nltk_data              # was in the container's writable layer
      ENABLE_OLLAMA_API: "False"                          # ollama is not deployed here
    volumes: ["openwebui:/app/backend/data"]
    ports: ["${HOST_IP:?}:8080:8080"]

  pipelines:
    image: dev.bizgpt.info/sarmad/bizgpt-openwebui-pipeline:bizgpt-122d091db920efb41661852cf8f1794b60d2418e
    restart: unless-stopped
    env_file: ../env/pipelines.env
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?}@${DB_IP:?}:5432/postgres
      OPENAI_API_BASE_URL: http://${DMZ_IP:?}:4000/v1
      OPENAI_API_KEY: ${LITELLM_KEY:?}
    volumes: ["pipelines:/app/pipelines"]

volumes:
  openwebui:
  pipelines:

networks:
  default:
    ipam:
      config:
        - subnet: 10.201.20.0/24
YML

cd $D/app
docker compose up --no-start
VOL=$(docker volume inspect sarmad-app_openwebui -f '{{.Mountpoint}}')
log "restore data into $VOL (open-webui stopped: chroma.sqlite3 must not be written under it)"
docker compose stop open-webui >/dev/null 2>&1 || true

restore(){ # restore <artifact> <marker relative to the volume>
  if [ -e "$VOL/$2" ]; then echo "  $1 already restored"; return; fi
  echo "  unpacking $1"
  tar -I zstd -xf "$D/dl/$1" -C "$VOL"
}
restore chroma-core.tar.zst   vector_db/chroma.sqlite3
restore cache-tiktoken.tar.zst cache/tiktoken
restore uploads.tar.zst        uploads
restore nltk.tar.zst           nltk_data
du -sh "$VOL"/* 2>/dev/null | sed 's/^/  /'

log "start"
docker compose up -d
sleep 15

cat > /etc/systemd/system/sarmad.service <<UNIT
[Unit]
Description=Sarmad App stack
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$D/app
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now sarmad.service >/dev/null 2>&1 || true

log "checks"
docker compose ps --format '  {{.Service}}  {{.Status}}'
echo
curl -fsS -o /dev/null -w "  open-webui /health  -> %{http_code}\n" "http://$HOST_IP:8080/health" || echo "  open-webui /health  -> FAILED"
curl -fsS -o /dev/null -w "  litellm on DMZ      -> %{http_code}\n" "http://$DMZ_IP:4000/health/readiness" || echo "  litellm on DMZ      -> UNREACHABLE"
curl -fsS -o /dev/null -w "  postgrest on DB     -> %{http_code}\n" "http://$DB_IP:8000/" || echo "  postgrest on DB     -> UNREACHABLE"
echo -n "  chroma collections  -> "
docker compose exec -T open-webui python3 -c "
import sqlite3
c=sqlite3.connect('/app/backend/data/vector_db/chroma.sqlite3')
print(c.execute('select count(*) from collections').fetchone()[0])" </dev/null 2>/dev/null || echo FAILED
echo
echo "  Next: repoint the three URLs held in the config table (see post-install notes)."
