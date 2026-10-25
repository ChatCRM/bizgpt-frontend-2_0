#!/usr/bin/env bash
# Runs on bizgpt-dev. Replaces the /llm/ route with a plain forward to
# OpenRouter.
#
# Why not the existing LiteLLM: its pass-through endpoints are proxy-admin only,
# so a scoped virtual key gets 401 there, and using the master key would hand
# Sarmad the credentials of the other product on this box. nginx forwarding to
# openrouter.ai costs one location block, touches nothing that tsmn depends on,
# and keeps Sarmad's OpenRouter key inside the VPC — this host never sees it.
set -euo pipefail
V=/etc/nginx/sites-available/dev.bizgpt.info

sudo python3 - "$V" <<'PY'
import re, sys
p=sys.argv[1]; s=open(p).read()
s=re.sub(r'\n    # LiteLLM relay for the Sarmad VPC.*?\n    location /llm/ \{.*?\n    \}\n', '\n', s, flags=re.S)
if 'location /or/' not in s:
    s = s.rstrip().rstrip('}') + '''
    # Egress for the Sarmad VPC: the DMZ's LiteLLM points its api_base here and
    # sends its own OpenRouter key. No credentials are stored on this host.
    # TODO: add "allow <DMZ egress IP>; deny all;" once that address is known.
    location /or/ {
        proxy_pass https://openrouter.ai/api/v1/;
        proxy_ssl_server_name on;
        proxy_set_header Host openrouter.ai;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_buffering off;
    }
}
'''
open(p,'w').write(s)
PY
sudo nginx -t && sudo systemctl reload nginx && echo "nginx reloaded"
