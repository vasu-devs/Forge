#!/usr/bin/env node
// forge memory CLI. Commands:
//   index [--limit N | --all]   ingest Claude Code transcripts -> chat catalog + memories (+embeddings)
//   recall "<query>" [-k N]     semantic recall of memories, with source-chat resume links
//   chats  "<query>" [-k N]     find relevant PAST CHATS, with `claude --resume <id>`
//   profile                     (re)synthesize the global personalization profile -> profile.md
//   status                      counts
import fs from 'fs';
import path from 'path';
import * as L from './lib-mem.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0] || 'status';
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const has = (name) => argv.includes(name);
const query = () => argv.slice(1).filter(a => !a.startsWith('-') && argv[argv.indexOf(a) - 1] !== '-k').join(' ').trim();

function indexPrompt(convo, project) {
  return `You are forge's memory indexer. Summarize this Claude Code session and extract durable memories worth recalling later. Output STRICT JSON only, no prose:
{"title":"<= 8 words","summary":"2-4 sentences on what happened and what was decided","topics":["short","tags"],"memories":[{"text":"a durable fact, preference, decision, or gotcha","kind":"fact|preference|decision|gotcha|topic","importance":1-10,"scope":"global|project"}]}

Rules: memories must be specific and durable (worth knowing in a future session). "scope":"global" = a fact/preference about the USER or how they like to work that applies to ANY project; "scope":"project" = specific to this repo. importance: 8-10 only if clearly significant. Max 6 memories; fewer is fine; [] if nothing durable. Project folder: ${project}.

SESSION:
${convo}`;
}
function profilePrompt(ctx) {
  return `You are forge's personalization profiler. From the memories and recent chat summaries below, write a concise, well-organized markdown profile of THIS USER for an AI coding agent to read at the start of every session: who they are, their stack/tools, strong preferences and working style, and current projects/goals. Be factual, no fluff, no invented details. Prefer bullet points under short headings. Keep it under ~250 words. Output STRICT JSON only: {"profile":"<markdown>"}

CONTEXT:
${ctx}`;
}

async function indexOne(t, state) {
  let convo = '';
  try { convo = L.flattenTranscript(t.fp); } catch {}
  if (convo.length < 200) { state[t.fp] = t.mtime; return null; }
  const parsed = L.claudeJSON(indexPrompt(convo, t.proj));
  if (!parsed) return null;
  const date = new Date(t.mtime).toISOString();
  const title = String(parsed.title || t.sessionId).slice(0, 120);
  const summary = String(parsed.summary || '').slice(0, 1400);
  const topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8).map(String) : [];
  const chatEmbed = await L.embed(`${title}. ${summary} ${topics.join(' ')}`);
  L.appendJsonl(L.chatsFile(), { sessionId: t.sessionId, project: t.proj, transcriptPath: t.fp, date, title, summary, topics, embedding: chatEmbed, indexedAt: new Date().toISOString() });
  let i = 0;
  for (const mm of (Array.isArray(parsed.memories) ? parsed.memories : []).slice(0, 6)) {
    if (!mm || !mm.text) continue;
    const text = String(mm.text).slice(0, 500);
    L.appendJsonl(L.memoriesFile(), {
      id: `${t.sessionId.slice(0, 8)}-${i++}-${text.length}-${(date.length * 7) % 97}`,
      text, kind: mm.kind || 'fact', scope: mm.scope === 'global' ? 'global' : t.proj,
      importance: Number(mm.importance) || 5, created: date, lastAccessed: date,
      sourceSessionId: t.sessionId, sourceProject: t.proj, embedding: await L.embed(text)
    });
  }
  state[t.fp] = t.mtime; L.writeJson(L.stateFile(), state);
  return title;
}

// Called by the SessionEnd hook: index one just-ended session, refresh profile periodically.
async function autoindex() {
  const sessionPath = opt('--session');
  if (!sessionPath || !fs.existsSync(sessionPath)) return;
  const state = L.readJson(L.stateFile());
  const mtime = fs.statSync(sessionPath).mtimeMs;
  let indexed = false;
  if (state[sessionPath] !== mtime) {
    const proj = path.basename(path.dirname(sessionPath));
    const sessionId = path.basename(sessionPath).replace(/\.jsonl$/, '');
    const title = await indexOne({ proj, sessionId, fp: sessionPath, mtime }, state);
    if (title) { console.log('auto-indexed:', title); indexed = true; }
  }
  // periodic profile refresh
  const every = parseInt(process.env.FORGE_PROFILE_EVERY || '3', 10);
  const st = L.readJson(L.stateFile());
  st._sinceProfile = (Number(st._sinceProfile) || 0) + (indexed ? 1 : 0);
  if (indexed && (!fs.existsSync(L.profileFile()) || st._sinceProfile >= every)) {
    await profile();
    st._sinceProfile = 0;
  }
  L.writeJson(L.stateFile(), st);
}

