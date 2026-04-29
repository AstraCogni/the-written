# SCORM Quiz Builder — Claude Code Project Brief

## Project Overview

A browser-based tool that generates SCORM-compliant quiz packages from a TSV question bank. No server required, no license required. The builder runs as a single HTML file; it outputs a ZIP containing a complete SCORM package ready to upload to any LMS.

Deployed as `dist/SCORM_Builder.html` — a self-contained single-file builder produced by `python3 build.py`. Source files live in `builder/`. Edit source files, then rebuild to dist.

---

## Current State

### What Works
- TSV question bank parsing (MC and T/F, header row skipped)
- Logo upload and embedding (base64 data URI)
- Color theme system with presets (IFD Gold, Dark Steel, Navy Command, Crimson, Forest)
- SCORM 2004 3rd Edition package generation (default) with SCORM 1.2 fallback
- Proper SCORM 2004 manifest with `imsss:sequencing` and `deliveryControls`
- Score reporting (`cmi.score.raw`, `cmi.success_status`, `cmi.completion_status`)
- Session suspend/resume via `cmi.suspend_data` — saves question draw + current index + score
- Resume dialog on relaunch ("Continue" / "Start Over") — Storyline-style
- Exit button with `LMSFinish`/`Terminate` on explicit exit only
- Question and answer shuffling per attempt
- Per-question feedback (correct/incorrect + correct answer reveal)
- Configurable pass threshold and question draw count
- Responsive quiz output (640px and 380px breakpoints, 44px touch targets)
- Builder app responsive (preview panel hides below 900px, columns collapse below 640px)
- file:// protocol warning banner

### Known Issues / Limitations
- TSV file upload blocked by Chrome when builder is opened from `file://` protocol
  — Workaround: paste TSV text directly into the textarea
  — Fix: serve via `python -m http.server 8000` or refactor to use inline JS file reading
- Question bank stored as base64-encoded JSON (basic obfuscation only, not encrypted)
- No per-question interaction tracking yet (see Next Feature below)

### Tested Against
- SCORM Cloud (Rustici) — passes
- NinthBrain LMS — passes (fire/EMS platform)
- `suspend_data` persists within session; cross-session resume depends on LMS attempt settings

---

## Project Structure

```
scorm-builder/
├── CLAUDE.md                    ← this file
├── SCORM_Builder_README.md      ← user-facing docs
├── index.html                   ← builder app entry point
├── builder/
│   ├── css/
│   │   └── builder.css          ← builder app styles (extracted from monolith)
│   └── js/
│       ├── parser.js            ← TSV parsing logic
│       ├── preview.js           ← live preview update logic
│       ├── generator.js         ← SCORM package generation (JSZip)
│       └── app.js               ← main app init, state, event wiring
├── build.py                     ← run `python3 build.py` to regenerate dist
├── dist/
│   └── SCORM_Builder.html       ← built single-file output (generated, not edited)
├── HOG_questions.tsv            ← IFD High-Rise Ops question bank (100 questions)
└── tsv_template.tsv             ← blank question bank template
```

