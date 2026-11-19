#!/bin/bash
# Prepara plugins e bibliotecas próprias e depois inicia o draw.io oficial.
#
#   /opt/drawio-custom/plugins/<Nome>/<arquivo>.js  -> carregado como plugin
#   /opt/drawio-custom/libraries/<Nome>.xml          -> biblioteca na barra lateral
#   /opt/drawio-custom/config.json                   -> configuração do editor
set -euo pipefail

CUSTOM=/opt/drawio-custom
WEBAPP="$CATALINA_HOME/webapps/draw"
RUNTIME="$CATALINA_HOME/temp/drawio-custom"
DEFAULT_LIBRARIES='general;uml;er;bpmn;flowchart;basic;arrows2'

mkdir -p "$RUNTIME"
shopt -s nullglob

# ── Plugins ────────────────────────────────────────────────────────────────
rm -rf "$WEBAPP/plugins/custom"
mkdir -p "$WEBAPP/plugins/custom"
plugin_urls=()
for src in "$CUSTOM"/plugins/*/*.js; do
  if [ ! -r "$src" ]; then echo "[drawio-custom] AVISO: sem permissão de leitura em '$src', ignorando."; continue; fi
  folder="$(basename "$(dirname "$src")")"
  name="$(echo "${folder}-$(basename "$src")" | tr '[:upper:] ' '[:lower:]-')"
  cp "$src" "$WEBAPP/plugins/custom/$name"
  version="$(md5sum "$src" | cut -c1-8)"
  plugin_urls+=("\"plugins/custom/$name?v=$version\"")
  echo "[drawio-custom] plugin: $folder/$(basename "$src")"
done

plugin_list="$(IFS=,; echo "${plugin_urls[*]:-}")"
cp "$WEBAPP/js/PostConfig.base.js" "$WEBAPP/js/PostConfig.js"
cat >> "$WEBAPP/js/PostConfig.js" <<EOF

// Plugins próprios (gerado por start.sh)
(function() {
  var plugins = [${plugin_list}];
  if (plugins.length == 0 || typeof App === 'undefined' || urlParams['plugins'] == '0') return;
  App.initPluginCallback();
  for (var i = 0; i < plugins.length; i++) {
    App.embedModePluginsCount++;
    mxscript(plugins[i]);
  }
})();
EOF

# ── Bibliotecas de componentes ─────────────────────────────────────────────
entries_dir="$RUNTIME/entries"
rm -rf "$entries_dir"
mkdir -p "$entries_dir"
ids=""
for xml in "$CUSTOM"/libraries/*.xml; do
  if [ ! -r "$xml" ]; then echo "[drawio-custom] AVISO: sem permissão de leitura em '$xml', ignorando."; continue; fi
  title="$(basename "$xml" .xml)"
  id="custom-$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
  # Conteúdo JSON dentro de <mxlibrary>...</mxlibrary>
  sed -z -e 's/^.*<mxlibrary[^>]*>//' -e 's/<\/mxlibrary>.*$//' "$xml" > "$RUNTIME/data.json"
  if ! jq -e 'type == "array"' "$RUNTIME/data.json" >/dev/null 2>&1; then
    echo "[drawio-custom] AVISO: '$xml' não é uma biblioteca do draw.io válida, ignorando."
    continue
  fi
  jq -n --arg id "$id" --arg title "$title" --slurpfile data "$RUNTIME/data.json" \
    '{id: $id, title: {main: $title}, desc: {main: $title},
      libs: [{title: {main: $title}, data: $data[0]}]}' > "$entries_dir/$id.json"
  ids="$ids;$id"
  echo "[drawio-custom] biblioteca: $title"
done

jq -s '.' "$entries_dir"/*.json 2>/dev/null > "$RUNTIME/entries.json" || echo '[]' > "$RUNTIME/entries.json"
[ -s "$RUNTIME/entries.json" ] || echo '[]' > "$RUNTIME/entries.json"

jq --slurpfile entries "$RUNTIME/entries.json" --arg ids "$ids" --arg defaults "$DEFAULT_LIBRARIES" '
  . + {
    libraries: ((.libraries // []) +
      (if ($entries[0] | length) > 0
       then [{title: {main: "Componentes"}, entries: $entries[0]}] else [] end)),
    defaultLibraries: ((.defaultLibraries // $defaults) + $ids)
  }' "$CUSTOM/config.json" > "$RUNTIME/config.json"

export DRAWIO_CONFIG_FILE="$RUNTIME/config.json"
exec /docker-entrypoint.sh "$@"
