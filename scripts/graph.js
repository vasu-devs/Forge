#!/usr/bin/env node
'use strict';
// forge:graph — a zero-dependency, self-updating code map.
//
// Synthesis of the three graph tools, built natively into forge:
//   • god-nodes + communities      (graphify)
//   • module / architecture map    (Understand-Anything)
//   • neighbors / impact queries   (CodeGraph)
// ...but LIVE: built once, then patched incrementally by mtime so the agent's
// structural context never goes stale. Pure Node, no deps. Never throws fatally.
//
// CLI:
//   graph.js build|update|refresh [root]   build full | patch changed | build-if-missing-else-update
//   graph.js map|stats [root]              architecture map / counts
//   graph.js neighbors <file> [root]       direct imports + importers of a file
//   graph.js impact <file> [root]          transitive blast radius (who breaks if this changes)
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

// msys "/c/Users/x" → native "C:\Users\x" (hooks may hand us either form on Windows)
function toNative(p) { const m = String(p || '').match(/^\/([a-zA-Z])\/(.*)$/); return m ? m[1].toUpperCase() + ':\\' + m[2].replace(/\//g, '\\') : p; }
const dirOf = (p) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
function normPosix(p) {                                  // collapse ./ and ../ on a posix-style path
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else out.push('..'); }
    else out.push(seg);
  }
  return out.join('/');
}
const graphDir = (root) => path.join(L.BASE, 'graph', L.projId(root));
const graphFile = (root) => path.join(graphDir(root), 'graph.json');
const snapFile = (root) => path.join(graphDir(root), 'snapshot.md');

// ---- file discovery ----
function walk(root) {
  const out = [];
  (function rec(abs) {
    if (out.length >= MAX_FILES) return;
    let entries; try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      const name = e.name;
      const full = path.join(abs, name);
      if (e.isDirectory()) {
        if (IGNORE.has(name) || (name.startsWith('.') && name !== '.')) continue;
        rec(full);
      } else if (e.isFile()) {
        if (LANG[path.extname(name).toLowerCase()]) out.push(full);
      }
    }
  })(root);
  return out;
}
const relKey = (root, abs) => path.relative(root, abs).split(path.sep).join('/');

