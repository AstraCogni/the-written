#!/usr/bin/env python3
"""
Refactor SCORM_Builder.html into project source structure.
Run once: python3 refactor.py
Produces: builder/css/, builder/js/, index.html
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(BASE, 'SCORM_Builder.html')

with open(SRC, 'r', encoding='utf-8') as f:
    raw = f.read()
lines = raw.splitlines(keepends=True)

def L(s, e):
    """Lines s..e (1-based, inclusive) joined as a string."""
    return ''.join(lines[s-1:e]).rstrip('\n')

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  {path}  ({len(content):,} chars)')

print('Extracting source files from SCORM_Builder.html...')

# ─────────────────────────────────────────────────────────────────────────────
# builder/css/builder.css
# Lines 10-771: main CSS (inside first <style> block)
# Lines 1099-1115: .preset-btn CSS (inside second <style> block)
# ─────────────────────────────────────────────────────────────────────────────
builder_css = L(10, 771) + '\n\n' + L(1099, 1115) + '\n'
write('builder/css/builder.css', builder_css)

# ─────────────────────────────────────────────────────────────────────────────
# builder/js/presets.js
# Lines 1136-1143: PRESETS object
# ─────────────────────────────────────────────────────────────────────────────
presets_js = L(1136, 1143) + "\n\nif (typeof module !== 'undefined') module.exports = { PRESETS };\n"
write('builder/js/presets.js', presets_js)

# ─────────────────────────────────────────────────────────────────────────────
# builder/js/parser.js
# Pure parseTSV() refactored from parseTSVText().
# Takes rawText, returns { questions, errors } — no DOM access.
# ─────────────────────────────────────────────────────────────────────────────
parser_js = """\
function parseTSV(rawText) {
  if (!rawText || !rawText.trim()) return { questions: [], errors: [] };

  const lines = rawText.trim().split('\\n').filter(l => l.trim());
  const questions = [];
  const errors = [];

  lines.forEach((line, i) => {
    const parts = line.split('\\t');
    const qtype = parts[0].trim().toUpperCase();

    if (!['MC', 'TF'].includes(qtype)) {
      if (i > 0) errors.push(`Row ${i + 1}: unknown type "${qtype}" — skipped`);
      return;
    }

    if (parts.length < 4) {
      errors.push(`Row ${i + 1}: too few columns (${parts.length})`);
      return;
    }

    const qtext      = parts[1].trim();
    const correctIdx = parseInt(parts[parts.length - 1].trim());
    const choices    = parts.slice(2, parts.length - 1).map(c => c.trim()).filter(Boolean);

    if (!qtext)            { errors.push(`Row ${i + 1}: empty question text`); return; }
    if (choices.length < 2){ errors.push(`Row ${i + 1}: need at least 2 choices`); return; }
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= choices.length) {
      errors.push(`Row ${i + 1}: invalid correct index ${correctIdx}`);
      return;
    }
    questions.push({ type: qtype, text: qtext, choices, correct: correctIdx });
  });

  return { questions, errors };
}

if (typeof module !== 'undefined') module.exports = { parseTSV };
"""
write('builder/js/parser.js', parser_js)

# ─────────────────────────────────────────────────────────────────────────────
# builder/js/generator.js
# Lines 1496-1577: buildManifest + escapeXML
# Lines 1582-1748: buildSCORMAPI
# Lines 1753-1996: buildQuizHTML
#
# Two targeted changes:
#   1. buildQuizHTML(cfg)  →  buildQuizHTML(cfg, questions)
#   2. JSON.stringify(state.questions, ...)  →  JSON.stringify(questions, ...)
# ─────────────────────────────────────────────────────────────────────────────
gen_raw = L(1496, 1996)
gen_raw = gen_raw.replace(
    'function buildQuizHTML(cfg) {',
    'function buildQuizHTML(cfg, questions) {'
)
gen_raw = gen_raw.replace(
    'const questionsJSON = JSON.stringify(state.questions, null, 0);',
    'const questionsJSON = JSON.stringify(questions, null, 0);'
)
generator_js = gen_raw + "\n\nif (typeof module !== 'undefined') module.exports = { buildManifest, buildSCORMAPI, buildQuizHTML, escapeXML };\n"
write('builder/js/generator.js', generator_js)

# ─────────────────────────────────────────────────────────────────────────────
# builder/js/preview.js
# Lines 1315-1407: updatePreview, updateQCount, updateThreshold,
#                  updateManifestPreview, showUploadStatus
# ─────────────────────────────────────────────────────────────────────────────
preview_js = L(1315, 1407) + '\n'
write('builder/js/preview.js', preview_js)

# ─────────────────────────────────────────────────────────────────────────────
# builder/js/app.js
# State, log, toggleStep, TSV handling (calls parseTSV → updates DOM),
# logo handling, color mgmt, generateSCORM (fixed), init.
# ─────────────────────────────────────────────────────────────────────────────

# Pieces extracted from monolith, in order:
state_block       = L(1119, 1143)   # STATE comment + state + PRESETS
log_block         = L(1144, 1164)   # LOGGING + STEP TOGGLE
logo_block        = L(1258, 1313)   # LOGO + COLOR MANAGEMENT
generate_block    = L(1409, 1491)   # SCORM PACKAGE GENERATION
init_block        = L(1998, 2010)   # INIT

# Fix generateSCORM to pass state.questions explicitly to buildQuizHTML
generate_block = generate_block.replace(
    "zip.file('index.html', buildQuizHTML(cfg));",
    "zip.file('index.html', buildQuizHTML(cfg, state.questions));"
)

# Manually written TSV section: calls pure parseTSV(), then updates DOM
tsv_block = """\
// ══════════════════════════════════════════════════════
//  TSV HANDLING
// ══════════════════════════════════════════════════════
function handleTSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const { questions, errors } = parseTSV(ev.target.result);
    applyQuestions(questions, errors, file.name);
  };
  reader.readAsText(file);
}

