#!/usr/bin/env node
'use strict';
// forge:graph — a zero-dependency, self-updating code map.
//
// Synthesis of the three graph tools, built natively into forge:
//   • god-nodes + orchestrators + communities + cycles   (graphify)
//   • module / architecture map                          (Understand-Anything)
//   • neighbors / impact queries                         (CodeGraph)
// ...but LIVE: built once, then patched incrementally so the agent's structural
// context never goes stale. Pure Node, no deps. Atomic writes, fail-open.
//
// CLI:
//   graph.js build|update|refresh [root]   build full | patch changed | build-if-missing-else-update
//   graph.js map|stats [root]              architecture map / counts
//   graph.js neighbors <file> [root]       direct imports + importers of a file
//   graph.js impact <file> [root]          transitive blast radius
//   graph.js snapshot [root]               (re)write + print the compact SessionStart map
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const MAX_FILES = parseInt(process.env.FORGE_GRAPH_MAX_FILES || '5000', 10);
const MAX_BYTES = 512 * 1024;
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target', '.next', '.nuxt',
  'coverage', 'vendor', '__pycache__', '.venv', 'venv', 'env', '.idea', '.vscode', '.cache', '.turbo',
  '.svelte-kit', 'bin', 'obj', '.gradle', 'Pods', '.dart_tool', 'graphify-out', '.forge-tools', 'tmp']);
const LANG = {
  '.js': 'js', '.jsx': 'js', '.ts': 'ts', '.tsx': 'ts', '.mjs': 'js', '.cjs': 'js',
  '.vue': 'js', '.svelte': 'js', '.py': 'py', '.go': 'go', '.rs': 'rs', '.rb': 'rb',
  '.php': 'php', '.java': 'java', '.kt': 'kt', '.swift': 'swift', '.c': 'c', '.h': 'c',
  '.cpp': 'c', '.cc': 'c', '.hpp': 'c', '.cs': 'cs', '.scala': 'scala', '.sh': 'sh'
};

