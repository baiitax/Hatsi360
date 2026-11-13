#!/usr/bin/env bash
# =============================================================================
# Hatsi360 — environment bootstrap.
#
# The workspace snapshot excludes `node_modules`, and the Node 22 runtime is
# installed outside the repository. Both are rebuilt by this script.
#
#   bash scripts/setup_env.sh
#
# It is idempotent: running it on a healthy environment does nothing.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="22.20.0"
TOOLCHAIN="${HOME}/toolchain"
NODE_DIR="$TOOLCHAIN/node-v${NODE_VERSION}-linux-x64"

echo "==> checking the Node runtime"
if [ "$(node --version 2>/dev/null || echo none)" = "v${NODE_VERSION}" ]; then
  echo "    node v${NODE_VERSION} is already on the path"
else
  echo "    installing node v${NODE_VERSION} into $TOOLCHAIN"
  mkdir -p "$TOOLCHAIN"
  if [ ! -d "$NODE_DIR" ]; then
    curl -fsSL --max-time 300 \
      -o "$TOOLCHAIN/node.tar.xz" \
      "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
    tar -xf "$TOOLCHAIN/node.tar.xz" -C "$TOOLCHAIN"
    rm -f "$TOOLCHAIN/node.tar.xz"
  fi

  # Symlink into /usr/local/bin so a bare `node` resolves to the right
  # runtime. The toolchain itself lives under $HOME so it survives a
  # workspace snapshot.
  for binary in node npm npx; do
    if [ -w /usr/local/bin ]; then
      ln -sf "$NODE_DIR/bin/$binary" "/usr/local/bin/$binary"
    fi
  done
  export PATH="$NODE_DIR/bin:$PATH"
  echo "    node $(node --version)"
fi

echo "==> installing dependencies"
cd "$ROOT"
if [ ! -d node_modules ]; then
  # npm 10 resolves the peer graph more strictly than the packages expect;
  # --legacy-peer-deps is the documented way to install this tree.
  npm install --legacy-peer-deps
else
  echo "    node_modules is present"
fi

echo "==> verifying the install"
npm run typecheck
npx vitest run --reporter=dot 2>&1 | tail -5

echo
echo "The environment is ready."
echo "  start the preview: npm run dev -- --hostname 0.0.0.0 --port 3000"