// ---- import extraction (per language) → array of intra-repo rel targets ----
function extract(content, rel, lang, fileSet) {
  const fromDir = dirOf(rel);
  const hits = new Set();
  const add = (t) => { if (t && t !== rel && fileSet.has(t)) hits.add(t); };

  const jsResolve = (spec) => {
    if (!spec.startsWith('.')) return;                   // bare / aliased → external
    const base = normPosix(fromDir + '/' + spec);
    const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.json'];
    for (const e of exts) if (fileSet.has(base + e)) return add(base + e);
    for (const e of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']) if (fileSet.has(base + '/index' + e)) return add(base + '/index' + e);
  };
  const pyResolve = (mod) => {
    let dots = 0; while (mod[dots] === '.') dots++;
    const tail = mod.slice(dots).replace(/\./g, '/');
    if (!tail) return;
    if (dots > 0) {                                      // relative import → resolve from the package dir
      let d = fromDir; for (let i = 1; i < dots; i++) d = dirOf(d);
      const cand = normPosix((d ? d + '/' : '') + tail);
      if (fileSet.has(cand + '.py')) return add(cand + '.py');
      if (fileSet.has(cand + '/__init__.py')) return add(cand + '/__init__.py');
      return;
    }
    // absolute: try repo root first, then a UNIQUE suffix match anywhere (handles nested package roots)
    if (fileSet.has(tail + '.py')) return add(tail + '.py');
    if (fileSet.has(tail + '/__init__.py')) return add(tail + '/__init__.py');
    const sufA = '/' + tail + '.py', sufB = '/' + tail + '/__init__.py';
    let found = null, count = 0;
    for (const k of fileSet) { if (k.endsWith(sufA) || k.endsWith(sufB)) { found = k; if (++count > 1) break; } }
    if (count === 1) add(found);
  };
  const relFileResolve = (spec, exts) => {               // C include / ruby require_relative / rust mod
    const base = normPosix(fromDir + '/' + spec);
    if (fileSet.has(base)) return add(base);
    for (const e of exts) if (fileSet.has(base + e)) return add(base + e);
  };

  let m;
  if (lang === 'js' || lang === 'ts') {
    const res = [/\b(?:import|export)\b[^;\n]*?\bfrom\s*['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm];
    for (const re of res) while ((m = re.exec(content))) jsResolve(m[1]);
  } else if (lang === 'py') {
    const reFrom = /^\s*from\s+(\.*[\w.]*)\s+import\b/gm;
    const reImp = /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm;
    while ((m = reFrom.exec(content))) if (m[1]) pyResolve(m[1]);
    while ((m = reImp.exec(content))) for (const mod of m[1].split(',')) pyResolve(mod.trim());
  } else if (lang === 'c') {
    const re = /^\s*#\s*include\s*"([^"]+)"/gm;
    while ((m = re.exec(content))) relFileResolve(m[1], []);
  } else if (lang === 'rb') {
    const re = /\brequire_relative\s+['"]([^'"]+)['"]/g;
    while ((m = re.exec(content))) relFileResolve(m[1], ['.rb']);
  } else if (lang === 'rs') {
    const re = /^\s*(?:pub\s+)?mod\s+(\w+)\s*;/gm;
    while ((m = re.exec(content))) { relFileResolve(m[1] + '.rs', []); relFileResolve(m[1] + '/mod.rs', []); }
  }
  return [...hits];
}

function parseFile(abs, rel, fileSet) {
  let st; try { st = fs.statSync(abs); } catch { return null; }
  if (st.size > MAX_BYTES) return { lang: LANG[path.extname(rel).toLowerCase()], size: st.size, mtime: st.mtimeMs, imports: [] };
  let content = ''; try { content = fs.readFileSync(abs, 'utf8'); } catch { return null; }
  const lang = LANG[path.extname(rel).toLowerCase()];
  return { lang, size: st.size, mtime: st.mtimeMs, imports: extract(content, rel, lang, fileSet) };
}

// ---- build / update ----
function build(root) {
  const abss = walk(root);
  const fileSet = new Set(abss.map(a => relKey(root, a)));
  const files = {};
  for (const abs of abss) { const rel = relKey(root, abs); const r = parseFile(abs, rel, fileSet); if (r) files[rel] = r; }
  const g = { meta: { root, builtAt: new Date().toISOString(), version: 1 }, files };
  save(root, g); writeSnapshot(root, g, []);
  return g;
}
function update(root) {
  const g = load(root);
  if (!g) return build(root);
  const abss = walk(root);
  const fileSet = new Set(abss.map(a => relKey(root, a)));
  const changed = [];
  // drop deleted
  for (const rel of Object.keys(g.files)) if (!fileSet.has(rel)) { delete g.files[rel]; }
  // add / reparse changed (by mtime)
  for (const abs of abss) {
    const rel = relKey(root, abs);
    let st; try { st = fs.statSync(abs); } catch { continue; }
    const prev = g.files[rel];
    if (!prev || st.mtimeMs > prev.mtime) { const r = parseFile(abs, rel, fileSet); if (r) { g.files[rel] = r; changed.push(rel); } }
  }
  g.meta.builtAt = new Date().toISOString(); g.meta.version = (g.meta.version || 1) + 1;
  save(root, g); writeSnapshot(root, g, changed);
  return g;
}
function save(root, g) { const f = graphFile(root); L.ensureDir(f); fs.writeFileSync(f, JSON.stringify(g)); }
function load(root) { try { return JSON.parse(fs.readFileSync(graphFile(root), 'utf8')); } catch { return null; } }

// ---- derived analytics (computed on demand, never stored stale) ----
function derive(g) {
  const importedBy = {}; const files = g.files;
  for (const rel of Object.keys(files)) importedBy[rel] = importedBy[rel] || [];
  for (const rel of Object.keys(files)) for (const t of files[rel].imports) { (importedBy[t] = importedBy[t] || []).push(rel); }
  const list = Object.keys(files);
  const godNodes = list.map(rel => ({ rel, fanIn: (importedBy[rel] || []).length, fanOut: files[rel].imports.length }))
    .filter(x => x.fanIn > 0).sort((a, b) => b.fanIn - a.fanIn);
  const edgeCount = list.reduce((n, rel) => n + files[rel].imports.length, 0);
  // modules = first 1-2 path segments
  const modules = {};
  for (const rel of list) {
    const segs = rel.split('/');
    const key = segs.length > 2 ? segs.slice(0, 2).join('/') : (segs.length === 2 ? segs[0] : '(root)');
    modules[key] = (modules[key] || 0) + 1;
  }
  // communities via label propagation over the undirected projection (deterministic)
  const adj = {}; for (const rel of list) adj[rel] = new Set();
  for (const rel of list) for (const t of files[rel].imports) { adj[rel].add(t); adj[t] && adj[t].add(rel); }
  const label = {}; list.forEach((rel, i) => label[rel] = i);
  const ordered = [...list].sort();
  for (let it = 0; it < 8; it++) {
    let moved = 0;
    for (const rel of ordered) {
      const cnt = {}; let best = label[rel], bestN = -1;
      for (const nb of adj[rel]) { const l = label[nb]; cnt[l] = (cnt[l] || 0) + 1; if (cnt[l] > bestN || (cnt[l] === bestN && l < best)) { bestN = cnt[l]; best = l; } }
      if (bestN > 0 && best !== label[rel]) { label[rel] = best; moved++; }
    }
    if (!moved) break;
  }
  const comm = {}; for (const rel of list) comm[label[rel]] = (comm[label[rel]] || 0) + 1;
  const communities = Object.values(comm).filter(n => n > 1).length;
  return { importedBy, godNodes, edgeCount, modules, communities };
}

function impact(g, file) {                                // reverse-transitive: who depends on `file`
  const { importedBy } = derive(g);
  const seen = new Set(); const q = [file];
  while (q.length) { const cur = q.shift(); for (const up of (importedBy[cur] || [])) if (!seen.has(up)) { seen.add(up); q.push(up); } }
  return [...seen];
}

// ---- snapshot for SessionStart injection (compact, capped) ----
function writeSnapshot(root, g, changed) {
  const d = derive(g);
  const n = Object.keys(g.files).length;
  if (!n) { try { fs.writeFileSync(snapFile(root), ''); } catch {} return ''; }
  const gods = d.godNodes.slice(0, 8).map(x => `\`${x.rel}\` ←${x.fanIn}`).join(' · ');
  const mods = Object.entries(d.modules).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`).join(' · ');
  // recently changed: prefer this update's `changed`, else most-recently-modified files
  let recent = changed.slice(0, 4);
  if (!recent.length) recent = Object.entries(g.files).sort((a, b) => b[1].mtime - a[1].mtime).slice(0, 3).map(e => e[0]);
  const recLines = recent.map(rel => {
    const imp = g.files[rel] ? g.files[rel].imports.length : 0;
    const fin = (d.importedBy[rel] || []).length;
    return `\`${rel}\` (imports ${imp}, imported-by ${fin})`;
  }).join(' · ');
  const md = [
    `## forge — live code map  _(${n} files · ${d.edgeCount} deps · ${d.communities} clusters · updated ${g.meta.builtAt.slice(0, 16).replace('T', ' ')})_`,
    'Structural context, kept fresh as you work. Use it to know blast radius before editing.',
    '',
    gods ? `**Most-depended-on (god-nodes):** ${gods}` : '',
    mods ? `**Modules:** ${mods}` : '',
    recLines ? `**Recently changed:** ${recLines}` : '',
    '',
    '_Query live: `node ~/.claude/skills/forge/scripts/graph.js neighbors <file>` · `impact <file>` · `map`._'
  ].filter(Boolean).join('\n').slice(0, 2000);
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
  const d = derive(g);

  if (cmd === 'stats') {
    console.log(`files ${Object.keys(g.files).length} · deps ${d.edgeCount} · clusters ${d.communities} · built ${g.meta.builtAt}`);
  } else if (cmd === 'map') {
    console.log(`\n🗺  forge code map — ${Object.keys(g.files).length} files, ${d.edgeCount} deps, ${d.communities} clusters\n`);
    console.log('God-nodes (most depended-on):');
    console.log(fmtList(d.godNodes.slice(0, 15).map(x => `${x.rel}   (in ${x.fanIn}, out ${x.fanOut})`)));
    console.log('\nModules:');
    console.log(fmtList(Object.entries(d.modules).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}  (${v} files)`)));
  } else if (cmd === 'neighbors') {
    if (!arg) { console.error('usage: graph.js neighbors <file>'); process.exit(1); }
    const rel = arg.split(path.sep).join('/');
    if (!g.files[rel]) { console.log(`'${rel}' not in graph (try a repo-relative path with / separators)`); return; }
    console.log(`\n${rel}\nimports →`); console.log(fmtList(g.files[rel].imports));
    console.log(`imported-by ←`); console.log(fmtList(d.importedBy[rel] || []));
  } else if (cmd === 'impact') {
    if (!arg) { console.error('usage: graph.js impact <file>'); process.exit(1); }
    const rel = arg.split(path.sep).join('/');
    if (!g.files[rel]) { console.log(`'${rel}' not in graph`); return; }
    const blast = impact(g, rel);
    console.log(`\nimpact of ${rel}: ${blast.length} file(s) transitively depend on it`);
    console.log(fmtList(blast));
  } else {
    console.log('usage: graph.js [build|update|refresh|map|stats|snapshot [root] | neighbors <file> | impact <file>]');
  }
}
try { main(); } catch (e) { console.error('graph error:', e && e.message); process.exit(0); }
