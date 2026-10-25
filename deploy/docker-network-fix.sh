#!/usr/bin/env bash
# Run once per VM, before anything else. Root.
#
# The VMs live on 172.17.1.x, 172.20.3.x and 172.20.4.x. Docker's DEFAULT
# address pool is 172.17.0.0/12 carved into /16s, so the first compose network
# takes 172.17.0.0/16 and a later one takes 172.20.0.0/16 — straight over the
# top of the other VMs. The host then routes their traffic into a bridge
# instead of out the NIC, and ssh hangs.
#
# "bip" alone does NOT fix this: it only moves the docker0 bridge. User-defined
# networks (everything docker compose creates) come from default-address-pools.
set -euo pipefail

BIP=${BIP:-10.200.0.1/24}
POOL=${POOL:-10.201.0.0/16}
CFG=/etc/docker/daemon.json

command -v python3 >/dev/null || { echo "FATAL: python3 required"; exit 1; }

echo "== existing routes (the thing we must not collide with) =="
ip -4 route | awk '{print $1}' | grep -E '^[0-9]' | sort -u

# The python block signals "nothing to change" with exit 3. Under `set -e`
# that would kill this script before `rc=$?` ever ran — and the caller with it.
set +e
python3 - "$CFG" "$BIP" "$POOL" <<'PY'
import ipaddress, json, os, subprocess, sys
cfg, bip, pool = sys.argv[1], sys.argv[2], sys.argv[3]

want_conf = {"bip": bip, "default-address-pools": [{"base": pool, "size": 24}]}

conf = {}
if os.path.exists(cfg):
    try: conf = json.load(open(cfg))
    except json.JSONDecodeError: sys.exit(f"FATAL: {cfg} is not valid JSON; fix it by hand first")

already = all(conf.get(k) == v for k, v in want_conf.items())
if already:
    # Nothing to do. Do NOT run the overlap check: docker itself now owns
    # routes for these ranges, and they would look like conflicts.
    print("daemon.json already correct")
    sys.exit(3)

# Collect routes, skipping the ones docker created — a previous run of this
# script legitimately puts bip and the pool into the routing table.
DOCKER_IFACES = ("docker0", "br-", "veth", "docker_gwbridge")
routes = []
for line in subprocess.run(["ip", "-4", "route"], capture_output=True, text=True).stdout.splitlines():
    parts = line.split()
    if not parts: continue
    dev = parts[parts.index("dev") + 1] if "dev" in parts else ""
    if dev.startswith(DOCKER_IFACES): continue
    try: routes.append((ipaddress.ip_network(parts[0], strict=False), dev))
    except ValueError: continue

for w in (ipaddress.ip_network(bip, strict=False), ipaddress.ip_network(pool)):
    for r, dev in routes:
        if r.prefixlen == 0: continue          # default route overlaps everything
        if w.overlaps(r):
            sys.exit(f"FATAL: chosen range {w} overlaps existing route {r} on {dev}.\n"
                     f"Re-run with BIP=... POOL=... pointing somewhere unused.")

conf.update(want_conf)
os.makedirs(os.path.dirname(cfg), exist_ok=True)
if os.path.exists(cfg):
    os.replace(cfg, cfg + ".bak")
    print(f"previous config saved to {cfg}.bak")
json.dump(conf, open(cfg, "w"), indent=2)
print("wrote", cfg, "->", json.dumps(conf))
PY
rc=$?
set -e
if [ $rc -eq 3 ]; then
  echo "no daemon restart needed"
else
  echo "== removing networks already created from the bad pool =="
  docker network prune -f || true
  echo "== restarting docker =="
  systemctl restart docker
  sleep 3
fi

echo "== result =="
ip -4 addr show docker0 2>/dev/null | awk '/inet /{print "  docker0:", $2}'
docker network ls --format '  {{.Name}}' | head
for n in $(docker network ls -q); do
  docker network inspect "$n" --format '  {{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
done
echo
echo "Nothing above may start with 172.17. or 172.20."

exit 0
