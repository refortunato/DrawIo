/**
 * draw.io Markdown plugin
 * Bloco que interpreta Markdown (GFM) e exibe o resultado formatado.
 *
 * - Barra lateral "Markdown", Extras > "Markdown..." ou Ctrl/Cmd+Shift+X
 * - Duplo clique no bloco abre o editor (texto, tema, fonte, largura)
 * - O resultado fica gravado no rótulo com estilos inline: o diagrama
 *   aparece formatado em qualquer draw.io e nas exportações.
 */
import MarkdownIt from 'markdown-it';
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
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import graphql from 'highlight.js/lib/languages/graphql';
import plaintext from 'highlight.js/lib/languages/plaintext';

const LANGS = { javascript, typescript, java, kotlin, go, python, csharp, rust, php, ruby, sql, json, yaml, xml, bash, dockerfile, graphql, plaintext };
Object.keys(LANGS).forEach((k) => hljs.registerLanguage(k, LANGS[k]));
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['kt'], { languageName: 'kotlin' });
hljs.registerAliases(['golang'], { languageName: 'go' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['cs', 'c#'], { languageName: 'csharp' });
hljs.registerAliases(['rs'], { languageName: 'rust' });
hljs.registerAliases(['rb'], { languageName: 'ruby' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['text', 'txt'], { languageName: 'plaintext' });

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono','Fira Code',Menlo,Consolas,'Courier New',monospace";
const ATTR = 'markdownblock';
const PAD = 20;
const MIN_W = 160;

const THEMES = {
  claro: {
    name: 'Claro', bg: '#FFFFFF', border: '#D0D7DE', fg: '#1F2328', muted: '#59636E',
    link: '#0969DA', codeBg: '#F6F8FA', inlineCodeBg: '#EFF1F3', rule: '#D1D9E0', tableHead: '#F6F8FA',
    quote: '#D1D9E0',
    hl: { keyword: '#CF222E', built_in: '#953800', type: '#CF222E', literal: '#0550AE', number: '#0550AE',
      string: '#0A3069', regexp: '#0A3069', comment: '#59636E', title: '#8250DF', attr: '#0550AE',
      attribute: '#0550AE', variable: '#953800', property: '#0550AE', meta: '#0550AE', tag: '#116329',
      name: '#116329', symbol: '#0550AE', bullet: '#953800', addition: '#116329', deletion: '#82071E' },
  },
  escuro: {
    name: 'Escuro', bg: '#0D1117', border: '#30363D', fg: '#E6EDF3', muted: '#9198A1',
    link: '#4493F8', codeBg: '#161B22', inlineCodeBg: '#262C36', rule: '#3D444D', tableHead: '#161B22',
    quote: '#3D444D',
    hl: { keyword: '#FF7B72', built_in: '#FFA657', type: '#FF7B72', literal: '#79C0FF', number: '#79C0FF',
      string: '#A5D6FF', regexp: '#A5D6FF', comment: '#8B949E', title: '#D2A8FF', attr: '#79C0FF',
      attribute: '#79C0FF', variable: '#FFA657', property: '#79C0FF', meta: '#79C0FF', tag: '#7EE787',
      name: '#7EE787', symbol: '#79C0FF', bullet: '#F2CC60', addition: '#AFF5B4', deletion: '#FFDCD7' },
  },
  transparente: {
    name: 'Sem fundo', bg: 'none', border: 'none', fg: '#1F2328', muted: '#59636E',
    link: '#0969DA', codeBg: '#F6F8FA', inlineCodeBg: '#EFF1F3', rule: '#D1D9E0', tableHead: '#F6F8FA',
    quote: '#D1D9E0', hl: null,
  },
};
THEMES.transparente.hl = THEMES.claro.hl;

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hlColor(theme, cls) {
  const main = cls.split(/\s+/)[0].replace(/^hljs-/, '');
  return theme.hl[main] || null;
}

function highlightCode(code, lang, theme) {
  let html;
  try {
    html = lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : esc(code);
  } catch (e) {
    html = esc(code);
  }
  return html.replace(/<span class="([^"]*)">/g, (m, cls) => {
    const c = hlColor(theme, cls);
    return c ? `<span style="color:${c}">` : '<span>';
  });
}

