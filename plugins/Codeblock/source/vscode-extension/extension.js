const fs = require('fs');
const path = require('path');

function activate(context) {
  const pluginPath = path.join(context.extensionPath, 'codeblock.js');
  return {
    drawioExtensionV1: {
      getDrawioPlugins: async () => [{ jsCode: fs.readFileSync(pluginPath, 'utf8') }],
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
