# deploy/ — runbook

Companion to `../MIGRATION-PLAN.md`. That document says *why*; this one is the
order of operations.

Everything here assumes the one constraint that shapes the design: **we never
get a direct connection into the VPC.** The three servers are reachable only
through a web SSH console that supports paste and outbound `curl`. So the
servers pull; nothing pushes to them.

```
158.220.104.166  ──►  your machine  ──►  158.220.89.202      VPC servers
   (old box)          (orchestrator)     (depot, HTTPS)  ◄── pull, one
                                                              curl each
```

## Layout

| Path | Runs on | Does |
|---|---|---|
| `migrate/export.sh` | old box | dumps Postgres, captures the effective env, tars chroma/cache/uploads/nltk, saves images |
| `migrate/publish-depot.sh` | your machine | builds role env files, packs stacks, publishes the depot |
| `common.sh` | each VPC server | shared functions, sourced by the bootstraps |
| `db/`, `app/`, `dmz/` | respective server | compose + config + bootstrap |
| `migrate/verify.sh` | DMZ | the gate for Phase 9 |

## Order

### 1. Export (old box, no downtime)

```bash
scp deploy/migrate/export.sh root@158.220.104.166:/root/
ssh root@158.220.104.166 'bash /root/export.sh'
```

Writes `/root/sarmad-export`. Safe during business hours — it takes a
`.backup` of the chroma sqlite rather than copying a live file. Note the row
counts it prints; you will diff them later.

### 2. Publish the depot (your machine)

```bash
export DEPOT_PATH=$(openssl rand -hex 16)
export RELAY_BASE=https://<relay-vhost>/openrouter
export RELAY_KEY=<the Sarmad virtual key you minted on 158.220.89.202>
export SSO_UPSTREAM=https://sandbox.hz3.co
deploy/migrate/publish-depot.sh
```

It will ask for a passphrase — that encrypts `env.tar.zst.age`, which holds
every secret. **Send that passphrase by a different channel than the depot
URL.** The script prints the exact three one-liners to paste.

`bizgpt-dev` sits near 84 % disk; the script prints `df` before and after.

### 3. Bootstrap, in this order

DMZ first (it holds the registry and the only egress), then DB, then App.

```bash
export DEPOT='https://<user>:<pass>@<depot-host>/<path>'
curl -fsSL "$DEPOT/bootstrap-dmz.sh" | sudo -E bash
curl -fsSL "$DEPOT/bootstrap-db.sh"  | sudo -E bash
curl -fsSL "$DEPOT/bootstrap-app.sh" | sudo -E bash
```

Each is idempotent — re-run after a failure, it resumes. `curl -C -` means an
interrupted 4 GB image tarball continues rather than restarts.

The DB bootstrap ends by printing row counts. Diff them against step 1.

### 4. Rehearse

Point a test machine's `/etc/hosts` at the DMZ address for both hostnames, then
work through Phase 8 of the plan by hand. Ask بیمبا something that can only be
answered from the knowledge base; a fluent but sourceless answer means
retrieval is broken even though nothing errored.

### 5. Cut over

```bash
ssh root@158.220.104.166 'FREEZE=1 bash /root/export.sh'   # consistent delta
deploy/migrate/publish-depot.sh data
# re-run bootstrap-db.sh and bootstrap-app.sh — they pick up the new artifacts
```

Then flip DNS, and on DMZ:

```bash
WIDGET_JWT=<the token embedded on sarmadins.ir> sudo -E /opt/sarmad/verify.sh
```

### 6. Backfill and cut the cord

```bash
BACKFILL=1 curl -fsSL "$DEPOT/bootstrap-app.sh" | sudo -E bash   # the other ~14 GB
```

Only then ask the customer to remove internet from App and DB, and re-run
`verify.sh`. That is when a missed cache or a forgotten egress path shows up —
which is exactly why it happens with the old box still standing.

Finally delete the depot:

```bash
ssh bizgpt-dev 'sudo rm -rf /srv/sarmad-migration'
```

## What to change before running any of this

- `dmz/.env` values `RELAY_BASE`, `RELAY_KEY`, `SSO_UPSTREAM` — the publish
  script writes `CHANGE-ME` if you do not export them.
- `dmz/Caddyfile` — the ACME contact address.
- `dmz/litellm-config.yaml` — the model ids must match
  `model.base_model_id` in the OpenWebUI database. Check with:
  `SELECT id, base_model_id FROM model WHERE id='sarmad-bimba-model';`
  A mismatch is an HTTP 500 on every chat, with nothing useful in the log.

## Things that will bite if skipped

- `JWT_SECRET` must arrive byte-identical, or every website widget session
  401s. It is captured from the running container, not retyped.
- The embedding model must stay `text-embedding-3-large` at 3072 dims.
  `verify.sh` asserts this.
- App has no internet, so `cache/` and `nltk_data` are not optional — an empty
  cache is a hard failure there, not a slow first request.
- `bubble-chat-api` hardcodes `https://bimebot.sarmadins.ir/...`; the
  `extra_hosts` entry in `dmz/docker-compose.yml` is what makes it hairpin to
  our own caddy. Do not remove it.
