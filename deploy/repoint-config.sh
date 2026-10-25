#!/usr/bin/env bash
# Runs on Chatbot-DB, AFTER the DMZ stack is up.
#
# Three URLs that OpenWebUI uses live in the `config` table, not in env vars —
# so moving the containers does not move them. OpenWebUI caches this row at
# startup, so open-webui on the App box must be restarted afterwards.
set -euo pipefail
D=/opt/sarmad
DMZ_IP=${DMZ_IP:-172.17.1.26}
cd $D/db

pick(){ grep -m1 "^$1=" "$D/env/$2" | cut -d= -f2-; }
WSK=$(pick WEBUI_SECRET_KEY open-webui.env); [ -n "$WSK" ] || WSK=$(pick SERVICE_PASSWORD_JWT open-webui.env)
KEY="sk-$(printf '%s' "${WSK}litellm-master" | sha256sum | cut -c1-40)"   # same derivation as DMZ

LLM="http://$DMZ_IP:4000/v1"
TTS="http://$DMZ_IP:3001/v1"

echo "== before =="
docker compose exec -T postgres psql -U postgres -d postgres -tAc "
SELECT 'openai : '||((data::jsonb)->'openai'->'api_base_urls')::text
     ||E'\nrag    : '||((data::jsonb)->'rag'->>'openai_api_base_url')
     ||E'\ntts    : '||((data::jsonb)->'audio'->'tts'->'openai'->>'api_base_url')
     ||E'\nollama : '||((data::jsonb)->'ollama'->>'enable')
FROM config WHERE id=1;" </dev/null

docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
-- Applied one key at a time: easier to read than nested jsonb_set, and a
-- failure names the key that failed instead of collapsing the whole update.
UPDATE config SET data = jsonb_set(data::jsonb, '{openai,api_base_urls}', '["$LLM"]'::jsonb)::json WHERE id=1;
UPDATE config SET data = jsonb_set(data::jsonb, '{openai,api_keys}',      '["$KEY"]'::jsonb)::json WHERE id=1;
UPDATE config SET data = jsonb_set(data::jsonb, '{rag,openai_api_base_url}', to_jsonb('$LLM'::text))::json WHERE id=1;
UPDATE config SET data = jsonb_set(data::jsonb, '{rag,openai_api_key}',      to_jsonb('$KEY'::text))::json WHERE id=1;
UPDATE config SET data = jsonb_set(data::jsonb, '{audio,tts,openai,api_base_url}', to_jsonb('$TTS'::text))::json WHERE id=1;
-- Ollama is not deployed in the new stack. Leaving it enabled makes
-- open-webui retry ollama-api:11434 on every model list and return 500 on
-- /ollama/api/version.
UPDATE config SET data = jsonb_set(data::jsonb, '{ollama,enable}',    'false'::jsonb)::json WHERE id=1;
UPDATE config SET data = jsonb_set(data::jsonb, '{ollama,base_urls}', '[]'::jsonb)::json     WHERE id=1;
SQL

echo "== after =="
docker compose exec -T postgres psql -U postgres -d postgres -tAc "
SELECT 'openai : '||((data::jsonb)->'openai'->'api_base_urls')::text
     ||E'\nrag    : '||((data::jsonb)->'rag'->>'openai_api_base_url')
     ||E'\ntts    : '||((data::jsonb)->'audio'->'tts'->'openai'->>'api_base_url')
     ||E'\nembed  : '||((data::jsonb)->'rag'->>'embedding_model')
     ||E'\nchunk  : '||((data::jsonb)->'rag'->>'chunk_size')||'/'||((data::jsonb)->'rag'->>'chunk_overlap')
     ||E'\nollama : '||((data::jsonb)->'ollama'->>'enable')
FROM config WHERE id=1;" </dev/null

echo
echo "bimba model pin (must be a model LiteLLM serves):"
docker compose exec -T postgres psql -U postgres -d postgres -tAc \
  "SELECT id||' -> '||coalesce(base_model_id,'(none)') FROM model;" </dev/null

echo
echo "NOW restart open-webui on the App box, or none of this takes effect:"
echo "  cd /opt/sarmad/app && docker compose restart open-webui"
