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
  'QuestionType\tQuestionText\tChoice1\tChoice2\tChoice3\tChoice4\tCorrectIndex',
  'MC\tWhat is the first step in any patient assessment?\tBSI and scene safety\tCheck blood pressure so you look busy\tDetermine whether the patient has Wi-Fi\tAsk your partner what they want from the drive-through\t0',
  'TF\t"If it wasn\'t documented, it didn\'t happen" is a core EMS recordkeeping principle.\tTrue\tFalse\t\t\t0',
  'MC\tWhich finding is an early sign of hypovolemic shock?\tTachycardia with pale, cool, diaphoretic skin\tThe patient saying "I feel a little off"\tYour partner saying "yeah, that doesn\'t look right"\tAn unexplained urge to call for ALS backup\t0',
  'MC\tSAMPLE history stands for:\tSigns/Symptoms, Allergies, Medications, Pertinent history, Last oral intake, Events\tSomebody\'s Always Making Problems, Let\'s Eat\tSituation, Ambulance, More questions, Possibly serious, Later, Eventually\t\t0',
  'MC\tDispatched at 0300 for difficulty breathing. Patient is on the couch watching TV and eating chips. Your first action is:\tBSI, scene safety, begin patient assessment\tConfiscate the chips as a potential airway hazard\tAsk what they\'re watching — it better be good\tSilently reconsider your career choices\t0',
  'MC\tThe Glasgow Coma Scale evaluates:\tEye opening, verbal response, and motor response\tNumber of times this patient has called 911 this month\tWhether the patient can describe symptoms clearly to billing\tYour partner\'s alertness on hour 14 of a 24-hour shift\t0',
  'TF\t"Diesel therapy" — the observation that patients improve once loaded and moving — is a well-known EMS phenomenon.\tTrue\tFalse\t\t\t0',
  'MC\tA patient rates their pain as "11 out of 10." Your response:\tDocument the reported pain level and continue your assessment\tExplain patiently that 10 is the maximum on the standard scale\tOffer them a menu\tMention that you also have back pain after 14 hours on shift\t0',
  'MC\tWhich BEST describes a "frequent flyer" in EMS?\tA patient with complex medical or social needs who accesses EMS repeatedly\tSomeone earning airline miles by riding in the ambulance\tA migratory bird that nests on your station roof every spring\tYour ex, showing up at your worst calls\t0',
  'MC\tYour unit is dispatched to the same address for the fourth time this week. The MOST appropriate response is:\tRespond professionally and provide the same standard of care as any other call\tAsk dispatch to start a frequent flyer loyalty program\tRequest a reserved parking spot at their address\tConsider whether your career in EMS might be seasonal\t0',
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
