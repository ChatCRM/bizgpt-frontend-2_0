#!/usr/bin/env bash
# Runs on bizgpt-dev. Pushes the small public images into the local registry
# directly — faster than routing them through the old box, which is busy
# compressing the big one.
set -euo pipefail
for s in nginx:1.27-alpine postgres:16-alpine ghcr.io/berriai/litellm:main-v1.83.14-stable; do
  name=${s##*/}
  dst="localhost:5000/sarmad/$name"
  sudo docker image inspect "$s" >/dev/null 2>&1 || { echo "pulling $s"; sudo docker pull -q "$s"; }
  sudo docker tag "$s" "$dst"
  echo "pushing $dst"
  sudo docker push -q "$dst"
done
echo
curl -fsS http://127.0.0.1:5000/v2/_catalog
