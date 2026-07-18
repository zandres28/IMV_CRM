#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env.local ]; then
  echo "Missing .env.local"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

python -m mcp_mikrotik.server --help >/dev/null
echo "MikroTik MCP Python module responds and loads .env.local"
