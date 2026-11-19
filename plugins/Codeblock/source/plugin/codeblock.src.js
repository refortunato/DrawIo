/**
 * draw.io Code Block plugin
 * Bloco de código com seleção de linguagem, realce de sintaxe e numeração de linhas.
 *
 * - Extras > "Inserir bloco de código" (ou Ctrl/Cmd+Shift+K)
 * - Duplo clique no bloco abre o editor (código, linguagem, tema, fonte, números de linha)
 * - As cores ficam gravadas no rótulo como estilos inline, então o diagrama
 *   continua renderizando com cores em qualquer draw.io (inclusive sem o plugin)
 *   e em exportações SVG/PNG/PDF.
 */
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import go from 'highlight.js/lib/languages/go';
import python from 'highlight.js/lib/languages/python';
import csharp from 'highlight.js/lib/languages/csharp';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import scala from 'highlight.js/lib/languages/scala';
import swift from 'highlight.js/lib/languages/swift';
import cpp from 'highlight.js/lib/languages/cpp';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import graphql from 'highlight.js/lib/languages/graphql';
import protobuf from 'highlight.js/lib/languages/protobuf';
import plaintext from 'highlight.js/lib/languages/plaintext';

const LANGUAGES = [
  ['javascript', 'JavaScript', javascript],
  ['typescript', 'TypeScript', typescript],
  ['java', 'Java', java],
  ['kotlin', 'Kotlin', kotlin],
  ['go', 'Go', go],
  ['python', 'Python', python],
  ['csharp', 'C#', csharp],
  ['rust', 'Rust', rust],
  ['php', 'PHP', php],
  ['ruby', 'Ruby', ruby],
  ['scala', 'Scala', scala],
  ['swift', 'Swift', swift],
  ['cpp', 'C / C++', cpp],
  ['sql', 'SQL', sql],
  ['json', 'JSON', json],
  ['yaml', 'YAML', yaml],
  ['xml', 'HTML / XML', xml],
  ['bash', 'Bash / Shell', bash],
  ['dockerfile', 'Dockerfile', dockerfile],
  ['graphql', 'GraphQL', graphql],
  ['protobuf', 'Protobuf', protobuf],
  ['plaintext', 'Texto puro', plaintext],
];
LANGUAGES.forEach(([id, , def]) => hljs.registerLanguage(id, def));

// Temas: cores por classe do highlight.js
const THEMES = {
  'miro-dark': {
    name: 'Miro (escuro)',
    bg: '#0B0533', border: '#3B3BD6', fg: '#E6E6F0', gutter: '#6E6A94',
    colors: {
      keyword: '#FF4F8B', built_in: '#4FD6E8', type: '#4FD6E8', literal: '#B07CFF',
      number: '#B07CFF', string: '#F5D76E', regexp: '#F5D76E', comment: '#7A76A3',
      title: '#4FD6E8', 'title.function': '#4FD6E8', 'title.class': '#4FD6E8',
      attr: '#4FD6E8', attribute: '#4FD6E8', params: '#E6E6F0', variable: '#E6E6F0',
      property: '#4FD6E8', operator: '#FF4F8B', meta: '#B07CFF', tag: '#FF4F8B',
      name: '#FF4F8B', symbol: '#B07CFF', subst: '#E6E6F0', punctuation: '#E6E6F0',
      'selector-tag': '#FF4F8B', 'selector-class': '#4FD6E8', section: '#4FD6E8',
      bullet: '#B07CFF', addition: '#7EE787', deletion: '#FF7B72',
    },
  },
  'github-dark': {
    name: 'GitHub (escuro)',
    bg: '#0D1117', border: '#30363D', fg: '#C9D1D9', gutter: '#6E7681',
    colors: {
      keyword: '#FF7B72', built_in: '#FFA657', type: '#FF7B72', literal: '#79C0FF',
      number: '#79C0FF', string: '#A5D6FF', regexp: '#A5D6FF', comment: '#8B949E',
      title: '#D2A8FF', 'title.function': '#D2A8FF', 'title.class': '#FFA657',
      attr: '#79C0FF', attribute: '#79C0FF', params: '#C9D1D9', variable: '#FFA657',
      property: '#79C0FF', operator: '#FF7B72', meta: '#79C0FF', tag: '#7EE787',
      name: '#7EE787', symbol: '#79C0FF', subst: '#C9D1D9', punctuation: '#C9D1D9',
      'selector-tag': '#7EE787', 'selector-class': '#D2A8FF', section: '#1F6FEB',
      bullet: '#F2CC60', addition: '#AFF5B4', deletion: '#FFDCD7',
    },
  },
  'github-light': {
    name: 'GitHub (claro)',
    bg: '#F6F8FA', border: '#D0D7DE', fg: '#24292F', gutter: '#8C959F',
    colors: {
      keyword: '#CF222E', built_in: '#953800', type: '#CF222E', literal: '#0550AE',
      number: '#0550AE', string: '#0A3069', regexp: '#0A3069', comment: '#6E7781',
      title: '#8250DF', 'title.function': '#8250DF', 'title.class': '#953800',
      attr: '#0550AE', attribute: '#0550AE', params: '#24292F', variable: '#953800',
      property: '#0550AE', operator: '#CF222E', meta: '#0550AE', tag: '#116329',
      name: '#116329', symbol: '#0550AE', subst: '#24292F', punctuation: '#24292F',
      'selector-tag': '#116329', 'selector-class': '#8250DF', section: '#0550AE',
      bullet: '#953800', addition: '#116329', deletion: '#82071E',
    },
  },
};

