function buildManifest(cfg) {
  const is12 = cfg.scorm === '1.2';
  if (is12) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${cfg.id}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_${cfg.id}">
    <organization identifier="org_${cfg.id}">
      <title>${escapeXML(cfg.dept)} — ${escapeXML(cfg.title)}</title>
      <item identifier="item_${cfg.id}" identifierref="res_${cfg.id}" isvisible="true">
        <title>${escapeXML(cfg.title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_${cfg.id}"
      type="webcontent"
      adlcp:scormtype="sco"
      href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
  } else {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${cfg.id}"
  version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
    http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
    http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
    http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
    http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
  </metadata>
  <organizations default="org_${cfg.id}">
    <organization identifier="org_${cfg.id}" adlseq:objectivesGlobalToSystem="false">
      <title>${escapeXML(cfg.dept)} — ${escapeXML(cfg.title)}</title>
      <item identifier="item_${cfg.id}" identifierref="res_${cfg.id}" isvisible="true">
        <title>${escapeXML(cfg.title)}</title>
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
      <imsss:sequencing>
        <imsss:controlMode choice="true" flow="true"/>
      </imsss:sequencing>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_${cfg.id}"
      type="webcontent"
      adlcp:scormType="sco"
      href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
  }
}

function escapeXML(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════
//  SCORM API WRAPPER
// ══════════════════════════════════════════════════════
function buildSCORMAPI(version) {
  if (version === '1.2') {
    return `// SCORM 1.2 API Wrapper
var SCORM = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var tries = 0;
    while (!win.API && win.parent && win.parent !== win && tries < 10) {
      win = win.parent; tries++;
    }
    return win.API || null;
  }

  function init() {
    api = findAPI(window);
    if (!api) { console.log('SCORM: No API found — standalone mode'); return false; }
    var r = api.LMSInitialize('');
    initialized = (r === 'true' || r === true);
    if (initialized) console.log('SCORM 1.2: Initialized');
    else console.warn('SCORM 1.2: LMSInitialize failed');
    return initialized;
  }

  function set(key, val) {
    if (!api || !initialized) return false;
    return api.LMSSetValue(key, String(val)) === 'true';
  }

  function commit() {
    if (!api || !initialized) return;
    api.LMSCommit('');
  }

  function finish(passed, score) {
    if (!api || !initialized) return;
    set('cmi.core.score.raw', Math.round(score));
    set('cmi.core.score.min', '0');
    set('cmi.core.score.max', '100');
    set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
    set('cmi.core.exit', passed ? 'normal' : 'suspend');
    commit();
    // Never call LMSFinish here — results screen must stay visible
    // Exit button is the only thing that terminates the session
  }

  function exit() {
    if (!api || !initialized) return;
    set('cmi.core.exit', 'suspend');
    commit();
    api.LMSFinish('');
    initialized = false;
  }

  function get(key) {
    if (!api || !initialized) return '';
    return api.LMSGetValue(key) || '';
  }

  function saveSuspend(data) {
    if (!api || !initialized) return;
    set('cmi.suspend_data', JSON.stringify(data));
    commit();
  }

  function loadSuspend() {
    if (!api || !initialized) return null;
    // Don't check cmi.core.entry — some LMS platforms reset it to ab-initio
    // on logout/login even when suspend_data persists. Just check the data.
    var raw = get('cmi.suspend_data');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  function clearSuspend() {
    if (!api || !initialized) return;
    set('cmi.suspend_data', '');
    commit();
  }

  return { init: init, finish: finish, exit: exit, set: set, get: get, commit: commit, saveSuspend: saveSuspend, loadSuspend: loadSuspend, clearSuspend: clearSuspend };
})();`;
  } else {
    // SCORM 2004
    return `// SCORM 2004 API Wrapper
var SCORM = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var tries = 0;
    while (!win.API_1484_11 && win.parent && win.parent !== win && tries < 10) {
      win = win.parent; tries++;
    }
    return win.API_1484_11 || null;
  }

  function init() {
    api = findAPI(window);
    if (!api) { console.log('SCORM 2004: No API found'); return false; }
    var r = api.Initialize('');
    initialized = (r === 'true' || r === true);
    return initialized;
  }

  function set(key, val) {
    if (!api || !initialized) return false;
    return api.SetValue(key, String(val)) === 'true';
  }

  function commit() {
    if (!api || !initialized) return;
    api.Commit('');
  }

  function finish(passed, score) {
    if (!api || !initialized) return;
    set('cmi.score.raw', Math.round(score));
    set('cmi.score.min', '0');
    set('cmi.score.max', '100');
    set('cmi.score.scaled', (score/100).toFixed(4));
    set('cmi.success_status', passed ? 'passed' : 'failed');
    set('cmi.completion_status', 'completed');
    set('cmi.exit', passed ? 'normal' : 'suspend');
    commit();
    // Never Terminate here — let results screen stay visible
  }

  function exit() {
    if (!api || !initialized) return;
    set('cmi.exit', 'suspend');
    commit();
    api.Terminate('');
    initialized = false;
  }

  function get(key) {
    if (!api || !initialized) return '';
    return api.GetValue(key) || '';
  }

  function saveSuspend(data) {
    if (!api || !initialized) return;
    set('cmi.suspend_data', JSON.stringify(data));
    commit();
  }

  function loadSuspend() {
    if (!api || !initialized) return null;
    // Don't check cmi.entry — NinthBrain resets it on logout/login.
    // Storyline pattern: just check if suspend_data has content.
    var raw = get('cmi.suspend_data');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  function clearSuspend() {
    if (!api || !initialized) return;
    set('cmi.suspend_data', '');
    commit();
  }

  return { init: init, finish: finish, exit: exit, set: set, get: get, commit: commit, saveSuspend: saveSuspend, loadSuspend: loadSuspend, clearSuspend: clearSuspend };
})();`;
  }
}

// ══════════════════════════════════════════════════════
//  QUIZ HTML BUILDER
// ══════════════════════════════════════════════════════
function buildQuizHTML(cfg, questions) {
  const c = cfg.colors;
  const logoTag = cfg.logoB64
    ? `<img class="header-logo" src="data:${cfg.logoMime};base64,${cfg.logoB64}" alt="${escapeXML(cfg.dept)}">`
    : `<div class="header-logo-placeholder">${cfg.dept.slice(0,3).toUpperCase()}</div>`;

  const questionsJSON = JSON.stringify(questions, null, 0);

  // Obfuscate question bank — simple btoa encoding to deter casual snooping
  const obfuscated = btoa(unescape(encodeURIComponent(questionsJSON)));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeXML(cfg.title)}</title>
<script>${buildSCORMAPI(cfg.scorm)}<\/script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg:      ${c.bg};
  --surface: ${c.surface};
  --border:  ${c.border};
  --accent:  ${c.accent};
  --text:    ${c.text};
  --muted:   ${c.muted};
  --pass:    #238636;
  --pass-lit:#3fb950;
  --fail:    #da3633;
  --fail-lit:#ff7b72;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Barlow',sans-serif;font-size:15px;line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
header{background:var(--surface);border-bottom:2px solid var(--accent);padding:10px 20px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:10;box-shadow:0 2px 12px rgba(0,0,0,0.4)}
.header-logo{width:44px;height:44px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex-shrink:0}
.header-logo-placeholder{width:44px;height:44px;border-radius:50%;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:13px;color:var(--accent);flex-shrink:0}
.header-titles{flex:1;line-height:1.2}
.header-dept{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--muted)}
.header-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;letter-spacing:1px;color:var(--text);text-transform:uppercase}
#progress-wrap{display:none;align-items:center;gap:10px;font-size:12px;color:var(--muted);font-family:'Barlow Condensed',sans-serif;letter-spacing:1px}
#progress-bar-outer{width:100px;height:3px;background:var(--border);border-radius:2px;overflow:hidden}
#progress-bar{height:100%;background:var(--accent);width:0%;transition:width 0.4s ease}
main{flex:1;padding:28px 20px 40px;max-width:720px;width:100%;margin:0 auto}
.screen{display:none}
.screen.active{display:block;animation:fadeUp 0.3s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
/* START */
#start-screen{text-align:center;padding-top:20px}
.coin-wrap{position:relative;width:100px;height:100px;margin:0 auto 20px}
.coin-wrap img,.coin-wrap .coin-ph{width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);box-shadow:0 0 20px rgba(0,0,0,0.5)}
.coin-wrap .coin-ph{display:flex;align-items:center;justify-content:center;background:var(--surface);font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:20px;color:var(--accent)}
#start-screen h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:30px;letter-spacing:2px;text-transform:uppercase;color:var(--text);line-height:1.1;margin-bottom:4px}
.subtitle{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:24px}
.divider{width:50px;height:1px;background:var(--accent);margin:0 auto 24px;opacity:0.4}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;text-align:left}
.info-card{background:var(--surface);border:1px solid var(--border);border-top:2px solid var(--accent);padding:12px 14px}
.info-card .lbl{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:3px}
.info-card .val{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;color:var(--text)}
/* QUESTION */
.q-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.q-num-badge{background:var(--surface);border:1px solid var(--border);font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;padding:3px 10px}
.q-type-badge{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:2px;color:var(--muted);text-transform:uppercase}
.q-text{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:20px;line-height:1.35;color:var(--text);margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)}
.choices{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.choice-btn{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:12px 16px;text-align:left;cursor:pointer;font-family:'Barlow',sans-serif;font-size:14px;line-height:1.4;display:flex;align-items:flex-start;gap:12px;transition:border-color 0.15s,background 0.15s,box-shadow 0.15s;position:relative;width:100%}
.choice-btn:hover:not(:disabled){border-color:var(--accent);background:var(--surface);box-shadow:inset 2px 0 0 var(--accent)}
.choice-btn.correct{border-color:var(--pass-lit);background:rgba(35,134,54,0.08);box-shadow:inset 2px 0 0 var(--pass-lit)}
.choice-btn.wrong{border-color:var(--fail-lit);background:rgba(218,54,51,0.08);box-shadow:inset 2px 0 0 var(--fail-lit)}
.choice-btn:disabled{cursor:default}
.choice-key{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12px;color:var(--accent);min-width:16px;padding-top:1px;flex-shrink:0}
.choice-btn.correct .choice-key{color:var(--pass-lit)}
.choice-btn.wrong .choice-key{color:var(--fail-lit)}
.result-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:14px}
#feedback-bar{padding:10px 14px;margin-bottom:18px;font-size:13px;font-weight:500;display:none;border-left:2px solid}
#feedback-bar.correct{background:rgba(35,134,54,0.1);border-color:var(--pass-lit);color:var(--pass-lit);display:block}
#feedback-bar.incorrect{background:rgba(218,54,51,0.1);border-color:var(--fail-lit);color:var(--fail-lit);display:block}
/* Responsive */
@media(max-width:640px){
  header{padding:8px 12px;gap:8px}
  .header-logo{width:36px;height:36px}
  .header-dept{font-size:9px;letter-spacing:2px}
  .header-title{font-size:14px;letter-spacing:0.5px}
  #progress-wrap{gap:6px}
  #progress-bar-outer{width:70px}
  #progress-wrap span{font-size:10px}
  main{padding:14px 12px 28px}
  #start-screen{padding-top:16px}
  .coin-wrap{width:80px;height:80px}
  .coin-wrap img{width:80px;height:80px}
  #start-screen h2{font-size:24px}
  .info-grid{grid-template-columns:1fr 1fr;gap:8px}
  .info-card{padding:10px 12px}
  .info-card .val{font-size:20px}
  .q-meta{margin-bottom:10px}
  .q-text{font-size:17px;margin-bottom:16px;padding-bottom:14px}
  .choices{gap:7px;margin-bottom:18px}
  .choice-btn{padding:12px 12px;font-size:13px;min-height:44px}
  .btn{padding:12px 20px;font-size:13px}
  .btn-row{justify-content:stretch}
  .btn-row .btn{flex:1;text-align:center}
  #results-screen{padding-top:12px}
  .score-ring-wrap{width:120px;height:120px;margin-bottom:16px}
  .score-ring-wrap svg{width:120px;height:120px}
  .score-pct{font-size:32px}
  .verdict{font-size:36px;letter-spacing:3px}
  .verdict-sub{font-size:12px;margin-bottom:16px}
  .score-breakdown{display:grid;grid-template-columns:1fr 1fr 1fr;width:100%}
  .bd-cell{padding:10px 8px}
  .bd-cell .num{font-size:22px}
  .btn-row[style*="justify-content:center"]{flex-wrap:wrap}
  .scorm-note{font-size:10px}
}
@media(max-width:380px){
  .info-grid{grid-template-columns:1fr 1fr}
  .info-card .val{font-size:18px}
  .q-text{font-size:15px}
  .choice-btn{font-size:12px}
  .score-breakdown{grid-template-columns:1fr 1fr 1fr}
  .bd-cell .num{font-size:18px}
}
/* BUTTONS */
.btn{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:11px 26px;border:none;cursor:pointer;transition:all 0.15s}
.btn:active{transform:scale(0.97)}
.btn-primary{background:var(--accent);color:var(--bg);font-weight:900}
.btn-primary:hover{filter:brightness(1.1)}
.btn-primary:disabled{background:var(--border);color:var(--muted);cursor:not-allowed}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-row{display:flex;gap:12px;justify-content:flex-end;align-items:center}
/* RESULTS */
#results-screen{text-align:center;padding-top:16px}
.score-ring-wrap{margin:0 auto 20px;width:140px;height:140px;position:relative}
.score-ring-wrap svg{transform:rotate(-90deg);width:140px;height:140px}
.score-ring-bg{fill:none;stroke:var(--border);stroke-width:7}
.score-ring-fg{fill:none;stroke-width:7;stroke-linecap:round;stroke-dasharray:339.29;stroke-dashoffset:339.29;transition:stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1),stroke 0.3s}
.score-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.score-pct{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:38px;line-height:1}
.score-sublabel{font-size:10px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-top:2px}
.verdict{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:44px;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px}
.verdict.pass{color:var(--pass-lit)}
.verdict.fail{color:var(--fail-lit)}
.verdict-sub{color:var(--muted);font-size:13px;margin-bottom:22px;font-family:'Barlow Condensed',sans-serif;letter-spacing:1px}
.score-breakdown{display:inline-grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:24px}
.bd-cell{background:var(--surface);padding:12px 20px;text-align:center}
.bd-cell .num{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;color:var(--text)}
.bd-cell .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted)}
.scorm-note{font-size:11px;color:var(--muted);margin-top:16px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.5px}
</style>
</head>
<body>
<header>
  ${logoTag}
  <div class="header-titles">
    <div class="header-dept">${escapeXML(cfg.dept)}</div>
    <div class="header-title">${escapeXML(cfg.title)}</div>
  </div>
  <div id="progress-wrap">
    <span id="progress-text">0 / ${cfg.qcount}</span>
    <div id="progress-bar-outer"><div id="progress-bar"></div></div>
  </div>