/** Renderiza o Markdown em HTML com estilos inline (o rótulo do draw.io não tem folha de estilos). */
function renderMarkdown(src, theme, fontSize) {
  const fs = fontSize;
  const doc = new DOMParser().parseFromString(`<div id="r">${md.render(src || '')}</div>`, 'text/html');
  const root = doc.getElementById('r');
  const st = (el, css) => el.setAttribute('style', css);

  root.querySelectorAll('pre > code').forEach((code) => {
    const m = (code.getAttribute('class') || '').match(/language-([\w#+-]+)/);
    const lang = m ? m[1].toLowerCase() : null;
    const pre = code.parentNode;
    const wrap = doc.createElement('div');
    st(wrap, `margin:0 0 ${fs * 0.85}px 0;padding:${fs * 0.8}px ${fs}px;background:${theme.codeBg};border-radius:6px;` +
      `font-family:${MONO};font-size:${(fs * 0.86).toFixed(1)}px;line-height:1.5;word-break:break-word;color:${theme.fg};`);
    wrap.innerHTML = highlightCode(code.textContent.replace(/\n$/, ''), lang, theme)
      .split('\n')
      .map((line) => line.replace(/^ +/, (sp) => '&nbsp;'.repeat(sp.length)).replace(/ {2}/g, ' &nbsp;'))
      .join('<br>');
    pre.parentNode.replaceChild(wrap, pre);
  });

  const H = { H1: 2, H2: 1.5, H3: 1.25, H4: 1.1, H5: 1, H6: 0.9 };
  root.querySelectorAll('*').forEach((el) => {
    const t = el.tagName;
    if (H[t]) {
      const border = t === 'H1' || t === 'H2' ? `border-bottom:1px solid ${theme.rule};padding-bottom:${fs * 0.3}px;` : '';
      st(el, `margin:${fs * 0.6}px 0 ${fs * 0.6}px 0;font-size:${(fs * H[t]).toFixed(1)}px;font-weight:600;line-height:1.25;color:${t === 'H6' ? theme.muted : theme.fg};${border}`);
    } else if (t === 'P') st(el, `margin:0 0 ${fs * 0.85}px 0;`);
    else if (t === 'UL' || t === 'OL') st(el, `margin:0 0 ${fs * 0.85}px 0;padding-left:${fs * 1.8}px;`);
    else if (t === 'LI') st(el, `margin:${fs * 0.2}px 0;`);
    else if (t === 'A') st(el, `color:${theme.link};text-decoration:none;`);
    else if (t === 'STRONG') st(el, 'font-weight:600;');
    else if (t === 'S' || t === 'DEL') st(el, 'text-decoration:line-through;');
    else if (t === 'CODE') st(el, `font-family:${MONO};font-size:0.88em;background:${theme.inlineCodeBg};padding:0.15em 0.4em;border-radius:5px;`);
    else if (t === 'BLOCKQUOTE') st(el, `margin:0 0 ${fs * 0.85}px 0;padding:0 ${fs}px;color:${theme.muted};border-left:4px solid ${theme.quote};`);
    else if (t === 'HR') st(el, `height:3px;margin:${fs * 1.2}px 0;background:${theme.rule};border:0;`);
    else if (t === 'TABLE') st(el, `border-collapse:collapse;margin:0 0 ${fs * 0.85}px 0;max-width:100%;`);
    else if (t === 'TH') st(el, `padding:${fs * 0.4}px ${fs * 0.8}px;border:1px solid ${theme.rule};font-weight:600;background:${theme.tableHead};text-align:${el.style.textAlign || 'left'};`);
    else if (t === 'TD') st(el, `padding:${fs * 0.4}px ${fs * 0.8}px;border:1px solid ${theme.rule};text-align:${el.style.textAlign || 'left'};`);
    else if (t === 'IMG') st(el, 'max-width:100%;');
  });

  // Listas de tarefas: "[ ] item" / "[x] item"
  root.querySelectorAll('li').forEach((li) => {
    const first = li.firstChild && li.firstChild.nodeType === 3 ? li.firstChild
      : li.firstElementChild && li.firstElementChild.tagName === 'P' && li.firstElementChild.firstChild &&
        li.firstElementChild.firstChild.nodeType === 3 ? li.firstElementChild.firstChild : null;
    if (!first) return;
    const m = first.nodeValue.match(/^\[([ xX])\]\s+/);
    if (!m) return;
    first.nodeValue = first.nodeValue.slice(m[0].length);
    const box = doc.createElement('span');
    box.textContent = m[1] === ' ' ? '☐ ' : '☑ ';
    st(box, `color:${m[1] === ' ' ? theme.muted : '#1A7F37'};`);
    first.parentNode.insertBefore(box, first);
    li.setAttribute('style', `margin:${fs * 0.2}px 0;list-style:none;margin-left:-${fs * 1.3}px;`);
  });

  // Remove a margem inferior do último bloco
  const last = root.lastElementChild;
  if (last) last.setAttribute('style', (last.getAttribute('style') || '') + 'margin-bottom:0;');

  // O draw.io converte quebras de linha do rótulo em <br>: remove as do HTML
  const body = root.innerHTML.replace(/\n/g, ' ');
  return `<div style="text-align:left;font-family:${SANS};font-size:${fs}px;line-height:1.5;color:${theme.fg};` +
    `padding:${PAD}px;box-sizing:border-box;word-wrap:break-word;white-space:normal;">${body}</div>`;
}

/** Mede a altura real do conteúdo renderizado na largura informada. */
function measureHeight(html, width) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:-10000px;top:0;visibility:hidden;width:${width}px;`;
  probe.innerHTML = html;
  document.body.appendChild(probe);
  const h = Math.ceil(probe.firstChild.getBoundingClientRect().height);
  document.body.removeChild(probe);
  return Math.max(h, 40);
}

function styleFor(theme) {
  return `${ATTR}=1;html=1;rounded=1;arcSize=8;absoluteArcSize=1;whiteSpace=wrap;overflow=fill;` +
    `align=left;verticalAlign=top;spacing=0;fillColor=${theme.bg};strokeColor=${theme.border};` +
    `fontColor=${theme.fg};container=0;`;
}

const SAMPLE = [
  '## Fluxo de aprovação',
  '',
  'O pedido é **aceito** quando a soma passa do limite. Veja a [documentação](https://www.drawio.com).',
  '',
  '- [x] Validar entrada',
  '- [ ] Calcular total',
  '- [ ] Notificar cliente',
  '',
  '| Campo | Tipo | Obrigatório |',
  '|---|---|:---:|',
  '| `valor` | number | ✅ |',
  '| `moeda` | string | ❌ |',
  '',
  '```js',
  'if (a + b >= 25) console.log("aceito")',
  '```',
  '',
  '> Regra revisada em 2026.',
].join('\n');

Draw.loadPlugin(function (ui) {
  const graph = ui.editor.graph;
  const model = graph.getModel();

  function isMarkdownBlock(cell) {
    return cell != null && model.isVertex(cell) && String(graph.getCurrentCellStyle(cell)[ATTR]) === '1';
  }

  function readOpts(cell) {
    const v = cell && cell.value;
    const get = (k, d) => (v && v.getAttribute && v.getAttribute(k) != null ? v.getAttribute(k) : d);
    return {
      markdown: get('markdown', SAMPLE),
      theme: get('theme', 'claro'),
      fontSize: parseInt(get('fontSize', '14'), 10) || 14,
      width: cell && cell.geometry ? Math.round(cell.geometry.width) : 520,
    };
  }

  function makeValue(opts, label) {
    const doc = mxUtils.createXmlDocument();
    const obj = doc.createElement('object');
    obj.setAttribute('label', label);
    obj.setAttribute('markdown', opts.markdown);
    obj.setAttribute('theme', opts.theme);
    obj.setAttribute('fontSize', String(opts.fontSize));
    return obj;
  }

  function apply(cell, opts, pos) {
    const theme = THEMES[opts.theme] || THEMES.claro;
    const html = renderMarkdown(opts.markdown, theme, opts.fontSize);
    const width = Math.max(MIN_W, opts.width);
    const height = measureHeight(html, width);
    model.beginUpdate();
    try {
      if (cell == null) {
        const pt = pos || (graph.getFreeInsertPoint ? graph.getFreeInsertPoint() : graph.getInsertPoint());
        cell = new mxCell(makeValue(opts, html), new mxGeometry(pt.x, pt.y, width, height), styleFor(theme));
        cell.vertex = true;
        graph.addCell(cell);
      } else {
        model.setValue(cell, makeValue(opts, html));
        model.setStyle(cell, styleFor(theme));
        const g = cell.geometry.clone();
        g.width = width;
        g.height = height;
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

    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;';

    const title = document.createElement('div');
    title.textContent = cell ? 'Editar Markdown' : 'Novo bloco Markdown';
    title.style.cssText = 'font-size:16px;font-weight:600;';
    div.appendChild(title);

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;';
    const lab = (t, el) => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;gap:6px;align-items:center;';
      l.appendChild(document.createTextNode(t));
      l.appendChild(el);
      bar.appendChild(l);
    };
    const themeSel = document.createElement('select');
    themeSel.style.cssText = 'padding:4px 6px;';
    Object.keys(THEMES).forEach((k) => {
      const o = document.createElement('option');
      o.value = k; o.textContent = THEMES[k].name; if (k === opts.theme) o.selected = true;
      themeSel.appendChild(o);
    });
    const num = (value, min, max, w) => {
      const i = document.createElement('input');
      i.type = 'number'; i.min = String(min); i.max = String(max); i.value = String(value);
      i.style.cssText = `width:${w}px;padding:3px;`;
      return i;
    };
    const fsInput = num(opts.fontSize, 8, 40, 52);
    const wInput = num(opts.width, MIN_W, 3000, 68);
    lab('Tema', themeSel);
    lab('Fonte', fsInput);
    lab('Largura', wInput);
    const help = document.createElement('a');
    help.textContent = 'Sintaxe Markdown';
    help.href = 'https://www.markdownguide.org/cheat-sheet/';
    help.target = '_blank';
    help.rel = 'noopener noreferrer';
    help.style.cssText = 'margin-left:auto;font-size:12px;';
    bar.appendChild(help);
    div.appendChild(bar);

    const panes = document.createElement('div');
    panes.style.cssText = 'display:flex;gap:10px;flex:1;min-height:0;';
    const ta = document.createElement('textarea');
    ta.value = opts.markdown;
    ta.spellcheck = false;
    ta.style.cssText = `flex:1;resize:none;font-family:${MONO};font-size:13px;line-height:1.5;padding:10px;tab-size:4;overflow:auto;border:1px solid #ccc;border-radius:6px;`;
    const preview = document.createElement('div');
    preview.style.cssText = 'flex:1;overflow:auto;border-radius:6px;border:1px solid #ccc;background:#F0F0F0;padding:10px;box-sizing:border-box;';
    const card = document.createElement('div');
    preview.appendChild(card);
    panes.appendChild(ta);
    panes.appendChild(preview);
    div.appendChild(panes);

    const current = () => ({
      markdown: ta.value,
      theme: themeSel.value,
      fontSize: Math.min(40, Math.max(8, parseInt(fsInput.value, 10) || 14)),
      width: Math.min(3000, Math.max(MIN_W, parseInt(wInput.value, 10) || 520)),
    });
    const refresh = () => {
      const c = current();
      const theme = THEMES[c.theme];
      card.style.cssText = `width:${c.width}px;border-radius:8px;background:${theme.bg === 'none' ? 'transparent' : theme.bg};` +
        `border:1px solid ${theme.border === 'none' ? 'transparent' : theme.border};`;
      card.innerHTML = renderMarkdown(c.markdown, theme, c.fontSize);
    };
    [themeSel, fsInput, wInput].forEach((el) => el.addEventListener('change', refresh));
    ta.addEventListener('input', refresh);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
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

    ui.showDialog(div, 1100, 640, true, true);
    window.setTimeout(() => ta.focus(), 50);
  }

  // Ação, menus e atalho
  ui.actions.addAction('insertMarkdownBlock', () => {
    const sel = graph.getSelectionCell();
    openEditor(isMarkdownBlock(sel) ? sel : null);
  }, null, null, Editor.ctrlKey + '+Shift+X');
  ui.actions.get('insertMarkdownBlock').label = 'Markdown...';

  ['extras', 'insert'].forEach((name) => {
    const menu = ui.menus.get(name);
    if (!menu) return;
    const old = menu.funct;
    menu.funct = function (m, parent) {
      old.apply(this, arguments);
      ui.menus.addMenuItems(m, ['-', 'insertMarkdownBlock'], parent);
    };
  });
  ui.keyHandler.bindAction(88, true, 'insertMarkdownBlock', true); // Ctrl/Cmd+Shift+X

  const oldPopup = ui.menus.createPopupMenu;
  ui.menus.createPopupMenu = function (menu, cell, evt) {
    oldPopup.apply(this, arguments);
    menu.addSeparator();
    if (isMarkdownBlock(graph.getSelectionCell())) {
      menu.addItem('Editar Markdown...', null, () => openEditor(graph.getSelectionCell()));
    } else {
      menu.addItem('Inserir Markdown...', null, () => openEditor(null));
    }
  };

  const oldDbl = graph.dblClick;
  graph.dblClick = function (evt, cell) {
    if (isMarkdownBlock(cell)) {
      openEditor(cell);
      mxEvent.consume(evt);
      return;
    }
    oldDbl.apply(this, arguments);
  };
  const oldStart = graph.startEditingAtCell;
  graph.startEditingAtCell = function (cell, evt) {
    cell = cell || graph.getSelectionCell();
    if (isMarkdownBlock(cell)) {
      openEditor(cell);
      return;
    }
    return oldStart.apply(this, arguments);
  };

  // Ao redimensionar o bloco, ajusta a altura ao conteúdo
  graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
    const cells = evt.getProperty('cells') || [];
    cells.filter(isMarkdownBlock).forEach((cell) => {
      const label = cell.value && cell.value.getAttribute ? cell.value.getAttribute('label') : null;
      if (!label) return;
      const h = measureHeight(label, cell.geometry.width);
      if (Math.abs(h - cell.geometry.height) > 1) {
        const g = cell.geometry.clone();
        g.height = h;
        model.setGeometry(cell, g);
      }
    });
  });

  // Item na barra lateral: clique abre o editor; arrastar insere onde soltar
  function createSidebarItem() {
    const item = document.createElement('a');
    item.className = 'geItem';
    item.title = 'Markdown (clique ou arraste para o diagrama)';
    item.setAttribute('href', 'javascript:void(0);');
    item.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:52px;height:40px;padding:2px;overflow:hidden;cursor:pointer;box-sizing:border-box;';
    item.innerHTML =
      '<svg width="46" height="34" viewBox="0 0 46 34" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0.5" y="0.5" width="45" height="33" rx="3" fill="#FFFFFF" stroke="#8C959F"/>' +
      '<path d="M7 24V10h3.2l3.3 4.6L16.8 10H20v14h-3.2v-9l-3.3 4.4-3.3-4.4v9z" fill="#1F2328"/>' +
      '<path d="M28 10h3.4v7.2h3.3L29.7 24l-5-6.8H28z" fill="#1F2328"/>' +
      '</svg>';

    let dragged = false;
    const preview = document.createElement('div');
    preview.style.cssText = 'width:520px;height:200px;border:1px dashed #8C959F;background:rgba(255,255,255,0.4);box-sizing:border-box;';
    mxUtils.makeDraggable(item, graph, function (g, evt, target, x, y) {
      dragged = true;
      const p = g.snap ? new mxPoint(g.snap(x), g.snap(y)) : new mxPoint(x, y);
      window.setTimeout(() => openEditor(null, p), 0);
    }, preview, 0, 0, true, true);

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
    ui.sidebar.addPalette('markdownblock', 'Markdown', true, function (content) {
      content.appendChild(createSidebarItem());
    }, true);
  } catch (e) {
    console.warn('[markdown] não foi possível adicionar o item na barra lateral', e);
  }
});
