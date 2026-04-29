// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
const state = {
  questions: [],
  logoB64:   null,
  logoMime:  'image/png',
  colors: {
    bg:      '#120e1e',
    surface: '#1c1630',
    border:  '#2e2650',
    accent:  '#cab37e',
    text:    '#ede8d8',
    muted:   '#7a7090',
  }
};


// ══════════════════════════════════════════════════════
//  LOGGING
// ══════════════════════════════════════════════════════
function log(msg, type='info') {
  const el = document.getElementById('output-log');
  const now = new Date();
  const ts = now.toTimeString().slice(0,8);
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-time">${ts}</span><span class="log-msg">${msg}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ══════════════════════════════════════════════════════
//  HELP MODAL
// ══════════════════════════════════════════════════════
function toggleHelp() {
  const overlay = document.getElementById('help-overlay');
  const modal   = document.getElementById('help-modal');
  const visible = modal.style.display !== 'none';
  overlay.style.display = visible ? 'none' : 'block';
  modal.style.display   = visible ? 'none' : 'block';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') {
  document.getElementById('help-overlay').style.display = 'none';
  document.getElementById('help-modal').style.display   = 'none';
}});

// ══════════════════════════════════════════════════════
//  STEP TOGGLE
// ══════════════════════════════════════════════════════
function toggleStep(n) {
  const body = document.getElementById(`stepbody-${n}`);
  body.classList.toggle('open');
}

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
  document.getElementById('btn-preview').disabled     = false;
  document.getElementById('gen-note').textContent     = `Ready · ${questions.length} questions · SCORM 1.2`;

  updateManifestPreview();
  if (filename) log(`Parsed "${filename}" → ${questions.length} questions loaded`, 'ok');
  else          log(`Parsed pasted data → ${questions.length} questions loaded`, 'ok');

  if (errors.length) errors.forEach(e => log(e, 'warn'));
}