</header>
<main>
  <div id="start-screen" class="screen active">
    <div class="coin-wrap">
      ${cfg.logoB64
        ? `<img src="data:${cfg.logoMime};base64,${cfg.logoB64}" alt="${escapeXML(cfg.dept)}">`
        : `<div class="coin-ph">${cfg.dept.slice(0,3).toUpperCase()}</div>`}
    </div>
    <h2>${escapeXML(cfg.title)}</h2>
    <p class="subtitle">${escapeXML(cfg.dept)}</p>
    <div class="divider"></div>
    <div class="info-grid">
      <div class="info-card"><div class="lbl">Questions</div><div class="val">${cfg.qcount}</div></div>
      <div class="info-card"><div class="lbl">To Pass</div><div class="val">${Math.round(cfg.threshold*100)}%</div></div>
      <div class="info-card"><div class="lbl">Format</div><div class="val">MC + T/F</div></div>
      <div class="info-card"><div class="lbl">Attempts</div><div class="val">${cfg.retakes ? '∞' : '1'}</div></div>
    </div>
    <button class="btn btn-primary" onclick="startQuiz()">Begin Assessment</button>
  </div>

  <div id="question-screen" class="screen">
    <div class="q-meta">
      <span class="q-num-badge" id="q-number">Q 1 of ${cfg.qcount}</span>
      <span class="q-type-badge" id="q-type-badge">Multiple Choice</span>
    </div>
    <div class="q-text" id="q-text"></div>
    <div class="choices" id="choices"></div>
    <div id="feedback-bar"></div>
    <div class="btn-row">
      <button class="btn btn-primary" id="next-btn" onclick="nextQuestion()" disabled>Next</button>
    </div>
  </div>

  <div id="results-screen" class="screen">
    <div class="score-ring-wrap">
      <svg viewBox="0 0 120 120">
        <circle class="score-ring-bg" cx="60" cy="60" r="54"/>
        <circle class="score-ring-fg" id="score-ring" cx="60" cy="60" r="54"/>
      </svg>
      <div class="score-center">
        <div class="score-pct" id="score-pct">--%</div>
        <div class="score-sublabel">Score</div>
      </div>
    </div>
    <div class="verdict" id="verdict"></div>
    <div class="verdict-sub" id="verdict-sub"></div>
    <div class="score-breakdown">
      <div class="bd-cell"><div class="num" id="res-correct">0</div><div class="lbl">Correct</div></div>
      <div class="bd-cell"><div class="num" id="res-wrong">0</div><div class="lbl">Incorrect</div></div>
      <div class="bd-cell"><div class="num" id="res-total">0</div><div class="lbl">Total</div></div>
    </div>
    <div class="btn-row" style="justify-content:center;gap:14px;">
      ${cfg.retakes ? '<button class="btn btn-ghost" onclick="retakeQuiz()">Retake</button>' : ''}
      <button class="btn btn-ghost" onclick="exitCourse()" style="border-color:var(--fail-lit);color:var(--fail-lit);">Exit</button>
    </div>
    <div class="scorm-note" id="scorm-note">Reporting score to LMS...</div>
  </div>