**Build workflow:** Edit source files in `builder/`, then `python3 build.py` → `dist/SCORM_Builder.html`.
**Dev workflow:** `python3 -m http.server 8000` and open `http://localhost:8000/index.html` (avoids file:// restrictions).

### Module responsibility

| File | Purpose | Testable? |
|------|---------|-----------|
| `builder/js/parser.js` | `parseTSV(rawText)` — pure, no DOM | Yes — exports via `module.exports` |
| `builder/js/presets.js` | `PRESETS` color object | Yes |
| `builder/js/generator.js` | `buildManifest`, `buildSCORMAPI`, `buildQuizHTML` — pure | Yes |
| `builder/js/preview.js` | DOM: live preview, manifest preview, `showUploadStatus` | No (DOM-bound) |
| `builder/js/app.js` | DOM: state, event handlers, `generateSCORM` orchestration | No (DOM-bound) |

---

## SCORM Interaction Tracking — COMPLETE (April 2026)

### Why
SCORM 1.2 and 2004 both support per-question interaction data. When written correctly, this data appears in LMS reporting and enables item analysis — which questions have high failure rates, which distractors are popular, time per question.

### SCORM 2004 Interaction Fields (per question)

```javascript
// Called after each question is answered
function recordInteraction(idx, question, chosenIdx, isCorrect, timeMs) {
  var base = 'cmi.interactions.' + idx + '.';
  SCORM.set(base + 'id',                           question.id || 'q_' + idx);
  SCORM.set(base + 'type',                         question.type === 'TF' ? 'true-false' : 'choice');
  SCORM.set(base + 'timestamp',                    new Date().toISOString());
  SCORM.set(base + 'weighting',                    '1');
  SCORM.set(base + 'learner_response',             String(chosenIdx));
  SCORM.set(base + 'correct_responses.0.pattern',  String(question.correct));
  SCORM.set(base + 'result',                       isCorrect ? 'correct' : 'incorrect');
  SCORM.set(base + 'latency',                      formatDuration(timeMs)); // PT##.##S format
  SCORM.commit();
}

// SCORM 2004 duration format
function formatDuration(ms) {
  return 'PT' + (ms / 1000).toFixed(2) + 'S';
}
```

### SCORM 1.2 Interaction Fields (slightly different)

```javascript
var base = 'cmi.interactions.' + idx + '.';
SCORM.set(base + 'id',                          'q_' + idx);
SCORM.set(base + 'type',                        question.type === 'TF' ? 'true-false' : 'choice');
SCORM.set(base + 'student_response',            String(chosenIdx));
SCORM.set(base + 'correct_responses.0.pattern', String(question.correct));
SCORM.set(base + 'result',                      isCorrect ? 'correct' : 'incorrect');
SCORM.set(base + 'latency',                     formatDuration12(ms)); // HHHH:MM:SS.SS format
SCORM.set(base + 'time',                        new Date().toTimeString().slice(0,8));
```

### Implementation (in `builder/js/generator.js` quiz template)
- `questionStartTime = Date.now()` at top of `renderQuestion()`
- `recordInteraction(interactionIdx++, q, ci, ok, Date.now() - questionStartTime)` in `selectChoice()` after score update
- `interactionIdx` is session-level, does NOT reset on retake — accumulates across attempts
- `CONFIG.scormVersion` injected from `cfg.scorm` — `recordInteraction` branches on it for field name differences
- SCORM 1.2 latency format: `HHHH:MM:SS.SS` via `fmtDur12(ms)`
- SCORM 2004 latency format: `PT##.##S` inline

### Data This Enables in LMS Reporting
- Per-question correct/incorrect rates across all learners
- Which distractors are being selected (from `learner_response`)
- Time per question (from `latency`)
- Question difficulty ranking
- Identifies questions that need revision

---

## TSV Format Reference

```
QuestionType[TAB]QuestionText[TAB]Choice1[TAB]Choice2[TAB]...[TAB]CorrectIndex
```

- **Row 1**: Header — always skipped silently
- **QuestionType**: `MC` or `TF`
- **CorrectIndex**: Zero-based integer, always last column
- **Empty choice columns**: Filtered out — safe to have trailing empty cells before CorrectIndex
- **T/F**: Always `True` then `False`, CorrectIndex `0` or `1`

---

## SCORM API Reference

### SCORM 2004 Key Fields Used

| Field | Purpose |
|-------|---------|
| `cmi.score.raw` | 0–100 integer score |
| `cmi.score.min` | Always 0 |
| `cmi.score.max` | Always 100 |
| `cmi.score.scaled` | 0.0–1.0 decimal |
| `cmi.success_status` | `passed` or `failed` |
| `cmi.completion_status` | `completed` |
| `cmi.exit` | `normal` (pass/explicit exit) or `suspend` (fail) |
| `cmi.suspend_data` | JSON blob, max 4096 bytes — stores resume state |
| `cmi.entry` | `resume` or `ab-initio` — NOTE: do not rely on this, some LMS reset it on logout |
| `cmi.interactions.n.*` | Per-question interaction data |

### Resume State Object (stored in suspend_data)
```json
{
  "q": [3, 17, 42, 8, 91, ...],  // question bank indices for this draw
  "i": 12,                         // current question index (0-based)
  "s": 9                           // current score (correct count)
}
```

### Session Lifecycle
1. `Initialize("")` on page load
2. `loadSuspend()` — check for resume state (ignore `cmi.entry`, just check data)
3. Show resume dialog if state exists
4. `saveSuspend()` + `Commit()` on every question advance
5. On finish: set score/status, `Commit()` — do NOT call `Terminate()` here (keeps results screen visible)
6. Exit button only: `Terminate()`

---

## Color System

Six CSS variables baked into generated quiz:

| Variable | Purpose |
|----------|---------|
| `--bg` | Page background |
| `--surface` | Cards, header, choice buttons |
| `--border` | Borders, dividers |
| `--accent` | Primary color — buttons, highlights, correct answer key |
| `--text` | Primary text |
| `--muted` | Secondary text, labels |

Pass/fail colors are hardcoded (`#3fb950` green, `#ff7b72` red) — intentionally not themed.

### Presets
- **IFD Gold**: `#120e1e` / `#1c1630` / `#2e2650` / `#cab37e` / `#ede8d8` / `#7a7090`
- **Dark Steel**: `#0d1117` / `#161b22` / `#30363d` / `#58a6ff` / `#e6edf3` / `#7d8590`
- **Navy Command**: `#0a0f1a` / `#111827` / `#1f2d40` / `#38bdf8` / `#e2e8f0` / `#64748b`
- **Crimson**: `#120808` / `#1c1010` / `#3a1010` / `#e05c5c` / `#f0dede` / `#7a5050`
- **Forest**: `#080f0a` / `#0f1a10` / `#1a3020` / `#4ade80` / `#dcfce7` / `#4b7a5a`

---

## LMS Notes

### NinthBrain
- Opens SCORM content in new browser window
- `cmi.entry` is reset to `ab-initio` after logout/login even when `suspend_data` persists
- Fix: ignore `cmi.entry`, check `suspend_data` directly
- Score and pass/fail record correctly
- Window does not close on `Terminate()` — expected browser security behavior

### SCORM Cloud
- Use for testing before LMS deployment
- `finalScoCourseNotSatisfiedNormalExitAction` defaults to `exit` — change in Course Properties if needed
- Full interaction data visible in registration details

### Storyline Compatibility
- If content needs to run as a Storyline web object, use `window.parent.GetPlayer().SetVar()` instead of SCORM API
- Variables needed: `quiz_passed` (Boolean), `quiz_score` (Number)

---

## Dependencies

- **JSZip 3.10.1** — client-side ZIP generation — loaded from cdnjs
- **Google Fonts** — Barlow Condensed + Barlow — loaded from fonts.googleapis.com
- No other external dependencies
- No build tools currently — single file concatenation only

---

## Development Notes

- Source structure created April 2026 via refactor.py (one-time extraction from monolith).
- The quiz template HTML is embedded as a JS template literal inside `buildQuizHTML()` in `generator.js`. Backtick escaping is delicate — avoid editing the template literal directly if possible; work at the function-call level instead.
- `SCORM_Builder.html` (the original monolith) is kept as a reference. `dist/SCORM_Builder.html` is the active deployable.
- Builder was developed and tested on: Chrome (Windows), NinthBrain LMS, SCORM Cloud.

---

*Project originated: Indianapolis, April 2026*  
*Built with Claude (Anthropic) in collaboration with Shawn — IFD / NinthBrain context*
