#!/usr/bin/env bash
# Gera dist/markdown.js e o .vsix a partir do código-fonte.
# Requisitos: Node.js 18+ e zip.
set -euo pipefail
cd "$(dirname "$0")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Bundle do plugin (highlight.js + código do plugin em um único arquivo)
( cd "$WORK" && npm init -y >/dev/null && npm i --silent highlight.js@11 markdown-it@14 esbuild )
cp plugin/markdown.src.js "$WORK/markdown.src.js"
"$WORK/node_modules/.bin/esbuild" "$WORK/markdown.src.js" --bundle --minify --format=iife \
  --target=es2017 --outfile=../markdown.js

# 2. Empacotamento da extensão do VS Code
VERSION="$(node -p "require('./vscode-extension/package.json').version")"
mkdir -p "$WORK/vsix/extension"
cp vscode-extension/package.json vscode-extension/extension.js vscode-extension/README.md \
   vscode-extension/LICENSE.txt ../markdown.js "$WORK/vsix/extension/"
sed "s/Version=\"[0-9.]*\" Publisher/Version=\"$VERSION\" Publisher/" \
  vscode-extension/extension.vsixmanifest > "$WORK/vsix/extension.vsixmanifest"
cp "vscode-extension/[Content_Types].xml" "$WORK/vsix/"
OUT="$(cd .. && pwd)/drawio-markdown-$VERSION.vsix"
rm -f "$OUT"
( cd "$WORK/vsix" && zip -qX -r "$OUT" "[Content_Types].xml" extension.vsixmanifest extension )
echo "Gerado: markdown.js e $(basename "$OUT")"