// ══════════════════════════════════════════════════════
//  LOGO HANDLING
// ══════════════════════════════════════════════════════
function handleLogo(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.logoB64 = ev.target.result.split(',')[1];
    state.logoMime = file.type || 'image/png';

    // Show preview in upload zone
    const icon = document.getElementById('logo-preview-icon');
    icon.innerHTML = `<img src="${ev.target.result}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`;

    showUploadStatus('logo-status', 'ok', `✓ Logo loaded: ${file.name}`);
    document.getElementById('stepnum-2').classList.add('done');
    document.getElementById('stepstate-2').textContent = 'LOADED';
    document.getElementById('stepstate-2').className = 'step-state ok';
    document.getElementById('dot-logo').classList.add('active');
    document.getElementById('status-logo').textContent = file.name.toUpperCase();

    updatePreview();
    log(`Logo loaded: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'ok');
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════════════
//  COLOR MANAGEMENT
// ══════════════════════════════════════════════════════
function syncColor(key, val) {
  state.colors[key] = val;
  document.getElementById(`hex-${key}`).value = val;
  updatePreview();
}

function syncColorHex(key, val) {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    state.colors[key] = val;
    document.getElementById(`clr-${key}`).value = val;
    updatePreview();
  }
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  Object.keys(p).forEach(k => {
    state.colors[k] = p[k];
    document.getElementById(`clr-${k}`).value = p[k];
    document.getElementById(`hex-${k}`).value = p[k];
  });
  updatePreview();
  log(`Applied preset: ${name}`, 'info');
}

// ══════════════════════════════════════════════════════
//  SAMPLE QUESTION BANK (Set 1 — in-app load)
// ══════════════════════════════════════════════════════
const SAMPLE_TSV = [
  'QuestionType\tQuestionText\tChoice1\tChoice2\tChoice3\tChoice4\tCorrectIndex\tFeedback',
  'MC\tThe "golden hour" in trauma refers to:\tThe time from injury to definitive surgical care\tThe first hour of your shift before the tones drop\tHow long it takes the ER to acknowledge you\'re standing there\tThe window between coffee and the first call\t0\tCowley\'s golden hour — injury to definitive surgical care within 60 minutes significantly improves survival. Your transport decisions should reflect it.',
  'TF\tScene safety should be continuously re-evaluated throughout the call, not just on arrival.\tTrue\tFalse\t\t\t0\t',
  'MC\tThe correct compression-to-ventilation ratio for single-rescuer adult CPR is:\t30 compressions to 2 ventilations\t15:2, because that\'s what you learned in 1987 and you\'re sticking with it\tAs many as possible before your back gives out\tWhatever the bystander was doing when you arrived\t0\t30:2 per AHA guidelines. Minimize interruptions — every pause costs perfusion pressure.',
  'MC\tA patient presents with JVD, tracheal deviation, absent breath sounds on one side, and hypotension. You suspect:\tTension pneumothorax\tReally bad posture\tSomething the ED will sort out\tA very dramatic presentation of anxiety\t0\tClassic tension pneumo. Needle decompression: 2nd ICS, midclavicular line. Treat the clinical picture — don\'t wait for confirmation.',
  'MC\tThe PRIMARY treatment for a patient in anaphylactic shock is:\tEpinephrine\tBenadryl and a prayer\tJust give them some air\tAsk what they ate — thoroughly and at length\t0\t',
  'TF\tA patient who says "I\'m fine" immediately after a high-speed MVC still requires a thorough assessment.\tTrue\tFalse\t\t\t0\tAdrenaline masks pain. Mechanism of injury drives your assessment — a 50mph delta-V doesn\'t care how the patient feels right now.',
  'MC\tThe MOST appropriate initial approach to a combative patient:\tEnsure scene safety, request law enforcement if needed, attempt verbal de-escalation\tChallenge accepted\tDocument "patient uncooperative," back slowly toward the exit\tOffer a snack — low blood sugar explains everything\t0\t',
  'MC\tA responsive adult patient may legally refuse treatment and transport if:\tThey are alert, oriented, understand the risks, and are not impaired\tThey look like they mean it\tThey pinky promise to see a doctor tomorrow\tThe receiving hospital is on divert anyway\t0\tInformed refusal requires decision-making capacity. Document thoroughly — refusal calls are high-liability events.',
  'MC\tThe PRIMARY reason EMS providers must not use personal cell phones while driving the apparatus:\tIt is illegal, dangerous, and a significant liability\tSignal is terrible in most response areas anyway\tYour thumbs need to be free for chest compressions\tSquad social media can wait until after patient contact\t0\t',
  'MC\tAfter a 24-hour shift, the MOST important post-shift activity is:\tRest, hydration, and self-care including a mental health check-in\tReplaying every call in detail instead of sleeping\tImmediately accepting overtime because the unit is short-staffed\tTelling your family all about it while they try to eat dinner\t0\tOperational readiness starts with recovery. Fatigue degrades clinical judgment and communication. Taking care of yourself is part of the job.',
].join('\n');

function loadSample() {
  const ta = document.getElementById('tsv-paste');
  ta.value = SAMPLE_TSV;
  parseTSVText(SAMPLE_TSV, 'sample_ems_questions');
}

// ══════════════════════════════════════════════════════
//  CONFIG BUILDER (shared by generate + preview)
// ══════════════════════════════════════════════════════
function buildCfg() {
  return {
    title:      document.getElementById('cfg-title').value || 'Knowledge Assessment',
    dept:       document.getElementById('cfg-dept').value  || 'Fire Department',
    id:         document.getElementById('cfg-id').value    || 'quiz_001',
    scorm:      document.getElementById('cfg-scorm').value,
    qcount:     parseInt(document.getElementById('cfg-qcount').value),
    threshold:  parseInt(document.getElementById('cfg-threshold').value) / 100,
    shuffleQ:   document.getElementById('cfg-shuffle-q').value === 'true',
    shuffleA:   document.getElementById('cfg-shuffle-a').value === 'true',
    showCorrect: document.getElementById('cfg-show-correct').value === 'true',
    showAnswer: document.getElementById('cfg-show-answer').value === 'true',
    retakes:    document.getElementById('cfg-retakes').value === 'true',
    colors:     {...state.colors},
    logoB64:    state.logoB64,
    logoMime:   state.logoMime,
  };
}

// ══════════════════════════════════════════════════════
//  SCORM PACKAGE GENERATION
// ══════════════════════════════════════════════════════
async function generateSCORM() {
  if (state.questions.length === 0) {
    log('ERROR: No questions loaded', 'err');
    return;
  }

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.textContent = '⟳ Building...';
  log('Starting SCORM package generation...', 'info');

  const cfg = buildCfg();

  try {
    log(`Building quiz: ${cfg.qcount} questions, ${Math.round(cfg.threshold*100)}% pass threshold`, 'info');

    const zip = new JSZip();

    // 1. imsmanifest.xml
    log('Generating imsmanifest.xml...', 'info');
    zip.file('imsmanifest.xml', buildManifest(cfg));

    // 2. index.html — quiz with SCORM API inlined (no separate scormAPI.js needed)
    log('Generating quiz HTML...', 'info');
    zip.file('index.html', buildQuizHTML(cfg, state.questions));

    // 4. adlcp namespace xsd (some LMS require this)
    zip.file('imsmd_rootv1p2p1.xsd', '');

    log('Compressing package...', 'info');
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, meta => {
      if (meta.percent % 25 < 1) {
        log(`Compression: ${Math.round(meta.percent)}%`, 'info');
      }
    });

    const sizeKB = (blob.size / 1024).toFixed(1);
    log(`Package ready: ${sizeKB} KB`, 'ok');
    log(`File: ${cfg.id}_scorm.zip`, 'ok');

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cfg.id}_scorm.zip`;
    a.click();
    URL.revokeObjectURL(url);

    log('✓ Download triggered. Upload ZIP to your LMS.', 'ok');

  } catch(err) {
    log(`ERROR: ${err.message}`, 'err');
    console.error(err);
  }

  btn.disabled = false;
  btn.innerHTML = '<span>⬡</span> Generate SCORM Package';
}

