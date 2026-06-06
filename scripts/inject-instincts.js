#!/usr/bin/env node
'use strict';
// SessionStart hook: inject forge's learned context into every session —
//   (1) GLOBAL lessons: anonymized, cross-project, loaded everywhere.
//   (2) PROJECT instincts: specific to this repo, loaded only where they exist.
// Emits nothing when there's nothing to say. Must never throw.
function pick(items, minConfEnv, capEnv, capDefault) {
  let arr = items;
  const minConf = parseFloat(process.env[minConfEnv] || '0');
  if (minConf > 0) arr = arr.filter(o => (Number(o.confidence) || 0) >= minConf);
  const cap = parseInt(process.env[capEnv] || capDefault, 10);
  return arr.slice(0, cap);
}
function section(title, intro, items) {
  if (!items.length) return '';
  const body = items.map(o => `- When ${o.trigger} → ${o.action}` + (o.confidence ? ` _(conf ${o.confidence})_` : '')).join('\n');
  return ['## ' + title, intro, '', body].join('\n');
}
function main() {
  const L = require('./lib.js');
  const projDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Personalization profile (who the user is / how they work) — loaded everywhere if present.
  let profileSec = '';
  try {
    const fs = require('fs'), path = require('path');
    const pf = path.join(L.BASE, 'memory', 'profile.md');
    if (fs.existsSync(pf)) {
      const p = fs.readFileSync(pf, 'utf8').trim().slice(0, 4000);
      if (p) profileSec = '## forge — about you (personalization)\nWho you are and how you like to work, learned across past sessions. Tailor to it; an explicit user instruction always wins.\n\n' + p;
    }
  } catch {}

  const global = pick(L.dedupeInstincts(L.readJsonl(L.globalFile())), 'FORGE_GLOBAL_MIN_CONF', 'FORGE_GLOBAL_MAX', '15');
  const project = pick(L.dedupeInstincts(L.readJsonl(L.instinctsFile(projDir))), 'FORGE_INSTINCT_MIN_CONF', 'FORGE_INSTINCT_MAX', '12');

  const parts = [];
  const gSec = section(
    'forge — global lessons (cross-project)',
    'Anonymized lessons learned across past sessions everywhere. Strong priors for how to work well; an explicit user instruction always wins.',
    global
  );
  const pSec = section(
    'forge — learned instincts for this project',
    'Patterns distilled from past sessions in THIS repo. Priors, not laws — a user instruction overrides them.',
    project
  );
  if (profileSec) parts.push(profileSec);
  if (gSec) parts.push(gSec);
  if (pSec) parts.push(pSec);
  if (!parts.length) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') }
  }));
}
try { main(); } catch { /* swallow */ }
process.exit(0);
