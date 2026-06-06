# Cross‑Session Memory & Personalization in LLM Products — Research Report

> **Provenance:** Produced 2026‑06‑06 by a deep‑research harness run: **105 agents · 23 sources fetched · 111 claims extracted · 25 adversarially verified (24 confirmed, 1 killed) · ~3.0M tokens.**
> Method: decompose into 5 angles → 5 parallel web‑search agents → URL‑dedup + fetch → 3‑vote adversarial verification per claim (≥2/3 refutes kills it) → synthesize, rank by confidence, cite.
> This file is the durable record so the tokens spent are reusable knowledge. It informed the `forge memory` subsystem (`forge:recall`).

---

## TL;DR

Big‑lab cross‑chat memory (ChatGPT "Memory", Anthropic Claude / Claude Code memory; Gemini/Copilot similar) converges on **one common architecture**:

> **distill durable facts/preferences from conversations → store them *outside* the context window (key‑value notes, vector embeddings, or a knowledge graph) → retrieve the relevant subset → inject it (preloaded at session start *or* fetched on demand) — and treat it as *soft context*, not enforced configuration.**

This is **categorically different** from **KV cache** and **prompt caching**, which are ephemeral prefix‑reuse optimizations for cost/latency and carry **no semantic recall**. The proven building blocks for real long‑term memory are: extraction/consolidation pipelines (Mem0), the *Generative Agents* memory‑stream scoring (recency + importance + relevance), and knowledge‑graph memory (Mem0g, Zep/Graphiti) — plus Anthropic's own primitives (the **memory tool**, structured note‑taking, **compaction**). Claude Code already ships the foundations (per‑project auto‑memory, fresh‑context sessions, hooks, transcripts on disk), so a local "super‑memory" layer is very buildable.

---

## 1. Terminology — the distinction that matters

**Verified (3‑0): KV cache and prompt caching are NOT cross‑chat memory.** They are ephemeral prefix‑reuse optimizations.

| Concept | What it is | Lifespan | Stores semantic facts? |
|---|---|---|---|
| **KV cache** | Transformer attention keys/values held in GPU memory *during a single forward pass / request* so past tokens aren't recomputed | Per‑request, milliseconds | ❌ No |
| **Prompt caching** (Anthropic) | Reuse of a **byte‑identical prompt prefix** (tools → system → messages, in that order) across calls; `cache_control` type is literally `"ephemeral"`, **default 5‑minute TTL** (extendable to 1h at extra cost) | Minutes | ❌ No |
| **Semantic / long‑term memory** | A **separate store** of extracted facts + a **retrieval** step that injects the relevant ones into new context | Persistent, grows | ✅ Yes |

