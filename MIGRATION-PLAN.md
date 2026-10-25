# Sarmad — Migration to the Customer's Private VPC

Revision 4 · 2026-09-27 · supersedes rev 1 (2026-09-13) and rev 2
Status: **ready to build once §10 is answered**

---

## 1. Target servers

| Name | Private IP | Internet (final state) | Role |
|---|---|---|---|
| `Chatbot-DMZ` | `172.17.1.26` | **yes — the only one** | public ingress, chatbot APIs, LiteLLM + all LLM logs, egress for the other two |
| `Chatbot-App` | `172.20.4.26` | no | OpenWebUI, pipelines, vector store |
| `Chatbot-DB` | `172.20.3.26` | no | Postgres + PostgREST |

Three different subnets → routed through the customer's firewall, not one L2.
Every flow in §4 must be an explicit rule.

**During migration** all three still have internet; **we never get a direct
connection to them.** Access is the web SSH console only. That single fact
drives the whole transport design (§6).

---

## 2. Source

`158.220.104.166` — Contabo, Ubuntu 22.04, 6 vCPU / 16 GiB, Coolify
4.0.0-beta.463, ~35 containers, multi-tenant.

Sarmad resources: service 10 `sarmad-with-open-webui`
(uuid `wso8c0oc4c88ksgkkcgc8g8w`, 20 containers), service 12
`sarmad-bubble-chat-api` (uuid `c4sk00cc4w00480kk0kwkkwc`), and **application 13
`sarmad-tts-wrapper-api`** (uuid `agwgkc8gowc848gk088c4840`, repo
`ChatCRM/tts_app@main`, commit `c4612f52`, container
`gemini-tts-…`, port 3000).

The TTS wrapper is easy to miss — nothing references it by name. OpenWebUI
reaches it through `config.data->'audio'->'tts'->'openai'->'api_base_url'` =
`https://rs0cwccwgsg8kg08sow84wck.apps.bizgpt.info/v1`. It holds a
`GOOGLE_API_KEY` and calls Gemini, so **it needs internet and therefore belongs
on DMZ**, and its image is built locally by Coolify — it exists in no registry,
so it must be saved as a tarball or rebuilt from the repo.

Hostnames today:

- `bimebot.sarmadins.ir` → OpenWebUI (بیمبا). **Live**, HTTP 200, A record
  158.220.104.166, **TTL 120**, zone on ArvanCDN nameservers
  (`n.ns.arvancdn.ir`, `h.ns.arvancdn.ir`), direct A record, not CDN-proxied.
  Because the TTL is already 120 s, the cutover needs **no 24-hour lead time**.
- `bimebot.sarmadins.openairan.info` → bubble-chat-api (website widget).
  **DEAD.** The entire `openairan.info` zone has **no NS records — NXDOMAIN**.
  Traefik has been failing its ACME renewal daily
  (`DNS problem: NXDOMAIN looking up A`), and the widget has been unreachable
  since the zone lost delegation. See §2.1.
- `supabasekong-…apps.bizgpt.info` → Supabase Kong (**public today, will not be**)
- `grafana-…apps.bizgpt.info` → Grafana

### 2.1 The widget has been down for months — fix this, do not migrate it

Widget conversations per month, from the `chat` table (service user
`3a77b53c-…`):

| month | chats |
|---|---|
| 2025-09 … 2026-02 | 404 · 435 · 511 · 517 · 338 · 602 |
| 2026-03 … 2026-05 | 0 |
| 2026-06, 2026-07 | 2, 2 — our own test requests while fixing the JWT |
| 2026-08, 2026-09 | 0 |

Two independent faults, both still open:

1. The widget JWT expired 2026-03-05. A non-expiring replacement was minted,
   but it was never pasted into the embed on sarmadins.ir — the token lives in
   that page, not on our servers.
2. The `openairan.info` zone lost its delegation, so even a valid token has
   nowhere to connect.

Meanwhile direct OpenWebUI usage is healthy and growing: 203 · 300 · 402 · 415
chats for 2026-06 through 2026-09. Only the widget channel is dark.