async function index() {
  const root = L.projectsRoot();
  if (!fs.existsSync(root)) { console.log('no transcripts dir at', root); return; }
  const state = L.readJson(L.stateFile());
  const files = [];
  for (const proj of fs.readdirSync(root)) {
    const pdir = path.join(root, proj);
    let st; try { st = fs.statSync(pdir); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of fs.readdirSync(pdir)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(pdir, f);
      files.push({ proj, sessionId: f.replace(/\.jsonl$/, ''), fp, mtime: fs.statSync(fp).mtimeMs });
    }
  }
  let todo = files.filter(x => state[x.fp] !== x.mtime).sort((a, b) => b.mtime - a.mtime);
  const limit = has('--all') ? todo.length : parseInt(opt('--limit', '15'), 10);
  todo = todo.slice(0, limit);
  console.log(`indexing ${todo.length} session(s) (of ${files.length} total)...`);
  let n = 0;
  for (const t of todo) {
    const title = await indexOne(t, state);
    if (title) { console.log(`  ✓ ${title}`); n++; }
    else console.error('  skip:', t.sessionId.slice(0, 8));
  }
  console.log(`done. indexed ${n} session(s).`);
}

async function recall() {
  const q = query();
  if (!q) { console.error('usage: recall "<query>" [-k N]'); process.exit(1); }
  const mems = L.readJsonl(L.memoriesFile());
  if (!mems.length) { console.log('(no memories yet — run: forge-mem index)'); return; }
  const k = parseInt(opt('-k', '6'), 10);
  const qv = await L.embed(q);
  const now = Date.now();
  const scored = mems.map(m => ({ m, ...L.scoreMemory(m, qv, now) })).sort((a, b) => b.score - a.score).slice(0, k);
  const hot = new Set(scored.map(s => s.m.id));
  L.writeJsonl(L.memoriesFile(), mems.map(m => hot.has(m.id) ? { ...m, lastAccessed: new Date(now).toISOString() } : m));
  console.log(`\n🧠 recall: "${q}"\n`);
  for (const s of scored) {
    const m = s.m;
    console.log(`• [${m.kind} · imp ${m.importance} · rel ${s.rel.toFixed(2)}] ${m.text}`);
    console.log(`    ↳ ${m.sourceProject}   ·   continue that chat:  claude --resume ${m.sourceSessionId}`);
  }
}

async function chats() {
  const q = query();
  if (!q) { console.error('usage: chats "<query>" [-k N]'); process.exit(1); }
  const cs = L.readJsonl(L.chatsFile());
  if (!cs.length) { console.log('(no chats indexed yet — run: forge-mem index)'); return; }
  const k = parseInt(opt('-k', '5'), 10);
  const qv = await L.embed(q);
  const scored = cs.map(c => ({ c, rel: (L.cosine(c.embedding || [], qv) + 1) / 2 })).sort((a, b) => b.rel - a.rel).slice(0, k);
  console.log(`\n📂 past chats matching: "${q}"\n`);
  for (const s of scored) {
    const c = s.c;
    console.log(`• ${c.title}   (${String(c.date).slice(0, 10)} · ${c.project} · match ${s.rel.toFixed(2)})`);
    console.log(`    ${c.summary}`);
    console.log(`    ↳ resume:  claude --resume ${c.sessionId}\n`);
  }
}

async function profile() {
  const mems = L.readJsonl(L.memoriesFile()).filter(m => m.scope === 'global' || m.kind === 'preference' || m.kind === 'fact');
  const cs = L.readJsonl(L.chatsFile()).slice(-40);
  if (!mems.length && !cs.length) { console.log('(nothing to profile yet — run: forge-mem index)'); return; }
  const ctx = 'MEMORIES:\n' + mems.slice(0, 60).map(m => `- (${m.kind}) ${m.text}`).join('\n') +
    '\n\nRECENT CHAT SUMMARIES:\n' + cs.map(c => `- ${c.title}: ${c.summary}`).join('\n');
  const parsed = L.claudeJSON(profilePrompt(ctx));
  if (!parsed || !parsed.profile) { console.error('profile generation failed'); return; }
  L.ensureDir(L.profileFile());
  fs.writeFileSync(L.profileFile(), String(parsed.profile).trim() + '\n');
  console.log('profile written:', L.profileFile());
}

function status() {
  const mems = L.readJsonl(L.memoriesFile());
  const cs = L.readJsonl(L.chatsFile());
  const prof = fs.existsSync(L.profileFile());
  console.log('forge memory status');
  console.log('  memories:', mems.length, '(' + mems.filter(m => m.scope === 'global').length + ' global)');
  console.log('  chats indexed:', cs.length);
  console.log('  profile:', prof ? 'present (' + L.profileFile() + ')' : 'not generated yet');
  console.log('  data dir:', L.MEMDIR);
}

(async () => {
  try {
    if (cmd === 'index') await index();
    else if (cmd === 'autoindex') await autoindex();
    else if (cmd === 'recall') await recall();
    else if (cmd === 'chats') await chats();
    else if (cmd === 'profile') await profile();
    else if (cmd === 'status') status();
    else console.log('usage: forge-mem.mjs [index [--limit N|--all] | recall "<q>" [-k N] | chats "<q>" [-k N] | profile | status]');
  } catch (e) { console.error('forge-mem error:', e && e.message); process.exit(1); }
})();
