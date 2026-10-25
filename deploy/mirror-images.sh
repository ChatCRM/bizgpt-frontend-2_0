#!/usr/bin/env bash
# Runs on the OLD box, which can reach ghcr.io and Docker Hub. Mirrors every
# image the VPC needs into the private registry on the relay, because the VPC
# can reach neither registry.
set -euo pipefail
REG=dev.bizgpt.info/sarmad
: "${REG_USER:?}"; : "${REG_PASS:?}"

echo "$REG_PASS" | docker login dev.bizgpt.info -u "$REG_USER" --password-stdin

SRC=(
  "ghcr.io/chatcrm/bubble-chat-api:sarmad-a60507bfb10acb3cb11e349ee249ce9f64418bd2"
  "ghcr.io/chatcrm/bizgpt-openwebui-pipeline:bizgpt-122d091db920efb41661852cf8f1794b60d2418e"
  "ghcr.io/chatcrm/openwebui-integration:sarmad-d646806470c18addc8eb8b375fc536214a638f83"
  "ghcr.io/chatcrm/openwebui-feedback-report:sarmad-d1b7a16910ef0c3806cf0fd3957a00b55fdc794c"
  "ghcr.io/berriai/litellm:main-v1.83.14-stable"
  "nginx:1.27-alpine"
  "postgres:16-alpine"
  "agwgkc8gowc848gk088c4840-gemini-tts:latest"
)

for s in "${SRC[@]}"; do
  name=${s##*/}                      # strip registry + org, keep name:tag
  dst="$REG/$name"
  echo "== $s"
  docker image inspect "$s" >/dev/null 2>&1 || { echo "   pulling"; docker pull -q "$s"; }
  docker tag "$s" "$dst"
  echo "   pushing -> $dst"
  docker push -q "$dst"
done

echo
echo "== catalogue on the relay =="
curl -fsS -u "$REG_USER:$REG_PASS" https://dev.bizgpt.info/v2/_catalog