// ══════════════════════════════════════════════════════
//  QUIZ PREVIEW
// ══════════════════════════════════════════════════════
function previewSCORM() {
  if (state.questions.length === 0) {
    log('ERROR: No questions loaded', 'err');
    return;
  }

  const cfg = buildCfg();

  // Build a minimal in-memory mock SCORM API so scoring/resume work in preview
  const mockCode = cfg.scorm === '2004'
    ? 'window.API_1484_11=(function(){var d={};return{Initialize:function(){return"true"},SetValue:function(k,v){d[k]=v;return"true"},GetValue:function(k){return d[k]||""},Commit:function(){return"true"},Terminate:function(){return"true"},GetLastError:function(){return"0"},GetErrorString:function(){return""},GetDiagnostic:function(){return""}};})();'
    : 'window.API=(function(){var d={};return{LMSInitialize:function(){return"true"},LMSSetValue:function(k,v){d[k]=v;return"true"},LMSGetValue:function(k){return d[k]||""},LMSCommit:function(){return"true"},LMSFinish:function(){return"true"},LMSGetLastError:function(){return"0"},LMSGetErrorString:function(){return""},LMSGetDiagnostic:function(){return""}};})();';
  const mockScript = '<script>' + mockCode + '<\/script>';

  const banner = '<div style="background:#d97706;color:#fff;text-align:center;padding:7px 16px;font-family:Barlow Condensed,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;position:fixed;top:0;left:0;right:0;z-index:9999;">Preview Mode — Not connected to LMS</div>';

  let html = buildQuizHTML(cfg, state.questions);
  html = html.replace('</head>', mockScript + '</head>');
  html = html.replace('<body>', '<body>' + banner);

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  log('Preview opened in new tab (' + cfg.qcount + ' questions, SCORM ' + cfg.scorm + ')', 'ok');
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
updatePreview();
updateManifestPreview();
log('SCORM Builder initialized. SCORM 2004 3rd Ed. default.', 'info');
// Warn if running from file:// — FileReader may be blocked
if (window.location.protocol === 'file:') {
  document.getElementById('file-protocol-warning').style.display = 'block';
  log('WARNING: Running from file:// — use Paste TSV or run via local server', 'warn');
}
log('Step 1: Upload or paste a TSV question bank to begin.', 'info');
</script>
