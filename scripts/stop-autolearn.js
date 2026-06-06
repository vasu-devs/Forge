#!/usr/bin/env node
'use strict';
// Stop hook: fires when the agent finishes a turn. Throttles, and only when enough
// new work has accumulated, spawns the background distiller (distill.js) DETACHED so
// it never blocks the user. Deterministic + cheap; the expensive LLM call lives in the child.
// Disable entirely with FORGE_AUTOLEARN=off. Cadence via FORGE_LEARN_EVERY (default 8 new actions).
const fs = require('fs');
function main() {
  if (process.env.FORGE_DISTILLER === '1') return;                         // we're inside a distill child
  if ((process.env.FORGE_AUTOLEARN || 'on').toLowerCase() === 'off') return;
  let raw = ''; try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  let d = {}; try { d = JSON.parse(raw || '{}'); } catch { return; }
  if (d.stop_hook_active === true) return;                                 // avoid continuation loops
  const transcript = d.transcript_path;
  if (!transcript || !fs.existsSync(transcript)) return;
  const cwd = d.cwd || process.cwd();

  const L = require('./lib.js');
  const every = parseInt(process.env.FORGE_LEARN_EVERY || '8', 10);
  const obs = L.countLines(L.obsFile(cwd));
  const st = L.readJson(L.stateFile(cwd));
  const last = Number(st.lastObs || 0);
  if (obs - last < every) return;                                          // not enough new work yet

  // Mark BEFORE spawning so a rapid second Stop doesn't double-fire.
  L.writeJson(L.stateFile(cwd), { lastObs: obs, lastDistillTs: new Date().toISOString() });

  if (process.env.FORGE_DISTILL_DRYRUN === '1') {
    console.error(`[forge autolearn] would distill (obs=${obs}, delta=${obs - last}, every=${every})`);
    return;
  }
  const path = require('path');
  const { spawn } = require('child_process');
  const child = spawn(process.execPath, [path.join(__dirname, 'distill.js'), transcript, cwd], {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: { ...process.env, FORGE_DISTILLER: '1' }
  });
  child.unref();
}
try { main(); } catch { /* swallow */ }
process.exit(0);
