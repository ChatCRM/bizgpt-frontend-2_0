#!/usr/bin/env bash
# Runs on bizgpt-dev. Stands up a private image mirror, because the VPC cannot
# reach ghcr.io or Docker Hub (both block/time out from that network) while it
# can reach this host over 443.
set -euo pipefail
V=/etc/nginx/sites-available/dev.bizgpt.info

sudo mkdir -p /srv/registry
if ! sudo docker ps --format '{{.Names}}' | grep -qx sarmad-registry; then
  sudo docker run -d --restart unless-stopped --name sarmad-registry \
    -p 127.0.0.1:5000:5000 \
    -v /srv/registry:/var/lib/registry \
    -e REGISTRY_STORAGE_DELETE_ENABLED=true \
    registry:2
  echo "registry started"
else
  echo "registry already running"
fi

if ! grep -q 'location /v2/' $V; then
  sudo python3 - "$V" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
block = '''
    # Private image mirror for the Sarmad VPC. Docker requires /v2/ at the
    # domain root. Same basic-auth file as the depot.
    location /v2/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 900s;
        proxy_send_timeout 900s;
        client_max_body_size 0;          # image layers are large
        chunked_transfer_encoding on;
        auth_basic "sarmad";
        auth_basic_user_file /etc/nginx/sarmad-depot.htpasswd;
    }
'''
s = s.rstrip().rstrip('}') + block + '}\n'
open(p,'w').write(s)
PY
  sudo nginx -t && sudo systemctl reload nginx && echo "nginx: /v2/ added"
else
  echo "nginx: /v2/ already present"
fi
