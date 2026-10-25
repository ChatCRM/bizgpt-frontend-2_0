# Sourced by every bootstrap script. Not executable on its own.
set -euo pipefail

: "${DEPOT:?set DEPOT=https://user:pass@host/<secret-path>}"
STACK_DIR=/opt/sarmad
log() { printf '\n== %s\n' "$*"; }

fetch() { # fetch <remote-name> [dest]
  local name=$1 dest=${2:-$STACK_DIR/dl/$1}
  mkdir -p "$(dirname "$dest")"
  [ -s "$dest" ] && { log "have $name"; return; }
  log "fetch $name"
  curl -fsSL --retry 5 --retry-delay 5 -C - -o "$dest" "$DEPOT/$name"
}

verify_sums() { # verify_sums <file>...
  log "verify checksums"
  ( cd "$STACK_DIR/dl" && grep -E " ($(IFS='|'; echo "$*"))\$" SHA256SUMS | sha256sum -c - )
}

require_tools() {
  # Docker is already provisioned on these hosts; do not install anything.
  for c in docker zstd gpg curl; do
    command -v "$c" >/dev/null || { echo "FATAL: $c not found on this host"; exit 1; }
  done
  docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin missing"; exit 1; }
}

# App and DB pull images from the DMZ registry once their internet is cut.
allow_dmz_registry() {
  local reg=$1
  grep -q "$reg" /etc/docker/daemon.json 2>/dev/null && return
  log "trust registry $reg"
  mkdir -p /etc/docker
  jq -n --arg r "$reg" '{"insecure-registries":[$r]}' > /etc/docker/daemon.json
  systemctl restart docker
}

unpack_env() { # env.tar.zst.age -> $STACK_DIR/env/
  [ -d "$STACK_DIR/env" ] && { log "env present"; return; }
  fetch env.tar.zst.age
  log "decrypt env (passphrase was sent out of band)"
  age -d "$STACK_DIR/dl/env.tar.zst.age" \
    | tar -I zstd -x -C "$STACK_DIR"
  chmod -R go-rwx "$STACK_DIR/env"
}

unpack_stack() { # unpack_stack <role>
  fetch "stack-$1.tar.zst"
  log "unpack stack-$1"
  tar -I zstd -xf "$STACK_DIR/dl/stack-$1.tar.zst" -C "$STACK_DIR"
}

load_images() { # load_images <role>
  fetch "images-$1.tar"
  log "load images"
  docker load -i "$STACK_DIR/dl/images-$1.tar"
}

install_unit() { # install_unit <role>
  cat > /etc/systemd/system/sarmad.service <<UNIT
[Unit]
Description=Sarmad $1 stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$STACK_DIR/$1
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable --now sarmad.service
}
