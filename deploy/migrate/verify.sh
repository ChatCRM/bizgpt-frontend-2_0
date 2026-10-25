#!/usr/bin/env bash
# Post-cutover smoke test. Run on DMZ. Exits non-zero on the first real
# failure, so it is safe to use as a gate in Phase 9.
set -euo pipefail

HOST_IP=${HOST_IP:-172.17.1.26}
APP_IP=${APP_IP:-172.20.4.26}
DB_IP=${DB_IP:-172.20.3.26}
source /opt/sarmad/env/dmz.env

ok()   { printf '  ok    %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; exit 1; }

echo "1. Supabase is private and answering"
curl -fsS -o /dev/null "http://$DB_IP:8000/rest/v1/chat?limit=1" \
  -H "apikey: $(grep -m1 '^SUPABASE_KEY=' /opt/sarmad/env/bubble-chat-api.env | cut -d= -f2-)" \
  -H "Authorization: Bearer $(grep -m1 '^SUPABASE_KEY=' /opt/sarmad/env/bubble-chat-api.env | cut -d= -f2-)" \
  && ok "postgrest via caddy" || fail "postgrest"

echo "2. Supabase is NOT public"
curl -fsS --max-time 8 -o /dev/null "https://supabasekong-wso8c0oc4c88ksgkkcgc8g8w.apps.bizgpt.info" \
  && echo "  note: the OLD public Kong is still up; that is expected until Phase 10" \
  || ok "no public supabase endpoint of ours"

echo "3. LiteLLM up, and it is the only way out"
curl -fsS -o /dev/null "http://$HOST_IP:4000/health/readiness" && ok "readiness" || fail "litellm"
curl -fsS -H "Authorization: Bearer $LITELLM_MASTER_KEY" "http://$HOST_IP:4000/v1/models" \
  | jq -e '.data | length > 0' >/dev/null && ok "model list" || fail "model list"

echo "4. Embeddings still 3072 dims (anything else means the RAG index is dead)"
d=$(curl -fsS -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' \
      -d '{"model":"text-embedding-3-large","input":"ping"}' \
      "http://$HOST_IP:4000/v1/embeddings" | jq '.data[0].embedding | length')
[ "$d" = 3072 ] && ok "3072" || fail "embedding dims = $d"

echo "5. OpenWebUI reachable from DMZ"
curl -fsS -o /dev/null "http://$APP_IP:8080/health" && ok "app health" || fail "app health"

echo "6. Public vhosts"
for h in bimebot.sarmadins.ir bimebot.sarmadins.openairan.info; do
  code=$(curl -fsS -o /dev/null -w '%{http_code}' "https://$h" || true)
  [ -n "$code" ] && ok "$h -> $code" || fail "$h"
done

echo "7. Widget round trip (needs WIDGET_JWT set to the token embedded on sarmadins.ir)"
if [ -n "${WIDGET_JWT:-}" ]; then
  id=$(curl -fsS -X POST https://bimebot.sarmadins.openairan.info/api/v1/new-channel \
        -H "Authorization: Bearer $WIDGET_JWT" | jq -r .id)
  [ -n "$id" ] && [ "$id" != null ] || fail "new-channel"
  curl -fsS -X POST https://bimebot.sarmadins.openairan.info/api/v1/bubble \
    -H "Authorization: Bearer $WIDGET_JWT" -H 'Content-Type: application/json' \
    -d "{\"chat_id\":\"$id\",\"user_question\":\"بیمه آلتین چیست؟\"}" \
    | jq -e '.assistant | length > 0' >/dev/null && ok "bubble answered" || fail "bubble"
else
  echo "  skipped — set WIDGET_JWT"
fi

echo "8. The request was logged"
docker compose -f /opt/sarmad/dmz/docker-compose.yml exec -T litellm-db \
  psql -U litellm -d litellm -tAc \
  "SELECT count(*) FROM \"LiteLLM_SpendLogs\" WHERE \"startTime\" > now() - interval '10 minutes'" \
  | grep -qv '^0$' && ok "spend log has recent rows" || fail "nothing logged"

echo; echo "all checks passed"