</main>

<script>
// CONFIG
var CONFIG={passThreshold:${cfg.threshold},questionsPerDraw:${cfg.qcount},shuffleQ:${cfg.shuffleQ},shuffleA:${cfg.shuffleA},showCorrect:${cfg.showCorrect},showAnswer:${cfg.showAnswer},retakes:${cfg.retakes},scormVersion:'${cfg.scorm}'};
// QUESTION BANK (obfuscated)
var _qb='${obfuscated}';
var QUESTION_BANK=JSON.parse(decodeURIComponent(escape(atob(_qb))));
// STATE
var currentQuestions=[],currentIndex=0,score=0,answered=false,questionStartTime=0,interactionIdx=0;
// INIT SCORM
SCORM.init();
var _resumed=false;var _savedState=null;(function(){_savedState=SCORM.loadSuspend();if(_savedState&&_savedState.q&&_savedState.q.length){var overlay=document.createElement('div');overlay.id='resume-overlay';overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;animation:fadeUp 0.2s ease';var qnum=(_savedState.i||0)+1,qtotal=_savedState.q.length,sc=_savedState.s||0;overlay.innerHTML='<div style="background:var(--surface);border:1px solid var(--accent);padding:32px 28px;max-width:380px;width:90%;text-align:center;">'+'<div style="font-family:Barlow Condensed,sans-serif;font-size:11px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:12px;">Previous Attempt Found</div>'+'<div style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;">Resume Assessment?</div>'+'<div style="font-size:13px;color:var(--muted);margin-bottom:24px;">You were on question '+qnum+' of '+qtotal+'<br>Score so far: '+sc+' correct</div>'+'<div style="display:flex;gap:12px;justify-content:center;">'+'<button onclick="doResume()" style="font-family:Barlow Condensed,sans-serif;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:10px 22px;border:none;cursor:pointer;background:var(--accent);color:var(--bg);">Continue</button>'+'<button onclick="doFresh()" style="font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:10px 22px;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--muted);">Start Over</button>'+'</div></div>';document.body.appendChild(overlay);}})();function doResume(){var overlay=document.getElementById('resume-overlay');if(overlay)overlay.remove();if(!_savedState||!_savedState.q)return;currentQuestions=_savedState.q.map(function(i){return QUESTION_BANK[i];});currentIndex=_savedState.i||0;score=_savedState.s||0;interactionIdx=_savedState.xi||0;document.getElementById('progress-wrap').style.display='flex';showScreen('question-screen');renderQuestion();}function doFresh(){var overlay=document.getElementById('resume-overlay');if(overlay)overlay.remove();SCORM.clearSuspend();_savedState=null;}
function shuffle(a){var b=[...a];for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function startQuiz(){currentQuestions=(CONFIG.shuffleQ?shuffle(QUESTION_BANK):QUESTION_BANK).slice(0,CONFIG.questionsPerDraw);currentIndex=0;score=0;SCORM.saveSuspend({q:currentQuestions.map(function(q){return QUESTION_BANK.indexOf(q);}),i:0,s:0,xi:interactionIdx});showScreen('question-screen');document.getElementById('progress-wrap').style.display='flex';renderQuestion()}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active')}
function renderQuestion(){answered=false;questionStartTime=Date.now();var q=currentQuestions[currentIndex],total=currentQuestions.length;document.getElementById('q-number').textContent='Q '+(currentIndex+1)+' of '+total;document.getElementById('q-type-badge').textContent=q.type==='TF'?'True / False':'Multiple Choice';document.getElementById('q-text').textContent=q.text;document.getElementById('progress-bar').style.width=(currentIndex/total*100)+'%';document.getElementById('progress-text').textContent=currentIndex+' / '+total;var fb=document.getElementById('feedback-bar');fb.className='';fb.style.display='none';var nb=document.getElementById('next-btn');nb.disabled=true;nb.textContent=currentIndex===total-1?'See Results':'Next';var el=document.getElementById('choices');el.innerHTML='';var letters=['A','B','C','D','E'],idxs=q.choices.map((_,i)=>i),order=CONFIG.shuffleA&&q.type!=='TF'?shuffle(idxs):idxs;order.forEach((oi,pos)=>{var btn=document.createElement('button');btn.className='choice-btn';btn.dataset.origIdx=oi;var key=document.createElement('span');key.className='choice-key';key.textContent=q.type==='TF'?(oi===0?'T':'F'):letters[pos];var txt=document.createElement('span');txt.textContent=q.choices[oi];btn.appendChild(key);btn.appendChild(txt);btn.addEventListener('click',()=>selectChoice(btn,oi,q));el.appendChild(btn)})}
function selectChoice(btn,ci,q){if(answered)return;answered=true;var ok=(ci===q.correct);if(ok)score++;recordInteraction(interactionIdx++,q,ci,ok,Date.now()-questionStartTime);document.querySelectorAll('.choice-btn').forEach(b=>{b.disabled=true;var oi=parseInt(b.dataset.origIdx);if(CONFIG.showCorrect){if(oi===q.correct){b.classList.add('correct');var ic=document.createElement('span');ic.className='result-icon';ic.textContent='✓';b.appendChild(ic)}else if(b===btn&&!ok){b.classList.add('wrong');var ic=document.createElement('span');ic.className='result-icon';ic.textContent='✗';b.appendChild(ic)}}});var fb=document.getElementById('feedback-bar');if(CONFIG.showAnswer){fb.style.display='';fb.className=ok?'correct':'incorrect';fb.textContent=q.feedback?(ok?'✓ Correct. ':'✗ Incorrect. ')+q.feedback:(ok?'✓ Correct.':'✗ Incorrect. Correct answer: '+q.choices[q.correct]);}document.getElementById('next-btn').disabled=false}
function nextQuestion(){currentIndex++;SCORM.saveSuspend({q:currentQuestions.map(function(q){return QUESTION_BANK.indexOf(q);}),i:currentIndex,s:score,xi:interactionIdx});if(currentIndex>=currentQuestions.length)showResults();else{var qs=document.getElementById('question-screen');qs.classList.remove('active');setTimeout(()=>{qs.classList.add('active');renderQuestion()},80)}}
function showResults(){var total=currentQuestions.length,pct=score/total,pi=Math.round(pct*100),passed=pct>=CONFIG.passThreshold;document.getElementById('progress-bar').style.width='100%';document.getElementById('progress-text').textContent=total+' / '+total;showScreen('results-screen');var circ=339.29,ring=document.getElementById('score-ring');ring.style.stroke=passed?'#3fb950':'#ff7b72';setTimeout(()=>{ring.style.strokeDashoffset=circ-(circ*pct)},120);var pe=document.getElementById('score-pct');pe.textContent=pi+'%';pe.style.color=passed?'#3fb950':'#ff7b72';var ve=document.getElementById('verdict');ve.textContent=passed?'PASS':'FAIL';ve.className='verdict '+(passed?'pass':'fail');document.getElementById('verdict-sub').textContent=passed?'You met the '+Math.round(CONFIG.passThreshold*100)+'% passing threshold.':Math.round(CONFIG.passThreshold*100)+'% required. Please review and retry.';document.getElementById('res-correct').textContent=score;document.getElementById('res-wrong').textContent=total-score;document.getElementById('res-total').textContent=total;if(passed){SCORM.clearSuspend();}SCORM.finish(passed,pi);document.getElementById('scorm-note').textContent=passed?'Score reported to LMS: '+pi+'% — PASS':'Score reported to LMS: '+pi+'% — FAIL'}
function retakeQuiz(){SCORM.clearSuspend();showScreen('start-screen');document.getElementById('progress-wrap').style.display='none';document.getElementById('progress-bar').style.width='0%'}
function exitCourse(){SCORM.exit();var bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),tx=getComputedStyle(document.documentElement).getPropertyValue('--text').trim(),ac=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();document.body.innerHTML='<div style="font-family:Barlow Condensed,sans-serif;padding:60px 20px;text-align:center;background:'+bg+';color:'+tx+';min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:40px;margin-bottom:16px;color:'+ac+'">&#10003;</div><h2 style="font-size:28px;letter-spacing:3px;text-transform:uppercase;color:'+ac+'">Session Saved</h2><p style="margin-top:12px;opacity:0.5;font-size:13px;letter-spacing:1px">Your score has been recorded.<br>You may close this window.</p></div>';try{window.close()}catch(e){}}
function recordInteraction(idx,q,ci,ok,ms){
  var b='cmi.interactions.'+idx+'.';
  SCORM.set(b+'id','q_'+idx);
  SCORM.set(b+'type',q.type==='TF'?'true-false':'choice');
  SCORM.set(b+'description',q.text.slice(0,250));
  SCORM.set(b+'result',ok?'correct':'incorrect');
  SCORM.set(b+'correct_responses.0.pattern',String(q.correct));
  if(CONFIG.scormVersion==='2004'){
    SCORM.set(b+'timestamp',new Date().toISOString());
    SCORM.set(b+'weighting','1');
    SCORM.set(b+'learner_response',String(ci));
    SCORM.set(b+'latency','PT'+(ms/1000).toFixed(2)+'S');
  }else{
    SCORM.set(b+'student_response',String(ci));
    SCORM.set(b+'latency',fmtDur12(ms));
    SCORM.set(b+'time',new Date().toTimeString().slice(0,8));
  }
  SCORM.commit();
}
function fmtDur12(ms){var h=Math.floor(ms/3600000),r=ms%3600000,m=Math.floor(r/60000),s=Math.floor((r%60000)/1000),cs=Math.floor((ms%1000)/10);return String(h).padStart(4,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0')}
<\/script>
</body>
</html>`;
}

if (typeof module !== 'undefined') module.exports = { buildManifest, buildSCORMAPI, buildQuizHTML, escapeXML };
