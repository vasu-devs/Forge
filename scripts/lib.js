'use strict';
// Shared helpers for forge instinct scripts. No external deps. Used by both
// the plugin hooks (SessionStart/PostToolUse) and the agent-invoked forge-store CLI.
const fs = require('fs');
const path = require('path');
const os = require('os');

// Fixed, deterministic data dir so hooks AND the agent CLI always agree on location,
// regardless of whether CLAUDE_PLUGIN_DATA is set in a given context.
const BASE = process.env.FORGE_DATA_DIR || path.join(os.homedir(), '.claude', 'forge-data');

// Normalize a directory to a canonical key so the SessionStart hook (which sees
// CLAUDE_PROJECT_DIR, possibly msys-style "/c/Users/...") and the forge-store CLI
// (which sees native "C:\Users\..." via process.cwd()) resolve to the SAME id.
function normDir(d) {
  d = String(d || process.cwd());
  const m = d.match(/^\/([a-zA-Z])\/(.*)$/);     // /c/Users/x  ->  C:\Users\x
  if (m) d = m[1] + ':\\' + m[2];
  return d.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();  // unify seps, strip trailing, case-fold
}
function projId(dir) {
  return normDir(dir).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(-120) || 'default';
}
function instinctsFile(dir) { return path.join(BASE, 'instincts', projId(dir) + '.jsonl'); }
function obsFile(dir) { return path.join(BASE, 'observations', projId(dir) + '.jsonl'); }
function ensureDir(f) { fs.mkdirSync(path.dirname(f), { recursive: true }); }
function readJsonl(f) {
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}
// Dedupe instincts by trigger+action, keeping the highest-confidence copy, sorted desc.
function dedupeInstincts(items) {
  const m = new Map();
  for (const o of items) {
    if (!o || !o.trigger || !o.action) continue;
    const k = o.trigger + '|' + o.action;
    const c = Number(o.confidence) || 0;
    if (!m.has(k) || (Number(m.get(k).confidence) || 0) < c) m.set(k, o);
  }
  return [...m.values()].sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
}

// --- Shared quality gate (used by BOTH the auto-distiller and the manual forge-store CLI,
// so the hand-add path can't bypass the rules the forge:learn skill advertises) ---
const PLATITUDE = /\b(write clean code|clean code|follow best practices|best practices|be careful|do your best|use good|write good|make sure to test|test thoroughly|be thorough|pay attention|keep it simple|don'?t overcomplicate)\b/i;
function isPlatitude(s) { return PLATITUDE.test(String(s || '')); }
// Best-effort backstop for GLOBAL lessons: reject obvious project/identifier leakage
// (path, source filename, version token, scoped package). NOT a guarantee — the author
// still owns anonymization; this just catches the easy misses.
function looksIdentifying(s) {
  s = String(s || '');
  return /[\\/]/.test(s)
    || /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|rb|php|cs|kt|swift|vue|svelte|sql|sh)\b/i.test(s)
    || /\b\d+\.\d+/.test(s)
    || /@[a-z0-9-]+\/[a-z0-9-]+/i.test(s);
}
// A lesson clears the gate if it's substantive (not one-word) and not a platitude;
// global lessons additionally must not look identifying.
function lessonPasses(o, { global = false, minConf = 0 } = {}) {
  if (!o || typeof o.trigger !== 'string' || typeof o.action !== 'string') return false;
  if ((Number(o.confidence) || 0) < minConf) return false;
  if (o.trigger.trim().length < 8 || o.action.trim().length < 12) return false;
  if (isPlatitude(o.trigger) || isPlatitude(o.action)) return false;
  if (global && (looksIdentifying(o.trigger) || looksIdentifying(o.action))) return false;
  return true;
}

// --- Global lessons (cross-project, anonymized) ---
function globalFile() { return path.join(BASE, 'global-lessons.jsonl'); }
function globalMdFile() { return path.join(BASE, 'LESSONS.md'); }
// Regenerate the human-readable LESSONS.md from the JSONL source of truth.
function renderGlobalMd() {
  const items = dedupeInstincts(readJsonl(globalFile()));
  const lines = [
    '# forge — Global Lessons',
    '',
    '_Anonymized, cross-project lessons distilled by `forge:learn`. Auto-loaded into every session via the forge SessionStart hook. This file is a rendered view; the source of truth is `global-lessons.jsonl`. Edit lessons with the forge-store CLI (`add-global` / `remove-global`), not by hand._',
    '',
    `_${items.length} lesson(s), highest-confidence first._`,
    ''
  ];
  for (const o of items) {
    lines.push(`- **When ${o.trigger}** → ${o.action}` + (o.confidence ? ` _(conf ${o.confidence})_` : '') + (o.evidence ? `  \n  <sub>${o.evidence}</sub>` : ''));
  }
  const f = globalMdFile(); ensureDir(f);
  fs.writeFileSync(f, lines.join('\n') + '\n');
}

// --- Auto-learn state (throttle bookkeeping) ---
function stateFile(dir) { return path.join(BASE, 'state', projId(dir) + '.json'); }
function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } }
function writeJson(f, o) { ensureDir(f); fs.writeFileSync(f, JSON.stringify(o)); }
function countLines(f) { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).length; } catch { return 0; } }
// Append an instinct/lesson record to a JSONL store.
function appendRecord(f, o) {
  ensureDir(f);
  fs.appendFileSync(f, JSON.stringify({
    trigger: String(o.trigger), action: String(o.action),
    confidence: Number(o.confidence) || 0.6, evidence: o.evidence ? String(o.evidence) : 'auto',
    ts: new Date().toISOString()
  }) + '\n');
}

module.exports = {
  BASE, projId, instinctsFile, obsFile, globalFile, globalMdFile, renderGlobalMd,
  stateFile, readJson, writeJson, countLines, appendRecord,
  ensureDir, readJsonl, dedupeInstincts,
  isPlatitude, looksIdentifying, lessonPasses
};