const FONT = "'JetBrains Mono','Fira Code',Menlo,Consolas,'Courier New',monospace";
const ATTR = 'codeblock';
const PAD_X = 16, PAD_Y = 14;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function colorFor(theme, cls) {
  // cls como "hljs-title function_" -> tenta "title.function", depois "title"
  const parts = cls.split(/\s+/).map((c) => c.replace(/^hljs-/, '').replace(/_+$/, ''));
  const main = parts[0];
  if (parts[1] && theme.colors[main + '.' + parts[1]]) return theme.colors[main + '.' + parts[1]];
  return theme.colors[main] || null;
}

/** Converte o HTML do highlight.js em linhas com estilos inline (spans fechados por linha). */
function toStyledLines(html, theme) {
  const tokens = html.split(/(<span class="[^"]*">|<\/span>)/);
  const stack = [];
  const lines = [];
  let cur = '';
  const open = (st) => (st ? `<span style="color:${st}">` : '<span>');
  for (const tok of tokens) {
    if (!tok) continue;
    const m = tok.match(/^<span class="([^"]*)">$/);
    if (m) {
      const st = colorFor(theme, m[1]);
      stack.push(st);
      cur += open(st);
    } else if (tok === '</span>') {
      stack.pop();
      cur += '</span>';
    } else {
      const pieces = tok.split('\n');
      pieces.forEach((p, i) => {
        if (i > 0) {
          cur += '</span>'.repeat(stack.length);
          lines.push(cur);
          cur = stack.map(open).join('');
        }
        cur += p;
      });
    }
  }
  lines.push(cur);
  return lines;
}

function highlight(code, lang) {
  try {
    if (lang === 'auto') return hljs.highlightAuto(code, LANGUAGES.map((l) => l[0])).value;
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  } catch (e) {
    return esc(code);
  }
}

function buildLabel(opts) {
  const theme = THEMES[opts.theme] || THEMES['miro-dark'];
  const fs = opts.fontSize;
  const lh = Math.round(fs * 1.55);
  const code = opts.code.replace(/\t/g, '    ').replace(/\s+$/, '');
  const lines = toStyledLines(highlight(code, opts.lang), theme);
  const digits = String(lines.length).length;
  const gutterW = (Math.max(digits, 2) * 0.62 + 1.6).toFixed(2);
  let rows = '';
  lines.forEach((ln, i) => {
    const num = opts.lineNumbers
      ? `<span style="display:inline-block;width:${gutterW}em;color:${theme.gutter};text-align:right;padding-right:1.3em;box-sizing:content-box;-webkit-user-select:none;user-select:none;">${i + 1}</span>`
      : '';
    rows += `<div style="white-space:pre;height:${lh}px;line-height:${lh}px;">${num}${ln || '&#8203;'}</div>`;
  });
  const html =
    `<div style="text-align:left;font-family:${FONT};font-size:${fs}px;color:${theme.fg};` +
    `padding:${PAD_Y}px ${PAD_X}px;box-sizing:border-box;">${rows}</div>`;
  const longest = code.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  const charW = fs * 0.6;
  const width = Math.ceil(PAD_X * 2 + (opts.lineNumbers ? (parseFloat(gutterW) + 1.3) * fs : 0) + longest * charW + 8);
  const height = PAD_Y * 2 + lines.length * lh;
  return { html, width, height, theme };
}