function parseTSVText(rawText, filename) {
  if (!rawText || !rawText.trim()) return;
  const { questions, errors } = parseTSV(rawText);
  applyQuestions(questions, errors, filename);
}

function applyQuestions(questions, errors, filename) {
  if (questions.length === 0) {
    showUploadStatus('tsv-status', 'err', `No valid questions found. ${errors[0] || ''}`);
    return;
  }

  state.questions = questions;
  const mc = questions.filter(q => q.type === 'MC').length;
  const tf = questions.filter(q => q.type === 'TF').length;

  showUploadStatus('tsv-status', 'ok',
    `✓ Loaded ${questions.length} questions (${mc} MC · ${tf} T/F)${errors.length ? ` · ${errors.length} rows skipped` : ''}`);

  document.getElementById('qbank-preview').style.display = 'block';
  document.getElementById('qbank-info').innerHTML = `
    <div class="qbank-cell"><div class="n">${questions.length}</div><div class="l">Total</div></div>
    <div class="qbank-cell"><div class="n">${mc}</div><div class="l">MC</div></div>
    <div class="qbank-cell"><div class="n">${tf}</div><div class="l">T/F</div></div>
  `;

  document.getElementById('stepnum-1').classList.add('done');
  document.getElementById('stepstate-1').textContent = `${questions.length} LOADED`;
  document.getElementById('stepstate-1').className   = 'step-state ok';
  document.getElementById('dot-questions').classList.add('active');
  document.getElementById('status-questions').textContent = `${questions.length} QUESTIONS`;

  const qRange = document.getElementById('cfg-qcount');
  qRange.max = questions.length;
  if (parseInt(qRange.value) > questions.length) qRange.value = questions.length;
  updateQCount(qRange.value);
  document.getElementById('q-draw-hint').textContent = `— drawing from ${questions.length} available`;

  document.getElementById('btn-generate').disabled    = false;
  document.getElementById('gen-note').textContent     = `Ready · ${questions.length} questions · SCORM 1.2`;

  updateManifestPreview();
  if (filename) log(`Parsed "${filename}" → ${questions.length} questions loaded`, 'ok');
  else          log(`Parsed pasted data → ${questions.length} questions loaded`, 'ok');

  if (errors.length) errors.forEach(e => log(e, 'warn'));
}"""

app_js = '\n\n'.join([
    state_block,
    log_block,
    tsv_block,
    logo_block,
    generate_block,
    init_block,
]) + '\n'

write('builder/js/app.js', app_js)

# ─────────────────────────────────────────────────────────────────────────────
# index.html
# HTML skeleton: original head/body structure but with external CSS/JS refs
# instead of inline <style> and <script> blocks.
# ─────────────────────────────────────────────────────────────────────────────
# Head: lines 1-8 (DOCTYPE through jszip script), swap inline style for <link>
# Body: lines 774-1096 (body open through /app-body)
# Footer: closing tags
head_top   = L(1, 8)    # DOCTYPE → jszip CDN script
body_html  = L(774, 1096)  # <body> through </div><!-- /app-body -->

index_html = f"""\
{head_top}
<link rel="stylesheet" href="builder/css/builder.css">
</head>
{body_html}

<script src="builder/js/presets.js"></script>
<script src="builder/js/parser.js"></script>
<script src="builder/js/generator.js"></script>
<script src="builder/js/preview.js"></script>
<script src="builder/js/app.js"></script>
</body>
</html>
"""
write('index.html', index_html)

print('\nDone. Run  python3 build.py  to produce dist/SCORM_Builder.html')
