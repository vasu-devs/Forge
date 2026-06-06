#!/usr/bin/env node
'use strict';
// PostToolUse hook: fire-and-forget logging of Edit/Write/Bash actions to a
// project-scoped observations log that forge:learn later distills into instincts.
// MUST always exit 0 and never throw — it must never disrupt the user's tool flow.
const fs = require('fs');
function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  let d = {};
  try { d = JSON.parse(raw || '{}'); } catch { return; }
  const tool = d.tool_name || '';
  if (!/^(Edit|Write|Bash)$/.test(tool)) return;
  const L = require('./lib.js');
  const projDir = process.env.CLAUDE_PROJECT_DIR || d.cwd || process.cwd();
  const ti = d.tool_input || {};
  let detail = '';
  if (tool === 'Bash') detail = String(ti.command || '').replace(/\s+/g, ' ').slice(0, 200);
  else detail = String(ti.file_path || '').slice(0, 300);
  const f = L.obsFile(projDir);
  L.ensureDir(f);
  fs.appendFileSync(f, JSON.stringify({ ts: new Date().toISOString(), tool, detail }) + '\n');
}
try { main(); } catch { /* swallow */ }
process.exit(0);