**Consequence for this migration:** do not carry
`bimebot.sarmadins.openairan.info` across. Give the widget API a hostname in a
zone that works and that the customer controls — `sarmadins.ir`, e.g.
`chat-api.sarmadins.ir`. That also removes a bizgpt-owned domain from the
customer's critical path, which is the right end state when the workload is
moving into their VPC. The widget embed on sarmadins.ir then needs **two**
edits in one go: the new URL and the valid JWT.

### Data inventory

| Item | Size | Action |
|---|---|---|
| Postgres DB `postgres` (`public` 221 MB + `auth`, `storage`) | **240 MB** | migrate |
| Chroma `vector_db` | **16 GB** (1 170 dirs, 1 031 collections, 157 302 embeddings) | migrate, split fast/slow (§7) |
| `cache/tiktoken` | 1.7 MB | migrate |
| `cache/` whisper 142 M + audio 66 M + embedding 88 M | 296 MB | **skip** — verified dead: `audio.stt.engine` is empty and `rag.embedding_engine` is `openai`, so neither the Whisper nor the sentence-transformers model is ever loaded |
| `nltk_data` (today inside the container's writable layer) | 79 MB | migrate |
| `uploads/` | 60 MB | migrate |
| Postgres DB `_supabase` (logflare `log_events_*`) | 38 GB | **discard** |
| Grafana | 52 MB | only if §10 Q4 says keep |

**Measured export, 2026-09-27: 463 MB total.** `pg.dump` 134 M · `chroma-core` 86 M · `uploads` 46 M · `nltk` 43 M · `images-tts` 155 M · `cache-tiktoken` 0.8 M · `globals.sql` 6 K · `env/` 44 K.
Row counts at export: chat 45 487 · user 197 · model 2 · knowledge 3 · file 637 · config 1.

---

## 3. Does Supabase need to be public? **No.**

Verified by reading the code, not the config:

- **OpenWebUI never touches Supabase REST.** `grep -rl supabase /app/backend`
  returns nothing. It uses `DATABASE_URL` → Postgres directly. Every
  `SUPABASE_*` variable in its environment is Coolify spraying the whole
  service env into every container. Noise.
- **The only Supabase consumer is `bubble-chat-api`**, and it uses exactly two
  calls on one table: `select("id, chat")` and `update({chat,title})` on
  `public.chat`.
- bubble-chat-api runs on **DMZ**, and DMZ can reach DB over the private
  network. So the Supabase endpoint becomes a private-only address.

### Kong is dropped

`supabase-kong` has `depends_on: supabase-analytics (healthy)` — Kong drags in
logflare, the thing that generated the 38 GB we are discarding. Not acceptable
in the new build.

Replacement: **PostgREST + a 6-line Caddy route** on Chatbot-DB that strips the
`/rest/v1` prefix `supabase-py` adds:

```caddyfile
:8000 {
    handle_path /rest/v1/* {
        reverse_proxy postgrest:3000
    }
}
```

bubble-chat-api changes by **one environment variable**:

```
SUPABASE_URL=http://172.20.3.26:8000     # was https://supabasekong-….apps.bizgpt.info
```

`SUPABASE_KEY` (the service-role JWT) and `PGRST_JWT_SECRET` stay identical, so
authorisation behaves exactly as today. No image rebuild, no code change.

### Supabase stack: 20 containers → 2

Deleted: kong, auth (GoTrue), realtime, storage, minio, minio-createbucket,
imgproxy, meta, edge-functions, supavisor, studio, analytics (logflare),
vector, ollama-api (zero models pulled, no GPU). Kept: `postgres`, `postgrest`.

### Coolify is dropped

No longer justified: one tenant, three servers, no build pipeline, no
multi-app routing. It also caused both past outages — the redeploy/image-prune
trap and the runaway-backup disk-full. Replacement is plain
`docker compose` + a `systemd` unit per server. Four files per box, readable at
3 a.m.

---

## 4. Target architecture

```
                 internet
                     │  DNAT 443 → 172.17.1.26
   ┌─────────────────▼───────────────────────────┐
   │ Chatbot-DMZ          172.17.1.26            │
   │   caddy            :443   TLS, both vhosts  │
   │   bubble-chat-api  :8000                    │
   │   feedback-report         (needs SMTP)      │
   │   litellm          :4000  ← ALL LLM LOGS    │
   │   litellm-postgres                          │
   │   registry:2       :5000  (image depot)     │
   │   tinyproxy        :8888  (egress for App)  │
   └──┬──────────────────┬───────────────────┬───┘
      │ 8080             │ 8000/5432         │ 443
┌─────▼──────────────┐ ┌─▼─────────────────┐ │
│ Chatbot-App        │ │ Chatbot-DB        │ │
│  172.20.4.26       │ │  172.20.3.26      │ │
│   open-webui :8080 │ │   postgres  :5432 │ │
│   pipelines  :9099 │ │   postgrest :3000 │ │
│   chroma volume    │ │   caddy     :8000 │ │
│   cache volume     │ │   nightly pg_dump │ │
└────────┬───────────┘ └───────────────────┘ │
         │ 5432 → DB                          │
         └────────────────────────────────────┘
                                              ▼
                              158.220.89.202  bizgpt-dev
                              tsmn-litellm  /openrouter
                                              │
                                              ▼
                                        openrouter.ai
```

### Firewall matrix

| From | To | Port | Why |
|---|---|---|---|
| internet | DMZ | 443, 80 | بیمبا UI + widget API |
| DMZ | App | 8080 | caddy → OpenWebUI |
| DMZ | App | 9099 | pipelines (if exposed) |
| DMZ | DB | 8000 | bubble → PostgREST |
| DMZ | DB | 5432 | feedback-report, backups |
| App | DB | 5432 | OpenWebUI `DATABASE_URL` |
| App | DMZ | 4000 | LLM calls via LiteLLM |
| App | DMZ | 5000 | image pulls from registry |
| App | DMZ | 8888 | forward proxy (SSO call, §5) |
| DMZ | 158.220.89.202 | 443 | OpenRouter relay |
| DMZ | smtp.zoho.com | 587 | feedback report email |
| App, DB | internet | — | **denied** |

### Request paths

**بیمبا:** browser → `bimebot.sarmadins.ir` → DMZ caddy → App `open-webui:8080`
→ model call → DMZ `litellm:4000` → `https://<relay>/openrouter/chat/completions`
→ OpenRouter.

**Widget:** browser → `bimebot.sarmadins.openairan.info` → DMZ caddy → DMZ
`bubble-chat-api:8000` → (a) DB PostgREST for `public.chat`, (b) OpenWebUI for
the completion.

### Two LiteLLM hops, on purpose

DMZ's LiteLLM does auth (per-app virtual keys), budgets, and **full
request/response logging into its own Postgres inside the VPC** — the
customer's requirement. `bizgpt-dev` is a dumb geographic relay that already
exists (`model_list: []`, pass-through `/openrouter`, 600 s timeout, key
injected server-side). Reuse it; deploy nothing new there.

---

## 5. Things that break if you only move containers

Found by reading the running images. Each one is a silent failure, not a crash.

1. **bubble-chat-api hardcodes the OpenWebUI URL.**
   `main.py` has `url = "https://bimebot.sarmadins.ir/api/chat/completions"` —
   it ignores `BUBBLE_API` for completions (that variable is only used by
   `/new-channel`). On DMZ this must hairpin to DMZ's own caddy so TLS and the
   certificate stay valid:
   ```yaml
   extra_hosts:
     - "bimebot.sarmadins.ir:172.17.1.26"
   ```
   No rebuild. Verify the hairpin works through the customer's firewall; if it
   does not, the fallback is a rebuild with the URL taken from env.

2. **OpenWebUI calls the customer's SSO from the App server.**
   `SARMAD_SSO_URL=https://sandbox.hz3.co/api/api/Account/Authentication/validateToken`,
   used in `apps/webui/routers/auths.py:247`. App has no internet. Either
   `hz3.co` is reachable inside the customer network (best — ask, §10 Q2), or
   this one call goes through `tinyproxy` on DMZ (`HTTPS_PROXY`,
   `NO_PROXY=172.20.0.0/16,172.17.0.0/16,localhost`).
   Note the code default is `sandbox.hz3.**ir**` — confirm the production URL.

3. **feedback-report needs SMTP** (`smtp.zoho.com:587`,
   `FEEDBACK_CRON_SCHEDULE=30 1 * * *`). It only needs Postgres + SMTP, so it
   **moves to DMZ**, not App. Cleaner than punching an SMTP hole outward.

4. **Model/NLTK/tiktoken caches must be pre-seeded.** `cache/` holds whisper
   (142 M), the sentence-transformers embedding model (88 M), tiktoken. NLTK
   data currently lives in `/root/nltk_data` **inside the container's writable
   layer** and is lost on any recreate; it was already an incident once. Fix
   permanently: mount it and set `NLTK_DATA=/app/backend/data/nltk_data`,
   seeded from the old box. With no internet, an unseeded cache is a hard
   failure, not a slow first request.

5. **Embedding model must not change.** RAG is indexed with
   `text-embedding-3-large` @ 3072 dims via the OpenAI-compatible engine.
   Route `/v1/embeddings` through LiteLLM to the *same* upstream model, then
   assert the returned vector length is 3072. Any change forces a full re-embed
   of all three knowledge collections.

6. **Ollama toggle.** `config.data->'ollama'->'enable'` must stay `true` or this
   custom build's Models/Connections admin pages hang. Ollama itself is deleted,
   so point `OLLAMA_BASE_URL` at a dead address and confirm the pages still
   load during rehearsal — otherwise keep one idle ollama container.

7. **Widget JWT lives on sarmadins.ir, not on our servers.** `JWT_SECRET` must
   be carried over byte-identical or every widget session 401s.

8. **DNS on App and DB.** No internet means no public resolver. Set the
   customer's internal resolver, or pin `/etc/hosts` for the handful of names
   used. Docker daemon on App/DB also needs
   `"insecure-registries": ["172.17.1.26:5000"]`.

---

## 6. Transport: the foreign server as a depot

We cannot push into the VPC. But the VPC servers **can pull**, and they still
have internet during the migration. So:

```
158.220.104.166  ──push──►  158.220.89.202  ◄──pull──  Chatbot-DMZ / App / DB
   (old box)                  (bizgpt-dev,              (web SSH console,
                               depot over HTTPS)          one curl per box)
```

**Depot** on `bizgpt-dev` (158.220.89.202 — 6 vCPU/15 GiB, **disk 84 % used,
~60 G free: check before every upload, clean up after**):

- `/srv/sarmad-migration/` served by a new nginx vhost on an unguessable path
  plus basic auth, TLS only.
- Contents: `pg.dump`, `globals.sql`, `chroma-core.tar.zst`,
  `chroma-rest.tar.zst`, `cache.tar.zst`, `uploads.tar.zst`, `images.tar`,
  `secrets.env.age`, `SHA256SUMS`, and the bootstrap scripts.
- Secrets are **age-encrypted**; the passphrase travels out of band, never
  through the depot.
- Delete the whole directory and the vhost on the day of Phase 9.

**Every server action is then a one-liner** you paste into the web console:

```bash
curl -fsSL https://<depot>/<path>/bootstrap-app.sh | sudo bash
```

Each bootstrap script: installs docker, writes the compose file and `.env`,
pulls its artefacts from the depot, verifies `sha256sum -c`, loads images,
starts the stack. Idempotent — safe to re-run after a failure.

### Images

Private ghcr images (`openwebui-integration`,
`openwebui-feedback-report`, `bizgpt-openwebui-pipeline`, `bubble-chat-api`)
plus public ones (`supabase/postgres:15.1.1.78`, `postgrest`, `caddy`,
`litellm`, `postgres:16-alpine`, `registry:2`, `tinyproxy`).

`docker save` them all on the old box → depot → `docker load` on each server.
This removes the whole registry-credential fragility from the critical path
(the `bizgpt-apps` GitHub App still lacks `packages:read`, and the PAT that
currently works was exposed in chat and should be rotated).

**After** cutover, the `registry:2` on DMZ becomes the permanent path: DMZ
pulls/pushes, App and DB pull from `172.17.1.26:5000`. That is how updates work
once App and DB lose internet for good.

---

## 7. Data migration, the easy and reliable way

### Postgres — logical dump, not a file copy

The target runs the **same image**, `supabase/postgres:15.1.1.78`. That is not
cosmetic: the dump carries `CREATE EXTENSION` for pgsodium, vault, pg_net,
pg_graphql and objects owned by supabase roles (`authenticator`, `anon`,
`authenticated`, `service_role`, `supabase_storage_admin`). A plain
`postgres:15` would reject them.

On the old box:

```bash
docker exec supabase-db-wso8c0oc4c88ksgkkcgc8g8w \
  pg_dumpall -U postgres --globals-only > globals.sql
docker exec supabase-db-wso8c0oc4c88ksgkkcgc8g8w \
  pg_dump -U postgres -Fc -d postgres -n public > pg.dump
```

134 MB, about a minute. `_supabase` is never touched. `public` alone is enough:
it has **zero foreign keys into other schemas** (verified), and `auth`/`storage`
belong to GoTrue and Supabase Storage, both of which are being deleted.

On Chatbot-DB:

```bash
psql -U postgres -f globals.sql                 # roles + passwords
pg_restore -U postgres -d postgres -j4 pg.dump
```

Verify — not "it looked fine":

```sql
SELECT 'chat' t, count(*) FROM chat
UNION ALL SELECT 'user',      count(*) FROM "user"
UNION ALL SELECT 'model',     count(*) FROM model
UNION ALL SELECT 'knowledge', count(*) FROM knowledge
UNION ALL SELECT 'file',      count(*) FROM file
UNION ALL SELECT 'config',    count(*) FROM config;
```

Run it on both boxes, diff the output. Then confirm
`config` row 1 still has `rag.chunk_size = 1000`, `chunk_overlap = 100`,
`ollama.enable = true`, and that `model.base_model_id` for
`sarmad-bimba-model` is a provider-prefixed id that the new LiteLLM route
actually serves.

### Chroma — 16 GB, but only ~1.5 GB is live

1 170 directories / 1 031 collections / 157 302 embeddings, most of it dead
weight from the per-character-chunking era. بیمبا only reads three knowledge
collections. Map collection → on-disk segment directory:

```sql
SELECT c.name, s.id AS segment_dir
FROM collections c JOIN segments s ON s.collection = c.id
WHERE c.name IN ('26634167-21ca-4f9e-8a99-07235264f4bb',
                 '098744e2-e048-4b33-af80-b07d3d6a671b',
                 '9c9fce9c-0453-400e-8eed-6bd7f6ec73fe');
```

Each collection returns **two** segment rows, but only the **vector** segment
has a directory on disk — the metadata segment lives inside `chroma.sqlite3`.
Copy the directories that exist and skip the rest; three directories, 735 MB
raw, 86 MB compressed.

So the transfer splits:

- **`chroma-core.tar.zst`** — `chroma.sqlite3` (688 MB) + the six segment
  directories above. ~1.5 GB. This is on the critical path.
- **`chroma-rest.tar.zst`** — everything else. Backfilled *after* cutover;
  it only affects per-file collections on old chats with attachments.

`chroma.sqlite3` also carries 54 094 free pages — `VACUUM` a **copy** before
tarring, never the live file.

Stop OpenWebUI before tarring the sqlite, or use
`sqlite3 chroma.sqlite3 ".backup /tmp/chroma.sqlite3"` for a consistent copy.

### Everything else

`cache/` (293 MB) and `uploads/` (60 MB) tar straight across. Seed
`nltk_data` into the mounted path at the same time.

### Totals

Measured, not estimated:

| Bundle | Size | Path |
|---|---|---|
| pg.dump + globals | 134 MB | critical |
| chroma-core | 86 MB | critical |
| uploads | 46 MB | critical |
| nltk | 43 MB | critical |
| images-tts | 155 MB | critical |
| cache-tiktoken | 0.8 MB | critical |
| chroma-rest | ~14 GB | optional, after cutover |

**Critical path = 463 MB.** The 17 GB of application images are not in it:
DMZ still has internet during the migration, so it pulls them from ghcr and
pushes them into its own `registry:2` for App and DB. The only image that must
travel as a tarball is the locally-built TTS wrapper, which exists in no
registry.

---

## 8. Phases

### Phase 0 — Prerequisites

- [ ] Answers to §10.
- [ ] Confirm the DMZ public IP / DNAT for 443, and that the customer will
      permit inbound.
- [ ] Confirm the firewall matrix in §4 will be implemented.
- [ ] Confirm each server's specs and disk. Suggested: DB 4 vCPU / 8 GB /
      100 GB · App 4 vCPU / 8 GB / 100 GB · DMZ 2 vCPU / 4 GB / 60 GB.
- [ ] Confirm the web SSH console supports paste (the whole runbook assumes
      copy-paste of one-liners).
- [ ] DNS control for `sarmadins.ir` and `openairan.info`; ability to drop TTL
      24 h ahead.
- [ ] Rotate the ghcr PAT.

### Phase 1 — Capture (old box, zero downtime)

- [ ] `docker save` every image needed → `images.tar`.
- [ ] `pg_dumpall --globals-only` + `pg_dump -Fc` (§7).
- [ ] `docker exec … env` for open-webui, pipelines, feedback-report and
      bubble-chat-api → `secrets.env`, then `age`-encrypt.
      Must include: `JWT_SECRET`, `WEBUI_SECRET_KEY`, `BUBBLE_TOKEN`,
      `USER_ID`, `ALLOWED_ORIGINS`, `SERVICE_PASSWORD_POSTGRES`,
      `SERVICE_SUPABASESERVICE_KEY`, `SERVICE_PASSWORD_JWT`, OpenRouter key,
      SMTP credentials.
      (Take them from the *running containers* — Coolify's compose hardcodes
      some values that override `.env`.)
- [ ] `SELECT data FROM config WHERE id=1` → keep a copy.
- [ ] chroma core + rest tars, cache, uploads, nltk.
- [ ] `sha256sum` everything.

### Phase 2 — Depot

- [ ] `/srv/sarmad-migration/` on 158.220.89.202, nginx vhost, TLS, basic auth,
      unguessable path. **Check `df -h` first — the box is at 84 %.**
- [ ] Upload. Verify checksums from a third machine.
- [ ] Publish `bootstrap-{db,app,dmz}.sh` alongside.

### Phase 3 — Base build (all three, via web console)

- [ ] `bootstrap-common`: docker CE, ufw per §4, ssh hardening,
      unattended-upgrades, chrony, journald cap,
      `insecure-registries: ["172.17.1.26:5000"]` on App and DB.
- [ ] Verify each box can reach the depot and its two peers, and nothing else.

### Phase 4 — Chatbot-DB

- [ ] `postgres` (supabase image) + `postgrest` + `caddy` path-strip.
- [ ] Restore globals then dump. Run the verification query on **both** boxes
      and diff.
- [ ] From DMZ: `curl http://172.20.3.26:8000/rest/v1/chat?limit=1` with the
      service key → expect a row. This is the whole Supabase surface now.
- [ ] Nightly `pg_dump`, **retention 7**, `df` alert at 80 %.

### Phase 5 — Chatbot-App

- [ ] open-webui + pipelines. Load images from depot.
- [ ] Restore `chroma-core`, `cache/`, `uploads/`, `nltk_data`.
- [ ] `DATABASE_URL` → `172.20.3.26:5432`;
      `OPENAI_API_BASE_URL` → `http://172.17.1.26:4000/v1`;
      `NLTK_DATA` → mounted path; proxy vars for the SSO call if needed.
- [ ] `curl http://127.0.0.1:8080/health` inside the container.

### Phase 6 — Relay (158.220.89.202)

- [ ] nginx vhost with TLS in front of `127.0.0.1:4000`,
      `proxy_read_timeout 600s`, source-IP restricted to the DMZ public IP.
- [ ] A **dedicated Sarmad virtual key** — do not reuse the tsmn key.
- [ ] Confirm the OpenRouter balance. A past outage was "requires more credits"
      from an unbounded `max_tokens`; `sarmad-bimba-model` is capped at 8192,
      keep it.

### Phase 7 — Chatbot-DMZ

- [ ] caddy (both vhosts, ACME), litellm + its postgres, bubble-chat-api
      (with the `extra_hosts` hairpin), feedback-report, registry, tinyproxy.
- [ ] LiteLLM virtual keys: one each for open-webui, bubble-chat-api,
      pipelines, with per-key budgets.
- [ ] `store_prompts_in_spend_logs: true`, `DATABASE_URL` → local postgres.
- [ ] Verify through LiteLLM: `/v1/models`, a chat completion, and an
      `/v1/embeddings` call — **assert 3072 dims**.

### Phase 8 — Rehearsal (no DNS change)

Reach the new stack from a test machine via `/etc/hosts`.

- [ ] Log into بیمبا. Ask a question that must hit RAG; confirm citations and a
      grounded answer, not a generic one.
- [ ] SSO login path works (or is confirmed out of scope).
- [ ] Widget: `POST /api/v1/new-channel`, then `/api/v1/bubble` with the
      **production** JWT → 200, and the row appears in `public.chat` with
      `title='bubble_chat_frontend'`.
- [ ] The request shows up in LiteLLM's spend log with model, tokens, cost,
      latency, key.
- [ ] Admin Models and Connections pages load.
- [ ] Trigger feedback-report manually; an email arrives.
- [ ] Fix everything here. Do not carry known breakage into Phase 9.

### Phase 9 — Cutover

1. T-24 h: TTL to 60 s on both hostnames.
2. Stop `open-webui` and `sarmad-bubble-chat-api` on the **old** box. Writes
   frozen; old data untouched.
3. Delta `pg_dump` → restore. Delta of `uploads/` and `chroma-core`. Minutes.
4. Start the new stack; run the verification script.
5. Flip both DNS records to the DMZ public IP.
6. Watch caddy access log, LiteLLM spend log, `chat` insert rate.
7. Backfill `chroma-rest` in the background.
8. Delete nothing on the old box.

Rollback before step 5 is a no-op (old box still live). After step 5: flip DNS
back, restart the two old containers, and copy back rows written since
cutover — which is why the freeze exists.

### Phase 10 — Cut the cord, then aftercare

- [ ] Only now: remove internet from App and DB. Re-run the Phase 8 checks —
      this is when a missed cache or a forgotten egress dependency surfaces.
- [ ] Push all images into the DMZ registry so updates keep working.
- [ ] 14 days with the old box powered but stopped.
- [ ] Test-restore a backup into a scratch database. A backup you have not
      restored is not a backup.
- [ ] Delete the depot on 158.220.89.202 and its vhost.
- [ ] Decommission the Sarmad service on the old box (frees ~55 GB).
- [ ] Hand over: diagram, runbook, backup/restore procedure, log-retention
      policy.

---

## 9. Log design (LiteLLM on DMZ)

Per request: timestamp, virtual key → app identity, model, upstream, prompt
tokens, completion tokens, cost, latency, status, and with
`store_prompts_in_spend_logs` the full prompt and response.

Prompt bodies are insurance-customer conversations. Pick one (§10 Q5): full,
metadata-only, or full with an N-day purge. Ship the purge cron regardless —
it is one line and it is the difference between a log and a liability.

---

## 10. Open questions

| # | Question | Why it blocks |
|---|---|---|
| Q1 | DMZ public IP / DNAT for inbound 443. **Not yet available** — see §12 for what proceeds without it. | Blocks ACME certificates, inbound testing and the DNS flip. Blocks nothing else. |
| Q10 | New hostname for the widget API under `sarmadins.ir` (§2.1), and who edits the embed on sarmadins.ir? | The widget cannot come back without both. |
| Q2 | Is `sandbox.hz3.co` (SSO) reachable from inside the VPC, or must it go through the DMZ proxy? And is that the production URL? | §5 item 2. Silent login breakage otherwise. |
| Q3 | Can DMZ hairpin to its own public hostname (`bimebot.sarmadins.ir` → itself)? | §5 item 1. If not, bubble-chat-api needs a rebuild. |
| Q4 | Keep Grafana? Keep Supabase Studio? | If no, they are deleted, not migrated. |
| Q5 | Prompt-log retention: full / metadata-only / full + N-day purge? Any rule against prompts transiting 158.220.89.202 (Germany)? | Compliance. Note it is already true today via OpenRouter. |
| Q6 | Does the web SSH console support paste and outbound `curl`? | The entire runbook is `curl … \| bash` one-liners. |
| Q7 | Acceptable cutover window and date? | Phase 9. |
| Q8 | Server specs and disk actually allocated? | App needs ~40 GB for chroma + cache; DB ~20 GB plus backups. |
| Q9 | Do the other tenants on the old box (yt_guru, meshcentral, bidram, vakilgpt, openairan, n8n, uptime-kuma) stay where they are? | This plan assumes **Sarmad only**. |

---

## 11. Decisions taken

- **Coolify is gone.** Plain compose + systemd.
- **Supabase is private.** Kong deleted (it depends on logflare); PostgREST
  plus a Caddy path-strip replaces it; bubble-chat-api changes one env var.
- **20 containers → 2** on the data tier; ollama deleted.
- **feedback-report moves to DMZ** (needs SMTP, not App-local anything).
- The 38 GB `_supabase` logflare database is discarded.
- **Foreign box `bizgpt-dev` is the depot** for the migration and the reused
  OpenRouter relay afterwards. No second LiteLLM deployed there.
- **Chroma is split**: ~1.5 GB live on the critical path, ~14 GB backfilled
  after cutover.
- **Images ship as `docker save` tarballs**, then a `registry:2` on DMZ for the
  long term. Registry credentials are off the critical path.
- Internet is removed from App and DB **after** a successful rehearsal on the
  new stack, not before.


---

## 12. Working order while the DMZ public IP is unknown

The missing public IP blocks three things only: ACME certificates for the
public hostnames, inbound testing from a browser, and the DNS flip itself.
Everything else proceeds.

Note the DMZ's **egress** address is a different thing from its inbound one,
and you can read it the moment the box is up — `curl -4 ifconfig.me` from the
console. That is what the relay's allow-list needs.

| # | Step | Blocked? |
|---|---|---|
| 1 | Decide the widget hostname under `sarmadins.ir` (§2.1) | no |
| 2 | Relay: nginx vhost + TLS in front of `127.0.0.1:4000`, mint the Sarmad virtual key. Restrict by key now, add the source-IP allow once the egress IP is known | no |
| 3 | Stage the depot (463 MB) on 158.220.89.202 | no |
| 4 | **Build Chatbot-DB and restore the dump.** Biggest piece of real work, zero dependency on any public address | no |
| 5 | Build Chatbot-App, restore chroma/uploads/nltk/tiktoken, point it at DB and at the DMZ LiteLLM | no |
| 6 | Build Chatbot-DMZ: registry, LiteLLM + its postgres, bubble-chat-api, feedback-report, TTS wrapper | no |
| 7 | Repoint the three URLs held in the `config` table (§5 of the runbook) | no |
| 8 | Rehearse over private addresses, with Caddy issuing an internal certificate instead of ACME | no |
| 9 | Caddy ACME for the public hostnames | **yes** |
| 10 | Browser-side inbound testing | **yes** |
| 11 | DNS flip — trivial once it arrives, TTL is already 120 s | **yes** |

So roughly 80 % of the migration can be finished before the customer supplies
the address, and steps 9–11 are a single afternoon once it exists.