function styleFor(theme) {
  return (
    `${ATTR}=1;html=1;rounded=1;arcSize=2;absoluteArcSize=1;whiteSpace=nowrap;overflow=fill;` +
    `align=left;verticalAlign=top;spacing=0;fillColor=${theme.bg};strokeColor=${theme.border};` +
    `fontColor=${theme.fg};fontFamily=Courier New;container=0;editable=1;`
  );
}

Draw.loadPlugin(function (ui) {
  const graph = ui.editor.graph;
  const model = graph.getModel();
  const mxUtils = window.mxUtils;
  const mxResources = window.mxResources;

  function isCodeBlock(cell) {
    return cell != null && model.isVertex(cell) && String(graph.getCurrentCellStyle(cell)[ATTR]) === '1';
  }

  function readOpts(cell) {
    const v = cell && cell.value;
    const get = (k, d) => (v && v.getAttribute && v.getAttribute(k) != null ? v.getAttribute(k) : d);
    return {
      code: get('code', 'const a = 15\nconst b = 10\n\nif (a + b >= 25) {\n    console.log("aceito")\n} else {\n    console.log("rejeitado")\n}'),
      lang: get('lang', 'javascript'),
      theme: get('theme', 'miro-dark'),
      fontSize: parseInt(get('fontSize', '14'), 10) || 14,
      lineNumbers: get('lineNumbers', '1') === '1',
    };
  }

  function makeValue(opts, label) {
    const doc = mxUtils.createXmlDocument();
    const obj = doc.createElement('object');
    obj.setAttribute('label', label);
    obj.setAttribute('code', opts.code);
    obj.setAttribute('lang', opts.lang);
    obj.setAttribute('theme', opts.theme);
    obj.setAttribute('fontSize', String(opts.fontSize));
    obj.setAttribute('lineNumbers', opts.lineNumbers ? '1' : '0');
    return obj;
  }

  function apply(cell, opts, pos) {
    const r = buildLabel(opts);
    model.beginUpdate();
    try {
      if (cell == null) {
        const pt = pos || (graph.getFreeInsertPoint ? graph.getFreeInsertPoint() : graph.getInsertPoint());
        cell = new mxCell(makeValue(opts, r.html), new mxGeometry(pt.x, pt.y, Math.max(r.width, 240), r.height), styleFor(r.theme));
        cell.vertex = true;
        graph.addCell(cell);
      } else {
        model.setValue(cell, makeValue(opts, r.html));
        model.setStyle(cell, styleFor(r.theme));
        const g = cell.geometry.clone();
        g.width = Math.max(r.width, 240);
        g.height = r.height;
        model.setGeometry(cell, g);
      }
    } finally {
      model.endUpdate();
    }
    graph.setSelectionCell(cell);
    return cell;
  }

  function openEditor(cell, pos) {
    const opts = readOpts(cell);
    const theme = () => THEMES[themeSel.value];

    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;font-family:inherit;';

    const title = document.createElement('div');
    title.textContent = cell ? 'Editar bloco de código' : 'Novo bloco de código';
    title.style.cssText = 'font-size:16px;font-weight:600;';
    div.appendChild(title);

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;';
    const mkSel = (items, value) => {
      const s = document.createElement('select');
      s.style.cssText = 'padding:4px 6px;';
      items.forEach(([v, label]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = label; if (v === value) o.selected = true;
        s.appendChild(o);
      });
      return s;
    };
    const lab = (t, el) => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;gap:6px;align-items:center;';
      l.appendChild(document.createTextNode(t));
      l.appendChild(el);
      bar.appendChild(l);
    };
    const langSel = mkSel([['auto', 'Detectar automaticamente']].concat(LANGUAGES.map(([id, n]) => [id, n])), opts.lang);
    const themeSel = mkSel(Object.keys(THEMES).map((k) => [k, THEMES[k].name]), opts.theme);
    const fsInput = document.createElement('input');
    fsInput.type = 'number'; fsInput.min = '8'; fsInput.max = '40'; fsInput.value = String(opts.fontSize);
    fsInput.style.cssText = 'width:52px;padding:3px;';
    const lnChk = document.createElement('input');
    lnChk.type = 'checkbox'; lnChk.checked = opts.lineNumbers;
    lab('Linguagem', langSel);
    lab('Tema', themeSel);
    lab('Fonte', fsInput);
    lab('Números de linha', lnChk);
    div.appendChild(bar);

    const panes = document.createElement('div');
    panes.style.cssText = 'display:flex;gap:10px;flex:1;min-height:0;';
    const ta = document.createElement('textarea');
    ta.value = opts.code;
    ta.spellcheck = false;
    ta.setAttribute('autocomplete', 'off');
    ta.style.cssText = `flex:1;resize:none;font-family:${FONT};font-size:13px;line-height:1.5;padding:10px;tab-size:4;white-space:pre;overflow:auto;border:1px solid #ccc;border-radius:6px;`;
    const preview = document.createElement('div');
    preview.style.cssText = 'flex:1;overflow:auto;border-radius:6px;border:1px solid;';
    panes.appendChild(ta);
    panes.appendChild(preview);
    div.appendChild(panes);

    const current = () => ({
      code: ta.value,
      lang: langSel.value,
      theme: themeSel.value,
      fontSize: Math.min(40, Math.max(8, parseInt(fsInput.value, 10) || 14)),
      lineNumbers: lnChk.checked,
    });
    const refresh = () => {
      const r = buildLabel(current());
      preview.style.background = theme().bg;
      preview.style.borderColor = theme().border;
      preview.innerHTML = r.html;
    };
    [langSel, themeSel, fsInput, lnChk].forEach((el) => el.addEventListener('change', refresh));
    ta.addEventListener('input', refresh);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(en);
        ta.selectionStart = ta.selectionEnd = s + 4;
        refresh();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        ok();
      }
      e.stopPropagation();
    });
    refresh();

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
    const hint = document.createElement('span');
    hint.textContent = 'Ctrl/Cmd+Enter para aplicar';
    hint.style.cssText = 'margin-right:auto;font-size:12px;color:#888;align-self:center;';
    btns.appendChild(hint);
    const cancelBtn = mxUtils.button(mxResources.get('cancel') || 'Cancelar', () => ui.hideDialog());
    cancelBtn.className = 'geBtn';
    const okBtn = mxUtils.button(cell ? 'Aplicar' : 'Inserir', () => ok());
    okBtn.className = 'geBtn gePrimaryBtn';
    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    div.appendChild(btns);

    function ok() {
      const c = current();
      ui.hideDialog();
      apply(cell, c, pos);
    }

    ui.showDialog(div, 980, 560, true, true);
    window.setTimeout(() => ta.focus(), 50);
  }

  // Ação + menu Extras + atalho
  ui.actions.addAction('insertCodeBlock', () => {
    const sel = graph.getSelectionCell();
    openEditor(isCodeBlock(sel) ? sel : null);
  }, null, null, Editor.ctrlKey + '+Shift+K');
  const action = ui.actions.get('insertCodeBlock');
  action.label = 'Bloco de código...';

  const extras = ui.menus.get('extras');
  if (extras) {
    const old = extras.funct;
    extras.funct = function (menu, parent) {
      old.apply(this, arguments);
      menu.addSeparator(parent);
      ui.menus.addMenuItems(menu, ['insertCodeBlock'], parent);
    };
  }
  const insertMenu = ui.menus.get('insert');
  if (insertMenu) {
    const oldIns = insertMenu.funct;
    insertMenu.funct = function (menu, parent) {
      oldIns.apply(this, arguments);
      ui.menus.addMenuItems(menu, ['-', 'insertCodeBlock'], parent);
    };
  }
  ui.keyHandler.bindAction(75, true, 'insertCodeBlock', true); // Ctrl/Cmd+Shift+K

  // Menu de contexto (botão direito)
  const oldPopup = ui.menus.createPopupMenu;
  ui.menus.createPopupMenu = function (menu, cell, evt) {
    oldPopup.apply(this, arguments);
    menu.addSeparator();
    if (isCodeBlock(graph.getSelectionCell())) {
      menu.addItem('Editar código...', null, () => openEditor(graph.getSelectionCell()));
    } else {
      menu.addItem('Inserir bloco de código...', null, () => openEditor(null));
    }
  };

  // Duplo clique abre o editor em vez da edição de texto
  const oldDbl = graph.dblClick;
  graph.dblClick = function (evt, cell) {
    if (isCodeBlock(cell)) {
      openEditor(cell);
      mxEvent.consume(evt);
      return;
    }
    oldDbl.apply(this, arguments);
  };
  const oldStart = graph.startEditingAtCell;
  graph.startEditingAtCell = function (cell, evt) {
    cell = cell || graph.getSelectionCell();
    if (isCodeBlock(cell)) {
      openEditor(cell);
      return;
    }
    return oldStart.apply(this, arguments);
  };

  // Item na barra lateral: clique abre o editor; arrastar para o canvas
  // abre o editor e insere o bloco na posição onde foi solto.
  function createSidebarItem() {
    const item = document.createElement('a');
    item.className = 'geItem';
    item.title = 'Bloco de código (clique ou arraste para o diagrama)';
    item.setAttribute('href', 'javascript:void(0);');
    item.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:52px;height:40px;padding:2px;overflow:hidden;cursor:pointer;box-sizing:border-box;';
    item.innerHTML =
      '<svg width="46" height="34" viewBox="0 0 46 34" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0.5" y="0.5" width="45" height="33" rx="2" fill="#0B0533" stroke="#3B3BD6"/>' +
      '<rect x="4" y="5" width="3" height="2" fill="#6E6A94"/><rect x="10" y="5" width="8" height="2" fill="#FF4F8B"/><rect x="20" y="5" width="12" height="2" fill="#4FD6E8"/>' +
      '<rect x="4" y="11" width="3" height="2" fill="#6E6A94"/><rect x="14" y="11" width="10" height="2" fill="#E6E6F0"/><rect x="26" y="11" width="10" height="2" fill="#F5D76E"/>' +
      '<rect x="4" y="17" width="3" height="2" fill="#6E6A94"/><rect x="14" y="17" width="6" height="2" fill="#FF4F8B"/><rect x="22" y="17" width="5" height="2" fill="#B07CFF"/>' +
      '<rect x="4" y="23" width="3" height="2" fill="#6E6A94"/><rect x="10" y="23" width="4" height="2" fill="#E6E6F0"/>' +
      '</svg>';

    let dragged = false;
    const preview = document.createElement('div');
    preview.style.cssText = 'width:240px;height:150px;border:1px dashed #3B3BD6;background:rgba(11,5,51,0.25);box-sizing:border-box;';
    const ds = mxUtils.makeDraggable(item, graph, function (g, evt, target, x, y) {
      dragged = true;
      const p = g.snap ? new mxPoint(g.snap(x), g.snap(y)) : new mxPoint(x, y);
      window.setTimeout(() => openEditor(null, p), 0);
    }, preview, 0, 0, true, true);
    if (ds) ds.isGuidesEnabled = () => ui.editor.graph.graphHandler.guidesEnabled;

    mxEvent.addListener(item, 'click', function (evt) {
      mxEvent.consume(evt);
      if (dragged) {
        dragged = false;
        return;
      }
      openEditor(null);
    });
    return item;
  }

  try {
    ui.sidebar.addPalette('codeblock', 'Bloco de código', true, function (content) {
      content.appendChild(createSidebarItem());
    }, true);
  } catch (e) {
    console.warn('[codeblock] não foi possível adicionar o item na barra lateral', e);
  }
});