- Anthropic docs: caching "optimizes API usage by allowing resuming from specific prefixes"; "Cache hits require 100% identical prompt segments."
- LangChain docs state it plainly: *"Prompt caching reduces API costs by caching tokens, but does NOT provide conversation memory."*
- Note: a 2026 regression dropped Claude Code's cache TTL 1h→5m — so cache lifetime isn't reliable even as a non‑memory mechanism.
- **Sources:** [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [LangChain Anthropic middleware](https://docs.langchain.com/oss/python/integrations/middleware/anthropic)

---

## 2. How the big labs do cross‑chat memory

### OpenAI ChatGPT "Memory" — **two distinct mechanisms** (verified 3‑0)
1. **Saved memories** — details the user explicitly asks it to remember. Persistent, kept until deleted, **always applied**. (Reverse‑engineering: implemented via an explicit `bio` tool.)
2. **Reference Chat History (RCH)** — automatic insights *distilled* from past chats; **dynamic** (can change/drop over time because "ChatGPT doesn't retain every detail"). As of **Apr 10, 2025** it can reference *all* past conversations and personalizes **on demand** by searching past chats, saved memories, files, and connected apps, deciding *when* personalization helps.
   - Independent reverse‑engineering (Embrace the Red) describes RCH as an evolving profile (~40 recent chat summaries) plus sub‑components: *Notable Past Conversation Topics*, *Helpful User Insights*, *Assistant Response Preferences*. (Not official; openai.com/help.openai.com 403 automated fetch.)
   - **Sources:** [OpenAI: Memory and new controls](https://openai.com/index/memory-and-new-controls-for-chatgpt/) · [Help: reference saved memories](https://help.openai.com/en/articles/11146739-how-does-reference-saved-memories-work)
   - ⚠️ A claim that each mechanism has independent on/off toggles + conversational editing + Temporary‑Chat bypass was **REFUTED (1‑2)** — exact control granularity is uncertain; re‑check OpenAI Help.

### Anthropic Claude Code — **two soft‑context mechanisms** (verified 3‑0)
Each session begins with a **fresh context window**. Two mechanisms carry knowledge across sessions, both **loaded at the start of every conversation**, both treated as **context, not enforced configuration**:
1. **CLAUDE.md** — human‑written.
2. **Auto memory** — Claude‑written, **machine‑local**, per‑project at `~/.claude/projects/<project>/memory/` (path derived from the git repo, shared across worktrees, *not* across machines). A `MEMORY.md` index **+** optional topic files.
   - **Load limit:** only the **first 200 lines (or first 25KB, whichever comes first)** of `MEMORY.md` is preloaded at session start. Topic files & overflow are read **on demand** via file tools.
   - Requires **Claude Code v2.1.59+**.
   - **Source:** [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)

### Anthropic first‑party agentic‑memory primitives (verified 3‑0)
1. **Memory tool** — `{type:"memory_20250818", name:"memory"}`. Claude can create/read/update/delete files in a `/memories` directory; an auto‑injected system prompt instructs *"ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE."*
2. **Structured note‑taking ("agentic memory")** — the agent writes notes to durable storage *outside* the context window (e.g. `NOTES.md`) and pulls them back later.
3. **Compaction** (beta `compact-2026-01-12`) — near the context limit, summarize the conversation and reinitiate a fresh window with the summary; in Claude Code it preserves *"critical architectural decisions, unresolved bugs, and implementation details — discarding redundant tool outputs."*
   - **Sources:** [memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) · [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)

### Common architecture (synthesis)
`extract → store (KV notes / embeddings / graph) → retrieve relevant subset → inject (preload at start OR fetch on demand) → treat as soft context`. The split between **always‑preloaded profile** (cheap, small) and **on‑demand semantic retrieval** (richer) is the key design pattern.

---

## 3. Techniques & building blocks

### Generative Agents "memory stream" — the canonical retrieval recipe (verified 3‑0)
(Park et al., UIST 2023, [arXiv 2304.03442](https://arxiv.org/pdf/2304.03442))
- Each experience stored as a **natural‑language record** with a **creation** timestamp and a **most‑recent‑access** timestamp (a chronological log; embeddings computed *at retrieval*, not as the storage form).
- Retrieval score: **`score = α_recency·recency + α_importance·importance + α_relevance·relevance`**, with **all α = 1**.
  - **recency** = exponential decay (**factor 0.995**) over hours since last access.
  - **importance** = LLM‑rated **1–10** (1 mundane … 10 poignant).
  - **relevance** = cosine similarity between the memory's embedding and the query embedding.
- This is the hybrid scoring to adapt. *(forge memory uses relevance + recency + importance with tuned weights.)*

### Mem0 — production extract/consolidate pipeline (verified 3‑0)
([arXiv 2504.19413](https://arxiv.org/pdf/2504.19413))
- "Dynamically extracts, consolidates, and retrieves salient information from ongoing multi‑session conversations" to beat fixed context windows.
- **Two‑phase design:** an **extraction** phase (new memories from messages + history) and an **update** phase (evaluate each extracted memory against similar existing ones for **consolidation & conflict resolution**).
- Graph variant **Mem0g** stores conversational elements as a knowledge graph; ~**2% higher** overall LLM‑as‑Judge on LOCOMO (68.44% vs 66.88%) — but the gain is concentrated in **temporal reasoning**, *not* uniform (base Mem0 wins single/multi‑hop). So "graph is uniformly better" would overreach.

### Zep / Graphiti — temporal knowledge‑graph memory (verified 3‑0, vendor‑benchmarked ⚠️)
([arXiv 2501.13956](https://arxiv.org/abs/2501.13956) · [Neo4j blog](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/))
- **Graphiti** = a temporally‑aware KG engine; **bi‑temporal** model with validity intervals (`t_valid`/`t_invalid`) — strong for **conflict handling** and **cross‑session synthesis**.
- Reported: **94.8% vs 93.4%** (MemGPT) on Deep Memory Retrieval; **up to +18.5% accuracy / −90% latency** on LongMemEval. **Caveat:** vendor‑authored, self‑baselined — not independent SOTA; competitors (Mem0, EverMind) contest it.

### Storage / retrieval / write options (the menu)
- **Storage:** key‑value notes (simplest, human‑readable) · vector embeddings (semantic recall) · knowledge graph (relationships + temporal reasoning).
- **Retrieval:** semantic (embeddings) · lexical/BM25 · hybrid · graph traversal · the recency+importance+relevance score above.
- **Write/update:** dedup, **conflict resolution** (Mem0 two‑phase, or Zep's bi‑temporal invalidation), **decay/forgetting** (recency decay; importance thresholds).
- **Injection:** session‑start **preload** (cheap, for a profile) vs **on‑demand retrieval** (richer, query‑driven) vs **tool‑call** (the agent fetches memory itself, e.g. Anthropic's memory tool).

---

## 4. Privacy & safety — memory is an attack surface

- **Indirect prompt injection can poison persistent memory** so malicious instructions resurface in later sessions (Palo Alto **Unit 42**: [Indirect Prompt Injection Poisons AI Long‑Term Memory](https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/)).
- A real **ChatGPT macOS flaw** (Sep 2024) could turn long‑term memory into a **persistent data‑exfiltration** channel ([The Hacker News](https://thehackernews.com/2024/09/chatgpt-macos-flaw-couldve-enabled-long.html)).
- Frame it under **[OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)**.
- **Mitigations for a local memory layer:** keep it **user‑inspectable/editable** (plaintext markdown/JSONL), treat stored memory as **untrusted context — never auto‑execute it**, scope it (global vs project), and be deliberate about PII (local‑only is the safer posture). Because auto‑memory is **plaintext + machine‑local + auto‑injected every session**, anyone who can write to it can influence every future session.

---

## 5. Claude Code specifics (what's available to build on)

- **Transcripts** are stored on disk as **JSONL** under `~/.claude/projects/<encoded-project>/<sessionId>.jsonl` (see [session file format write‑up](https://databunny.medium.com/inside-claude-code-the-session-file-format-and-how-to-inspect-it-b9998e66d56b), [code.claude.com/docs/en/sessions](https://code.claude.com/docs/en/sessions)).
- **Resume / continue:** `claude --resume <sessionId>` / `claude --continue` re‑open a past session — the hook for "pick up that exact chat and go deeper."
- **Hooks** ([code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)): `SessionStart` (inject context), `PostToolUse` (observe actions), `Stop` / `SessionEnd` (end‑of‑turn / end‑of‑session) — the integration points for *inject at start* + *distill/index at end*. (Confirmed in practice while building forge: `SessionStart`/`Stop`/`PostToolUse`/`SessionEnd` receive JSON on stdin incl. `transcript_path`; `${CLAUDE_PLUGIN_ROOT}` resolves a plugin's own dir.)
- **Auto memory** (`MEMORY.md`, §2) is the native per‑project layer; the gaps vs ChatGPT‑style memory are: (a) no semantic recall over *all* chats, (b) no easy "resume that specific chat," (c) no *global* personalization profile.
- **Prior art:** [`claude-mem`](https://github.com/thedotmack/claude-mem) already does transcript‑based memory for Claude Code — worth studying.

---

## 6. Recommended architecture → what `forge memory` implements

`ingest JSONL transcripts → extract facts/preferences/topics (with source‑chat refs) → store as KV + an embeddings index → retrieve at SessionStart + on demand → link back to source chats so the user can resume deeper → grow over time → with conflict‑resolution, decay, global‑vs‑project scoping, and user‑inspectable storage` — **extending** (not replacing) the existing hook‑based instinct/learning loop.

How `forge memory` maps to the research:
| Research finding | forge implementation |
|---|---|
| Two‑mechanism memory (saved + dynamic) | always‑on **`profile.md`** (saved/stable) + **memories.jsonl** (dynamic, distilled) |
| Preload‑profile vs on‑demand retrieval | `profile.md` injected at **SessionStart**; **`forge:recall`** does on‑demand embedding search |
| Generative Agents scoring | `score = relevance + recency·0.5 + importance·0.5`, recency = daily decay |
| Mem0 extract/consolidate | Sonnet extraction at index time; dedup/append; (conflict‑resolution = future) |
| Source‑chat references | every memory/chat stores `sourceSessionId` → `claude --resume <id>` |
| Local embeddings | `@huggingface/transformers` `all-MiniLM-L6-v2` (384‑dim), on‑device |
| Privacy | local plaintext JSONL/markdown, user‑inspectable, never transmitted |
| Memory tool / note‑taking / compaction | complemented by forge's `learn` (instincts) + native `MEMORY.md` |

---

## Caveats (time‑sensitive)
This area moves fast. Claude Code auto‑memory needs **v2.1.59+**; the **memory tool** (`memory_20250818`) and **compaction** (`compact-2026-01-12`) are recent betas; the 200‑line/25KB preload limit may change. Anthropic doc URLs are migrating `docs.anthropic.com → code.claude.com / platform.claude.com`. ChatGPT memory naming has drifted ("chat history" → "Reference Chat History"); a mid‑2026 "Dreaming V3" memory rework was reported but did not deprecate saved memories. ChatGPT internal sub‑components come from **reverse‑engineering**, not official docs. Zep's benchmark numbers are **vendor self‑baselined**. The ChatGPT control‑granularity claim was **refuted** and remains uncertain.

## Open questions the research flagged (now mostly answered while building forge)
1. Exact `SessionStart`/`Stop`/`SessionEnd` hook contracts & payloads → **confirmed in practice** (stdin JSON incl. `transcript_path`, `stop_hook_active`; `${CLAUDE_PLUGIN_ROOT}`).
2. Exact JSONL transcript schema + how `--resume` maps a sessionId → transcript → **sessionId == filename stem**; transcripts under `~/.claude/projects/<enc>/<sessionId>.jsonl`.
3. Which conflict‑resolution algorithm wins locally (Mem0 two‑phase vs Zep bi‑temporal vs Gen‑Agents decay) → forge v1 uses recency decay + dedup; bi‑temporal is a future upgrade.
4. Concrete privacy mitigations for a local plaintext auto‑injected store → inspectable files, treat as untrusted, local‑only.

---

## Full source list (23 fetched)

**Primary / vendor docs**
- OpenAI — Memory and new controls: https://openai.com/index/memory-and-new-controls-for-chatgpt/
- OpenAI Help — reference saved memories: https://help.openai.com/en/articles/11146739-how-does-reference-saved-memories-work
- Anthropic — Claude Code memory: https://docs.anthropic.com/en/docs/claude-code/memory · https://code.claude.com/docs/en/memory
- Anthropic — prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Anthropic — memory tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- Anthropic — effective context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic — compaction: https://platform.claude.com/docs/en/build-with-claude/compaction
- Claude Code — sessions: https://code.claude.com/docs/en/sessions
- Claude Code — hooks: https://code.claude.com/docs/en/hooks
- LangChain — Anthropic middleware (caching ≠ memory): https://docs.langchain.com/oss/python/integrations/middleware/anthropic

**Papers**
- Generative Agents (Park et al., UIST 2023): https://arxiv.org/pdf/2304.03442
- Mem0: https://arxiv.org/pdf/2504.19413
- Zep / Graphiti: https://arxiv.org/abs/2501.13956
- (A‑MEM / additional memory frameworks): https://arxiv.org/abs/2502.12110
- Memory‑safety / poisoning papers: https://arxiv.org/html/2503.03704v2 · https://arxiv.org/pdf/2410.14931 · https://arxiv.org/pdf/2508.07664

**Engineering / security write‑ups**
- claude-mem (prior art): https://github.com/thedotmack/claude-mem
- Graphiti (Neo4j): https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/
- Claude Code session file format: https://databunny.medium.com/inside-claude-code-the-session-file-format-and-how-to-inspect-it-b9998e66d56b
- ChatGPT memory internals (reverse‑engineering): https://manthanguptaa.in/posts/chatgpt_memory/
- Unit 42 — prompt injection poisons long‑term memory: https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/
- The Hacker News — ChatGPT macOS memory flaw: https://thehackernews.com/2024/09/chatgpt-macos-flaw-couldve-enabled-long.html
- OWASP LLM01 (Prompt Injection): https://genai.owasp.org/llmrisk/llm01-prompt-injection/
