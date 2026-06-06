#!/usr/bin/env node
'use strict';
// shunya instinct store CLI — invoked by the shunya:learn skill (and usable by hand).
// Project is derived from the current working directory, matching the SessionStart hook.
//   node shunya-store.js list                      # show this project's instincts
//   node shunya-store.js add '<json|json-array>'   # add instinct(s): {trigger,action,confidence?,evidence?}
//   node shunya-store.js observations [n]           # show last n logged actions (default 40)
//   node shunya-store.js clear-observations         # wipe the observations log after distilling
//   node shunya-store.js remove <substring>         # drop instincts whose trigger/action matches
const fs = require('fs');
const L = require('./lib.js');

function addOne(o) {
  if (!o || !o.trigger || !o.action) { console.error('skip: instinct needs {trigger, action}'); return; }
  const rec = {
    trigger: String(o.trigger),
    action: String(o.action),
    confidence: (o.confidence != null ? Number(o.confidence) : 0.6),
    evidence: o.evidence ? String(o.evidence) : '',
    ts: new Date().toISOString()
  };
  const f = L.instinctsFile(); L.ensureDir(f);
  fs.appendFileSync(f, JSON.stringify(rec) + '\n');
  console.log('added: when', rec.trigger, '->', rec.action, '(conf', rec.confidence + ')');
}
function add() {
  let json = process.argv[3];
  if (!json) { try { json = fs.readFileSync(0, 'utf8'); } catch {} }
  let o; try { o = JSON.parse(json); } catch { console.error('shunya-store add: invalid JSON'); process.exit(1); }
  if (Array.isArray(o)) o.forEach(addOne); else addOne(o);
}
function list() {
  const items = L.dedupeInstincts(L.readJsonl(L.instinctsFile()));
  if (!items.length) { console.log('(no instincts yet for this project: ' + L.projId() + ')'); return; }
  items.forEach(o => console.log(`- [${o.confidence}] when ${o.trigger} -> ${o.action}` + (o.evidence ? `  // ${o.evidence}` : '')));
}
function observations() {
  const n = parseInt(process.argv[3] || '40', 10);
  const items = L.readJsonl(L.obsFile());
  if (!items.length) { console.log('(no observations logged yet for this project)'); return; }
  items.slice(-n).forEach(o => console.log(`${o.ts} ${o.tool} ${o.detail}`));
}
function clearObs() {
  const f = L.obsFile();
  if (fs.existsSync(f)) fs.unlinkSync(f);
  console.log('observations cleared');
}
function remove() {
  const needle = process.argv[3];
  if (!needle) { console.error('remove: pass a substring'); process.exit(1); }
  const f = L.instinctsFile();
  const items = L.readJsonl(f);
  const kept = items.filter(o => !((o.trigger + ' ' + o.action).toLowerCase().includes(needle.toLowerCase())));
  L.ensureDir(f);
  fs.writeFileSync(f, kept.map(o => JSON.stringify(o)).join('\n') + (kept.length ? '\n' : ''));
  console.log(`removed ${items.length - kept.length} instinct(s)`);
}

// --- Global lessons (cross-project, anonymized) ---
function addGlobalOne(o) {
  if (!o || !o.trigger || !o.action) { console.error('skip: lesson needs {trigger, action}'); return; }
  const rec = {
    trigger: String(o.trigger), action: String(o.action),
    confidence: (o.confidence != null ? Number(o.confidence) : 0.6),
    evidence: o.evidence ? String(o.evidence) : '', ts: new Date().toISOString()
  };
  const f = L.globalFile(); L.ensureDir(f);
  fs.appendFileSync(f, JSON.stringify(rec) + '\n');
  console.log('added global: when', rec.trigger, '->', rec.action, '(conf', rec.confidence + ')');
}
function addGlobal() {
  let json = process.argv[3];
  if (!json) { try { json = fs.readFileSync(0, 'utf8'); } catch {} }
  let o; try { o = JSON.parse(json); } catch { console.error('add-global: invalid JSON'); process.exit(1); }
  if (Array.isArray(o)) o.forEach(addGlobalOne); else addGlobalOne(o);
  L.renderGlobalMd();
}
function listGlobal() {
  const items = L.dedupeInstincts(L.readJsonl(L.globalFile()));
  if (!items.length) { console.log('(no global lessons yet)'); return; }
  items.forEach(o => console.log(`- [${o.confidence}] when ${o.trigger} -> ${o.action}` + (o.evidence ? `  // ${o.evidence}` : '')));
  console.log('\nrendered view: ' + L.globalMdFile());
}
function removeGlobal() {
  const needle = process.argv[3];
  if (!needle) { console.error('remove-global: pass a substring'); process.exit(1); }
  const f = L.globalFile();
  const items = L.readJsonl(f);
  const kept = items.filter(o => !((o.trigger + ' ' + o.action).toLowerCase().includes(needle.toLowerCase())));
  L.ensureDir(f);
  fs.writeFileSync(f, kept.map(o => JSON.stringify(o)).join('\n') + (kept.length ? '\n' : ''));
  L.renderGlobalMd();
  console.log(`removed ${items.length - kept.length} global lesson(s)`);
}

const cmd = process.argv[2] || 'list';
try {
  if (cmd === 'add') add();
  else if (cmd === 'list') list();
  else if (cmd === 'observations' || cmd === 'obs') observations();
  else if (cmd === 'clear-observations') clearObs();
  else if (cmd === 'remove') remove();
  else if (cmd === 'add-global') addGlobal();
  else if (cmd === 'list-global') listGlobal();
  else if (cmd === 'remove-global') removeGlobal();
  else console.log('usage: shunya-store.js [list | add <json> | observations [n] | clear-observations | remove <substring> | list-global | add-global <json> | remove-global <substring>]');
} catch (e) { console.error('shunya-store error:', e.message); process.exit(1); }