function toNative(p) { const m = String(p || '').match(/^\/([a-zA-Z])\/(.*)$/); return m ? m[1].toUpperCase() + ':\\' + m[2].replace(/\//g, '\\') : p; }
const dirOf = (p) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
function normPosix(p) {
  const out = [];
  for (const seg of String(p).split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else out.push('..'); }
    else out.push(seg);
  }
  return out.join('/');
}
const graphDir = (root) => path.join(L.BASE, 'graph', L.projId(root));
const graphFile = (root) => path.join(graphDir(root), 'graph.json');
const snapFile = (root) => path.join(graphDir(root), 'snapshot.md');

// ---- ignore rules: hardcoded safe set + simple single-segment dir/file names from .gitignore ----
function extraIgnores(root) {
  const set = new Set();
  for (const fn of ['.gitignore', '.graphifyignore']) {
    let txt; try { txt = fs.readFileSync(path.join(root, fn), 'utf8'); } catch { continue; }
    for (let line of txt.split('\n')) {
      line = line.trim();
      if (!line || line.startsWith('#') || line.startsWith('!')) continue;
      line = line.replace(/^\//, '').replace(/\/$/, '');
      if (line && !line.includes('/') && !line.includes('*')) set.add(line);   // single named dir/file, no glob
    }
  }
  return set;
}

// ---- tsconfig / jsconfig path aliases (baseUrl + paths: @/* -> src/*) ----
function stripJsonComments(s) {
  return s.replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, m => m[0] === '"' ? m : '')
    .replace(/,(\s*[}\]])/g, '$1');
}
function loadAliases(root) {
  const out = [];
  for (const fn of ['tsconfig.json', 'jsconfig.json']) {
    let txt; try { txt = fs.readFileSync(path.join(root, fn), 'utf8'); } catch { continue; }
    let cfg; try { cfg = JSON.parse(stripJsonComments(txt)); } catch { continue; }
    const co = (cfg && cfg.compilerOptions) || {};
    const baseDir = normPosix(String(co.baseUrl || '.').replace(/^\.\//, '').replace(/^\.$/, ''));
    const paths = co.paths || {};
    for (const k of Object.keys(paths)) {
      const targets = (paths[k] || []).map(t => normPosix((baseDir ? baseDir + '/' : '') + String(t).replace(/\*$/, '').replace(/^\.\//, '')));
      out.push({ key: k.replace(/\*$/, ''), star: k.endsWith('*'), targets });
    }
    if (co.baseUrl) out.push({ key: '', star: true, targets: [baseDir], baseUrlOnly: true });   // bare-from-baseUrl
    break;
  }
  return out;
}

// ---- file discovery ----
function walk(root) {
  const skip = extraIgnores(root);
  const out = [];
  (function rec(abs) {
    if (out.length >= MAX_FILES) return;
    let entries; try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      const name = e.name;
      if (e.isDirectory()) {
        if (IGNORE.has(name) || skip.has(name) || (name.startsWith('.') && name !== '.')) continue;
        rec(path.join(abs, name));
      } else if (e.isFile()) {
        if (skip.has(name)) continue;
        if (LANG[path.extname(name).toLowerCase()]) out.push(path.join(abs, name));
      }
    }
  })(root);
  return out;
}
const relKey = (root, abs) => path.relative(root, abs).split(path.sep).join('/');

// ---- raw import specifiers (per language); resolution is a separate pass ----
function extractRaw(content, lang) {
  const raw = [];
  let m;
  if (lang === 'js' || lang === 'ts') {
    const res = [/\b(?:import|export)\b[^;\n]*?\bfrom\s*['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm];
    for (const re of res) while ((m = re.exec(content))) raw.push(m[1]);
  } else if (lang === 'py') {
    const reFrom = /^\s*from\s+(\.*[\w.]*)\s+import\b/gm, reImp = /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm;
    while ((m = reFrom.exec(content))) if (m[1]) raw.push(m[1]);
    while ((m = reImp.exec(content))) for (const mod of m[1].split(',')) raw.push(mod.trim());
  } else if (lang === 'c') {
    const re = /^\s*#\s*include\s*"([^"]+)"/gm; while ((m = re.exec(content))) raw.push(m[1]);
  } else if (lang === 'rb') {
    const re = /\brequire_relative\s+['"]([^'"]+)['"]/g; while ((m = re.exec(content))) raw.push(m[1]);
  } else if (lang === 'rs') {
    const re = /^\s*(?:pub\s+)?mod\s+(\w+)\s*;/gm; while ((m = re.exec(content))) raw.push('mod:' + m[1]);
  }
  return raw;
}

// ---- resolve a raw specifier to a repo-relative file (or null) ----
function resolveSpec(spec, rel, lang, fileSet, aliases) {
  const fromDir = dirOf(rel);
  const JS_EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.json'];
  const JS_IDX = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const tryJs = (base) => {
    base = normPosix(base);
    for (const e of JS_EXT) if (fileSet.has(base + e)) return base + e;
    for (const e of JS_IDX) if (fileSet.has(base + '/index' + e)) return base + '/index' + e;
    return null;
  };
  if (lang === 'js' || lang === 'ts') {
    if (spec.startsWith('.')) return tryJs(fromDir + '/' + spec);
    for (const a of aliases) {                                   // tsconfig paths / baseUrl
      if (a.baseUrlOnly) { const r = tryJs((a.targets[0] ? a.targets[0] + '/' : '') + spec); if (r) return r; }
      else if (a.star && spec.startsWith(a.key)) { for (const t of a.targets) { const r = tryJs(t + '/' + spec.slice(a.key.length)); if (r) return r; } }
      else if (!a.star && spec === a.key) { for (const t of a.targets) { const r = tryJs(t); if (r) return r; } }
    }
    return null;                                                 // bare / node_modules → external
  }
  if (lang === 'py') {
    let dots = 0; while (spec[dots] === '.') dots++;
    const tail = spec.slice(dots).replace(/\./g, '/'); if (!tail) return null;
    if (dots > 0) { let d = fromDir; for (let i = 1; i < dots; i++) d = dirOf(d); const c = normPosix((d ? d + '/' : '') + tail);
      return fileSet.has(c + '.py') ? c + '.py' : (fileSet.has(c + '/__init__.py') ? c + '/__init__.py' : null); }
    if (fileSet.has(tail + '.py')) return tail + '.py';
    if (fileSet.has(tail + '/__init__.py')) return tail + '/__init__.py';
    const a = '/' + tail + '.py', b = '/' + tail + '/__init__.py'; let found = null, n = 0;
    for (const k of fileSet) { if (k.endsWith(a) || k.endsWith(b)) { found = k; if (++n > 1) break; } }
    return n === 1 ? found : null;                               // unique nested-package match only
  }
  if (lang === 'rs') {
    const name = spec.slice(4); const c1 = normPosix(fromDir + '/' + name + '.rs'), c2 = normPosix(fromDir + '/' + name + '/mod.rs');
    return fileSet.has(c1) ? c1 : (fileSet.has(c2) ? c2 : null);
  }
  if (lang === 'c' || lang === 'rb') {
    const base = normPosix(fromDir + '/' + spec);
    if (fileSet.has(base)) return base;
    if (lang === 'rb' && fileSet.has(base + '.rb')) return base + '.rb';
    return null;
  }
  return null;
}

function parseRaw(abs, rel) {
  let st; try { st = fs.statSync(abs); } catch { return null; }
  const lang = LANG[path.extname(rel).toLowerCase()];
  if (st.size > MAX_BYTES) return { lang, size: st.size, mtime: st.mtimeMs, raw: [] };
  let content = ''; try { content = fs.readFileSync(abs, 'utf8'); } catch { return { lang, size: st.size, mtime: st.mtimeMs, raw: [] }; }
  return { lang, size: st.size, mtime: st.mtimeMs, raw: extractRaw(content, lang) };
}

// re-resolve EVERY file's imports from stored raw specs against the current file set + aliases.
// (this is what keeps inbound edges correct when files are added/removed without touching importers.)
function resolveAll(g, fileSet, aliases) {
  for (const rel of Object.keys(g.files)) {
    const f = g.files[rel]; const seen = new Set();
    for (const spec of (f.raw || [])) { const t = resolveSpec(spec, rel, f.lang, fileSet, aliases); if (t && t !== rel) seen.add(t); }
    f.imports = [...seen];
  }
}

// ---- build / update ----
function build(root) {
  const abss = walk(root);
  const fileSet = new Set(abss.map(a => relKey(root, a)));
  const aliases = loadAliases(root);
  const files = {};
  for (const abs of abss) { const rel = relKey(root, abs); const r = parseRaw(abs, rel); if (r) files[rel] = r; }
  const g = { meta: { root, builtAt: new Date().toISOString(), version: 1 }, files };
  resolveAll(g, fileSet, aliases);
  save(root, g); writeSnapshot(root, g, []);
  return g;
}
function update(root) {
  const g = load(root);
  if (!g) return build(root);
  const abss = walk(root);
  const fileSet = new Set(abss.map(a => relKey(root, a)));
  const aliases = loadAliases(root);
  const changed = [];
  for (const rel of Object.keys(g.files)) if (!fileSet.has(rel)) delete g.files[rel];   // drop deleted
  for (const abs of abss) {
    const rel = relKey(root, abs); let st; try { st = fs.statSync(abs); } catch { continue; }
    const prev = g.files[rel];
    if (!prev || st.mtimeMs !== prev.mtime || st.size !== prev.size) {                  // mtime OR size change (catches checkouts)
      const r = parseRaw(abs, rel); if (r) { g.files[rel] = r; changed.push(rel); }
    }
  }
  resolveAll(g, fileSet, aliases);                                                      // always re-resolve → inbound edges stay correct
  g.meta.builtAt = new Date().toISOString(); g.meta.version = (g.meta.version || 1) + 1;
  save(root, g); writeSnapshot(root, g, changed);
  return g;
}
function save(root, g) {                                                                // atomic: tmp + rename (no torn reads under concurrent hooks)
  const f = graphFile(root); L.ensureDir(f);
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(g)); fs.renameSync(tmp, f);
}
function load(root) { try { return JSON.parse(fs.readFileSync(graphFile(root), 'utf8')); } catch { return null; } }

// ---- analytics ----
function reverseEdges(g) {
  const importedBy = {}; for (const rel of Object.keys(g.files)) importedBy[rel] = [];
  for (const rel of Object.keys(g.files)) for (const t of (g.files[rel].imports || [])) (importedBy[t] = importedBy[t] || []).push(rel);
  return importedBy;
}
function tarjanSCC(g) {
  const files = g.files, keys = Object.keys(files); let idx = 0;
  const index = {}, low = {}, on = {}, st = [], out = [];
  function strong(v) {
    index[v] = low[v] = idx++; st.push(v); on[v] = 1;
    for (const w of (files[v].imports || [])) { if (!files[w]) continue;
      if (index[w] === undefined) { strong(w); low[v] = Math.min(low[v], low[w]); }
      else if (on[w]) low[v] = Math.min(low[v], index[w]); }
    if (low[v] === index[v]) { const c = []; let w; do { w = st.pop(); on[w] = 0; c.push(w); } while (w !== v); if (c.length > 1) out.push(c); }
  }
  try { for (const v of keys) if (index[v] === undefined) strong(v); } catch { return []; }  // fail-open on deep recursion
  return out.sort((a, b) => b.length - a.length);
}
const ENTRY = /(^|\/)(index|main|app|server|cli|setup|conftest|mod|__init__|__main__)\.[a-z]+$|\.(test|spec)\.|(^|\/)(tests?|__tests__)\//i;
function derive(g) {
  const files = g.files, list = Object.keys(files);
  const importedBy = reverseEdges(g);
  const meta = list.map(rel => ({ rel, fanIn: (importedBy[rel] || []).length, fanOut: (files[rel].imports || []).length }));
  const godNodes = meta.filter(x => x.fanIn > 0).sort((a, b) => b.fanIn - a.fanIn);
  const orchestrators = meta.filter(x => x.fanOut > 1).sort((a, b) => b.fanOut - a.fanOut);
  const dead = meta.filter(x => x.fanIn === 0 && x.fanOut === 0 && !ENTRY.test(x.rel)).map(x => x.rel);
  const edgeCount = meta.reduce((n, x) => n + x.fanOut, 0);
  const modules = {};
  for (const rel of list) { const s = rel.split('/'); const k = s.length > 2 ? s.slice(0, 2).join('/') : (s.length === 2 ? s[0] : '(root)'); modules[k] = (modules[k] || 0) + 1; }
  // communities via label propagation; labels seeded from SORTED index → deterministic across runs
  const ordered = [...list].sort();
  const seed = {}; ordered.forEach((rel, i) => seed[rel] = i);
  const adj = {}; for (const rel of list) adj[rel] = new Set();
  for (const rel of list) for (const t of (files[rel].imports || [])) { adj[rel].add(t); if (adj[t]) adj[t].add(rel); }
  const label = { ...seed };
  for (let it = 0; it < 8; it++) { let moved = 0;
    for (const rel of ordered) { const cnt = {}; let best = label[rel], bestN = 0;
      for (const nb of adj[rel]) { const l = label[nb]; cnt[l] = (cnt[l] || 0) + 1; if (cnt[l] > bestN || (cnt[l] === bestN && l < best)) { bestN = cnt[l]; best = l; } }
      if (bestN > 0 && best !== label[rel]) { label[rel] = best; moved++; } }
    if (!moved) break; }
  const comm = {}; for (const rel of list) comm[label[rel]] = (comm[label[rel]] || 0) + 1;
  const communities = Object.values(comm).filter(n => n > 1).length;
  const cycles = tarjanSCC(g);
  return { importedBy, godNodes, orchestrators, dead, edgeCount, modules, communities, cycles };
}
function impact(g, file) {                                       // reverse-transitive: who depends on `file`
  const importedBy = reverseEdges(g); const seen = new Set(); const q = [file]; let i = 0;
  while (i < q.length) { const cur = q[i++]; for (const up of (importedBy[cur] || [])) if (!seen.has(up)) { seen.add(up); q.push(up); } }
  return [...seen];
}

// ---- snapshot for SessionStart injection ----
function writeSnapshot(root, g, changed) {
  const n = Object.keys(g.files).length;
  if (!n) { try { fs.writeFileSync(snapFile(root), ''); } catch {} return ''; }
  const d = derive(g);
  const gods = d.godNodes.slice(0, 8).map(x => `\`${x.rel}\` ←${x.fanIn}`).join(' · ');
  const mods = Object.entries(d.modules).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`).join(' · ');
  let recent = changed.slice(0, 4);
  if (!recent.length) recent = Object.entries(g.files).sort((a, b) => b[1].mtime - a[1].mtime).slice(0, 3).map(e => e[0]);
  const recLines = recent.map(rel => `\`${rel}\` (imports ${g.files[rel] ? g.files[rel].imports.length : 0}, imported-by ${(d.importedBy[rel] || []).length})`).join(' · ');
  const cyc = d.cycles.length ? `**Dependency cycles:** ${d.cycles.length} (largest ${d.cycles[0].length} files — e.g. ${d.cycles[0].slice(0, 3).map(x => '`' + x + '`').join(' ↔ ')})` : '';
  const md = [
    `## forge — live code map  _(${n} files · ${d.edgeCount} deps · ${d.communities} clusters${d.cycles.length ? ' · ' + d.cycles.length + ' cycles' : ''} · updated ${g.meta.builtAt.slice(0, 16).replace('T', ' ')})_`,
    'Structural context, kept fresh as you work. Use it to know blast radius before editing.',
    '',
    gods ? `**Most-depended-on (god-nodes):** ${gods}` : '',
    mods ? `**Modules:** ${mods}` : '',
    cyc,
    recLines ? `**Recently changed:** ${recLines}` : '',
    '',
    '_Query live: `node ~/.claude/skills/forge/scripts/graph.js neighbors <file>` · `impact <file>` · `map`._'
  ].filter(Boolean).join('\n').slice(0, 2200);
  try { const f = snapFile(root); L.ensureDir(f); fs.writeFileSync(f, md + '\n'); } catch {}
  return md;
}

// ---- CLI ----
function fmtList(a, cap = 40) { return a.length ? a.slice(0, cap).map(x => '  - ' + x).join('\n') + (a.length > cap ? `\n  …(+${a.length - cap})` : '') : '  (none)'; }
function main() {
  const cmd = process.argv[2] || 'map';
  const arg = process.argv[3];
  const rootArgCmds = new Set(['build', 'update', 'refresh', 'map', 'stats', 'snapshot']);
  const root = path.resolve(toNative(rootArgCmds.has(cmd) ? (arg || process.cwd()) : (process.argv[4] || process.cwd())));

  if (cmd === 'build') { const g = build(root); console.log(`built: ${Object.keys(g.files).length} files`); return; }
  if (cmd === 'update') { const g = update(root); console.log(`updated: ${Object.keys(g.files).length} files (v${g.meta.version})`); return; }
  if (cmd === 'refresh') { const g = load(root) ? update(root) : build(root); console.log(`graph ready: ${Object.keys(g.files).length} files`); return; }
  if (cmd === 'snapshot') { let g = load(root); if (!g) g = build(root); console.log(writeSnapshot(root, g, [])); return; }

  const g = load(root);
  if (!g) { console.log('no graph yet — run: graph.js build'); return; }

  if (cmd === 'neighbors') {
    if (!arg) { console.log('usage: graph.js neighbors <file>'); return; }
    const rel = arg.split(path.sep).join('/');
    if (!g.files[rel]) { console.log(`'${rel}' not in graph (use a repo-relative path with / separators)`); return; }
    const importedBy = reverseEdges(g);
    console.log(`\n${rel}\nimports →`); console.log(fmtList(g.files[rel].imports || []));
    console.log(`imported-by ←`); console.log(fmtList(importedBy[rel] || []));
    return;
  }
  if (cmd === 'impact') {
    if (!arg) { console.log('usage: graph.js impact <file>'); return; }
    const rel = arg.split(path.sep).join('/');
    if (!g.files[rel]) { console.log(`'${rel}' not in graph`); return; }
    const blast = impact(g, rel);
    console.log(`\nimpact of ${rel}: ${blast.length} file(s) transitively depend on it`);
    console.log(fmtList(blast));
    return;
  }

  const d = derive(g);
  if (cmd === 'stats') {
    console.log(`files ${Object.keys(g.files).length} · deps ${d.edgeCount} · clusters ${d.communities} · cycles ${d.cycles.length} · dead ${d.dead.length} · built ${g.meta.builtAt}`);
  } else if (cmd === 'map') {
    console.log(`\n🗺  forge code map — ${Object.keys(g.files).length} files, ${d.edgeCount} deps, ${d.communities} clusters, ${d.cycles.length} cycles\n`);
    console.log('God-nodes (most depended-on):'); console.log(fmtList(d.godNodes.slice(0, 15).map(x => `${x.rel}   (in ${x.fanIn}, out ${x.fanOut})`)));
    console.log('\nOrchestrators (highest fan-out):'); console.log(fmtList(d.orchestrators.slice(0, 8).map(x => `${x.rel}   (out ${x.fanOut})`)));
    console.log('\nModules:'); console.log(fmtList(Object.entries(d.modules).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}  (${v} files)`)));
    if (d.cycles.length) { console.log('\nDependency cycles:'); console.log(fmtList(d.cycles.slice(0, 8).map(c => c.slice(0, 4).join(' ↔ ') + (c.length > 4 ? ` …(${c.length})` : '')))); }
    if (d.dead.length) { console.log('\nPossible dead/orphan files (0 in, 0 out, non-entry):'); console.log(fmtList(d.dead, 20)); }
  } else {
    console.log('usage: graph.js [build|update|refresh|map|stats|snapshot [root] | neighbors <file> | impact <file>]');
  }
}
try { main(); } catch (e) { console.error('graph error:', e && e.message); process.exit(0); }
