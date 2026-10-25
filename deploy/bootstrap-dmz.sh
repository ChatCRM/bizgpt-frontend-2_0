#!/usr/bin/env bash
# Chatbot-DMZ (172.17.1.26). Download, then run — do not pipe.
#   curl -fsSL -u "$DEPOT_USER:$DEPOT_PASS" "$DEPOT/bootstrap-dmz.sh" -o /tmp/b.sh
#   sudo -E bash /tmp/b.sh
set -euo pipefail
if [ ! -t 0 ] && [ ! -f "${BASH_SOURCE[0]:-}" ]; then
  echo "FATAL: do not pipe this script into bash (docker compose exec would eat it)."; exit 1
fi
: "${DEPOT:?}"; : "${DEPOT_USER:?}"; : "${DEPOT_PASS:?}"; : "${ENV_PASS:?}"
HOST_IP=${HOST_IP:-172.17.1.26}
APP_IP=${APP_IP:-172.20.4.26}
DB_IP=${DB_IP:-172.20.3.26}
RELAY_BASE=${RELAY_BASE:-https://dev.bizgpt.info/or}
UI_FQDN=${UI_FQDN:-bimebot.sarmadins.ir}      # hardcoded in bubble-chat-api; do not rename
API_FQDN=${API_FQDN:-chat-api.sarmadins.ir}   # covered by the *.sarmadins.ir wildcard
D=/opt/sarmad
log(){ printf '\n== %s\n' "$*"; }
get(){ [ -s "$D/dl/$1" ] || curl -fsSL --retry 5 -C - -u "$DEPOT_USER:$DEPOT_PASS" -o "$D/dl/$1" "$DEPOT/$1"; }

for c in docker zstd gpg curl python3; do
  command -v $c >/dev/null || { echo "FATAL: $c not found"; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin missing"; exit 1; }
mkdir -p $D/{dl,dmz} $D/dmz/{certs,nginx.d}

log "docker network preflight"
curl -fsSL --retry 5 -u "$DEPOT_USER:$DEPOT_PASS" -o $D/dl/docker-network-fix.sh "$DEPOT/docker-network-fix.sh"
bash $D/dl/docker-network-fix.sh

log "fetch artefacts"
cd $D/dl
rm -f SHA256SUMS; get SHA256SUMS; get env.tar.zst.gpg
grep -E ' env.tar.zst.gpg$' SHA256SUMS | sha256sum -c -

if [ ! -f $D/env/open-webui.env ]; then
  log "decrypt secrets"
  mkdir -p $D/env
  gpg --batch --yes --passphrase "$ENV_PASS" -d env.tar.zst.gpg | tar -I zstd -x -C $D
  chmod -R go-rwx $D/env
fi
pick(){ grep -m1 "^$1=" "$D/env/$2" | cut -d= -f2-; }
PGPW=$(pick SERVICE_PASSWORD_POSTGRES open-webui.env)
ORKEY=$(pick OPENAI_API_KEY open-webui.env)
SSO=$(pick SARMAD_SSO_URL open-webui.env)
SSO_HOST=$(printf '%s' "$SSO" | sed -E 's#https?://([^/]+).*#\1#')
[ -n "$PGPW" ] && [ -n "$ORKEY" ] || { echo "FATAL: secrets missing from bundle"; exit 1; }

# The LiteLLM keys are DERIVED from a secret that already travels inside the
# encrypted bundle, so no credential is ever published to the depot and the App
# box computes the identical value without being told it.
WSK=$(pick WEBUI_SECRET_KEY open-webui.env); [ -n "$WSK" ] || WSK=$(pick SERVICE_PASSWORD_JWT open-webui.env)
MASTER="sk-$(printf '%s' "${WSK}litellm-master" | sha256sum | cut -c1-40)"
LLDB=$(printf '%s' "${WSK}litellm-db" | sha256sum | cut -c1-32)

log "log in to the image mirror (the VPC cannot reach ghcr.io or Docker Hub)"
echo "$DEPOT_PASS" | docker login dev.bizgpt.info -u "$DEPOT_USER" --password-stdin

log "write stack"
umask 077
cat > $D/dmz/.env <<ENV
HOST_IP=$HOST_IP
APP_IP=$APP_IP
DB_IP=$DB_IP
POSTGRES_PASSWORD=$PGPW
LITELLM_MASTER_KEY=$MASTER
LITELLM_DB_PASSWORD=$LLDB
OPENROUTER_API_KEY=$ORKEY
RELAY_BASE=$RELAY_BASE
ENV
umask 022

sed -e "s#__APP_IP__#$APP_IP#g" -e "s#__SSO_HOST__#$SSO_HOST#g" > $D/dmz/nginx.d/default.conf <<'NGINX'
# Plain HTTP, routed by port on the private address. Kept alongside TLS so the
# stack stays reachable by IP while DNS propagates.
#   :80  بیمبا UI      :8081 chatbot API      :8082 SSO passthrough for App
upstream openwebui { server __APP_IP__:8080; }
server {
    listen 80 default_server;
    server_name _;
    proxy_read_timeout 600s; proxy_send_timeout 600s; proxy_buffering off;
    location / {
        proxy_pass http://openwebui;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 8081;
    server_name _;
    proxy_read_timeout 600s;
    location / {
        proxy_pass http://bubble-chat-api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    listen 8082;
    server_name _;
    # App has no route to the internet; DMZ makes the real call for it.
    location / {
        proxy_pass https://__SSO_HOST__;
        proxy_ssl_server_name on;
        proxy_set_header Host __SSO_HOST__;
    }
}
NGINX

# TLS only when both files are actually present — an nginx that references a
# missing certificate refuses to start, taking the whole ingress with it.
rm -f $D/dmz/nginx.d/tls.conf
if [ -s $D/dmz/certs/fullchain.pem ] && [ -s $D/dmz/certs/privkey.pem ]; then
  log "certificates found, enabling TLS for $UI_FQDN and $API_FQDN"
  sed -e "s#__UI__#$UI_FQDN#g" -e "s#__API__#$API_FQDN#g" > $D/dmz/nginx.d/tls.conf <<'TLS'
# Wildcard *.sarmadins.ir covers both names, so one certificate serves both.
ssl_certificate     /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_session_cache   shared:SSL:10m;
ssl_prefer_server_ciphers off;

# Unknown SNI gets dropped rather than served a default site.
server {
    listen 443 ssl default_server;
    http2 on;
    server_name _;
    return 444;
}

server {
    listen 443 ssl;
    http2 on;
    server_name __UI__;
    proxy_read_timeout 600s; proxy_send_timeout 600s; proxy_buffering off;
    location / {
        proxy_pass http://openwebui;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name __API__;
    proxy_read_timeout 600s;
    location / {
        proxy_pass http://bubble-chat-api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
TLS
else
  log "no certificates in $D/dmz/certs — starting HTTP only"
fi

cat > $D/dmz/litellm-config.yaml <<'YML'
# Every model call from every component goes through here and is logged to the
# postgres beside it, inside the VPC. Upstream is nginx on the relay, which
# forwards to openrouter.ai — the relay never holds this API key.
model_list:
  - model_name: openai/gpt-5.4            # must match model.base_model_id
    litellm_params:
      model: openai/openai/gpt-5.4        # provider/<id sent upstream>
      api_base: os.environ/RELAY_BASE
      api_key: os.environ/OPENROUTER_API_KEY
      max_tokens: 8192                    # OpenRouter reserves credit for the full output
  - model_name: text-embedding-3-large    # 3072 dims; changing it invalidates the RAG index
    litellm_params:
      model: openai/text-embedding-3-large
      api_base: os.environ/RELAY_BASE
      api_key: os.environ/OPENROUTER_API_KEY
      # Pinned because LiteLLM otherwise sends encoding_format as null and
      # OpenRouter rejects it: invalid_value, expected one of "float"|"base64".
      encoding_format: float
  - model_name: "*"
    litellm_params:
      model: openai/*
      api_base: os.environ/RELAY_BASE
      api_key: os.environ/OPENROUTER_API_KEY

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  store_prompts_in_spend_logs: true

litellm_settings:
  request_timeout: 600
  drop_params: true
YML

cat > $D/dmz/docker-compose.yml <<'YML'
name: sarmad-dmz
services:
  nginx:
    image: dev.bizgpt.info/sarmad/nginx:1.27-alpine
    restart: unless-stopped
    volumes:
      - ./nginx.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
    ports:
      - "${HOST_IP:?}:80:80"
      - "${HOST_IP:?}:443:443"
      - "${HOST_IP:?}:8081:8081"
      - "${HOST_IP:?}:8082:8082"

  litellm:
    image: dev.bizgpt.info/sarmad/litellm:main-v1.83.14-stable
    restart: unless-stopped
    depends_on:
      litellm-db: {condition: service_healthy}
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    environment:
      LITELLM_MASTER_KEY: ${LITELLM_MASTER_KEY:?}
      DATABASE_URL: postgresql://litellm:${LITELLM_DB_PASSWORD:?}@litellm-db:5432/litellm
      RELAY_BASE: ${RELAY_BASE:?}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:?}
      STORE_MODEL_IN_DB: "False"
      # Use the cost map shipped in the image instead of fetching it from
      # raw.githubusercontent.com at startup — one fewer outbound
      # dependency, and GitHub is not reachable from this network.
      LITELLM_LOCAL_MODEL_COST_MAP: "True"
    volumes: ["./litellm-config.yaml:/app/config.yaml:ro"]
    ports: ["${HOST_IP:?}:4000:4000"]

  litellm-db:
    image: dev.bizgpt.info/sarmad/postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: litellm
      POSTGRES_PASSWORD: ${LITELLM_DB_PASSWORD:?}
      POSTGRES_DB: litellm
    volumes: ["litellm_pg:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U litellm"]
      interval: 10s
      timeout: 5s
      retries: 12

  bubble-chat-api:
    image: dev.bizgpt.info/sarmad/bubble-chat-api:sarmad-a60507bfb10acb3cb11e349ee249ce9f64418bd2
    restart: unless-stopped
    env_file: ../env/bubble-chat-api.env
    environment:
      SUPABASE_URL: http://${DB_IP:?}:8000
      BUBBLE_API: http://${APP_IP:?}:8080/api/v1/chats/new
    # main.py hardcodes https://bimebot.sarmadins.ir/api/chat/completions for
    # completions and ignores BUBBLE_API there. Until a real hostname and
    # certificate exist that one call cannot work; /new-channel and the
    # database path both do.
    extra_hosts: ["bimebot.sarmadins.ir:${HOST_IP:?}"]

  feedback-report:
    # Here rather than on App because it needs SMTP, and App has no route out.
    image: dev.bizgpt.info/sarmad/openwebui-feedback-report:sarmad-d1b7a16910ef0c3806cf0fd3957a00b55fdc794c
    restart: unless-stopped
    env_file: ../env/feedback-report.env
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?}@${DB_IP:?}:5432/postgres

  tts:
    # sarmad-tts-wrapper-api. OpenWebUI finds it through a URL in the config
    # table, not an env var. Calls Google Gemini, so it needs internet.
    image: dev.bizgpt.info/sarmad/agwgkc8gowc848gk088c4840-gemini-tts:latest
    restart: unless-stopped
    env_file: ../env/open-webui.env
    ports: ["${HOST_IP:?}:3001:3000"]

volumes:
  litellm_pg:

networks:
  default:
    ipam:
      config:
        - subnet: 10.201.30.0/24
YML

cd $D/dmz
log "start"
# openwebui-feedback-report is 8.95 GB and may still be uploading to the
# mirror. It is a nightly cron emailer — nothing else depends on it — so bring
# the stack up without it rather than blocking on a pull that cannot succeed.
FR_TAG=sarmad-d1b7a16910ef0c3806cf0fd3957a00b55fdc794c
if curl -fsS -u "$DEPOT_USER:$DEPOT_PASS" \
     "https://dev.bizgpt.info/v2/sarmad/openwebui-feedback-report/tags/list" 2>/dev/null \
     | grep -q "$FR_TAG"; then
  docker compose up -d
else
  echo "  NOTE: feedback-report image not in the mirror yet; starting without it."
  echo "        Add it later with:  cd $D/dmz && docker compose up -d feedback-report"
  docker compose up -d nginx litellm litellm-db bubble-chat-api tts
fi
# compose will not recreate a container just because a bind-mounted file
# changed, so make the config reload explicit.
docker compose restart litellm nginx >/dev/null

# LiteLLM runs database migrations before it binds the port, which can take
# 30-60s. Poll instead of guessing, or the checks below race it and report a
# refused connection that resolves itself moments later.
printf '  waiting for litellm'
for i in $(seq 1 40); do
  curl -fsS -o /dev/null -m 3 "http://$HOST_IP:4000/health/readiness" 2>/dev/null && { echo " ready"; break; }
  printf '.'; sleep 3
  [ "$i" = 40 ] && echo " TIMED OUT after 120s — check: docker compose logs --tail 40 litellm"
done

cat > /etc/systemd/system/sarmad.service <<UNIT
[Unit]
Description=Sarmad DMZ stack
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$D/dmz
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

# Report what actually happened instead of piping a failed curl into a JSON
# parser and getting a traceback.
probe(){ # probe <label> <curl args...>
  local label=$1; shift
  local body code
  body=$(curl -sS -m 90 -w $'\n%{http_code}' "$@" 2>&1) || true
  code=$(printf '%s' "$body" | tail -1)
  body=$(printf '%s' "$body" | sed '$d')
  printf '  %-22s %s\n' "$label" "${code:-no-response}"
  case "$code" in 2*) printf '%s' "$body" ;; *) printf '  %s\n' "$(printf '%s' "$body" | head -c 300)" ;; esac
}

probe "litellm readiness" "http://$HOST_IP:4000/health/readiness" >/dev/null 2>&1 \
  && curl -sS -o /dev/null -m 20 -w "  litellm readiness      %{http_code}\n" "http://$HOST_IP:4000/health/readiness" \
  || echo "  litellm readiness      UNREACHABLE"

echo -n "  models                 "
curl -sS -m 30 -H "Authorization: Bearer $MASTER" "http://$HOST_IP:4000/v1/models" 2>&1 \
  | python3 -c 'import sys,json
raw=sys.stdin.read().strip()
if not raw: print("EMPTY RESPONSE"); raise SystemExit
try: print(len(json.loads(raw)["data"]), "models")
except Exception: print("UNEXPECTED:", raw[:200])'

echo -n "  embedding dims         "
curl -sS -m 90 -X POST "http://$HOST_IP:4000/v1/embeddings" -H "Authorization: Bearer $MASTER" \
  -H 'Content-Type: application/json' -d '{"model":"text-embedding-3-large","input":"ping"}' 2>&1 \
  | python3 -c 'import sys,json
raw=sys.stdin.read().strip()
if not raw: print("EMPTY RESPONSE"); raise SystemExit
try: print(len(json.loads(raw)["data"][0]["embedding"]))
except Exception: print("UNEXPECTED:", raw[:300])'

echo -n "  chat completion        "
curl -sS -m 90 -X POST "http://$HOST_IP:4000/v1/chat/completions" -H "Authorization: Bearer $MASTER" \
  -H 'Content-Type: application/json' \
  -d '{"model":"openai/gpt-5.4","messages":[{"role":"user","content":"say ok"}],"max_tokens":8}' 2>&1 \
  | python3 -c 'import sys,json
raw=sys.stdin.read().strip()
if not raw: print("EMPTY RESPONSE"); raise SystemExit
try: print(json.loads(raw)["choices"][0]["message"]["content"])
except Exception: print("UNEXPECTED:", raw[:300])'

echo -n "  DB postgrest           "
curl -sS -o /dev/null -m 10 -w "%{http_code}\n" "http://$DB_IP:8000/" 2>&1 \
  || echo "UNREACHABLE (open DMZ->DB 8000 on the customer firewall)"

echo -n "  App open-webui         "
curl -sS -o /dev/null -m 10 -w "%{http_code}\n" "http://$APP_IP:8080/health" 2>&1 \
  || echo "UNREACHABLE (open DMZ->App 8080 on the customer firewall)"

echo; echo "  embedding dims must be 3072. DMZ done."
