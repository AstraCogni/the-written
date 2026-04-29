// ══════════════════════════════════════════════════════
//  LIVE PREVIEW UPDATE
// ══════════════════════════════════════════════════════
function updatePreview() {
  const c = state.colors;
  const title = document.getElementById('cfg-title').value || 'Knowledge Assessment';
  const dept  = document.getElementById('cfg-dept').value  || 'Fire Department';

  document.getElementById('mock-dept').textContent  = dept.toUpperCase();
  document.getElementById('mock-title').textContent = title;
  document.getElementById('mock-dept').style.color  = c.muted;
  document.getElementById('mock-title').style.color = c.text;
  document.getElementById('mock-header').style.background    = c.surface;
  document.getElementById('mock-header').style.borderBottomColor = c.border;
  document.getElementById('mock-body').style.background      = c.bg;

  // Update logo in preview
  const logoWrap = document.getElementById('mock-logo-wrap');
  if (state.logoB64) {
    logoWrap.outerHTML = `<img class="mock-logo" id="mock-logo-wrap"
      src="data:${state.logoMime};base64,${state.logoB64}"
      style="border-color:${c.border};">`;
  }

  // Update choices
  document.querySelectorAll('.mock-choice').forEach(el => {
    el.style.background  = el.classList.contains('selected') ? c.surface + 'dd' : c.surface;
    el.style.borderColor = el.classList.contains('selected') ? c.accent : c.border;
    el.style.color       = c.text;
  });
  document.querySelectorAll('.mock-choice-key').forEach(el => el.style.color = c.accent);

  // Button
  document.getElementById('mock-btn').style.background = c.accent;
  document.getElementById('mock-btn').style.color      = c.bg;

  // Question text
  document.querySelector('.mock-q').style.color = c.text;

  updateManifestPreview();
}

function updateQCount(val) {
  document.getElementById('cfg-qcount-val').textContent = val;
  updateManifestPreview();
}

function updateThreshold(val) {
  document.getElementById('cfg-threshold-val').textContent = val + '%';
}

function updateManifestPreview() {
  const id    = document.getElementById('cfg-id').value || 'quiz_001';
  const title = document.getElementById('cfg-title').value || 'Knowledge Assessment';
  const dept  = document.getElementById('cfg-dept').value || 'Fire Department';
  const scorm = document.getElementById('cfg-scorm').value;

  const schemaVer = scorm === '1.2'
    ? 'ADL SCORM 1.2'
    : 'ADL SCORM 2004 3rd Edition';

  document.getElementById('manifest-preview').innerHTML = `
<span class="xml-com">&lt;!-- Auto-generated imsmanifest.xml --&gt;</span>
<span class="xml-tag">&lt;manifest</span> <span class="xml-attr">identifier</span>=<span class="xml-val">"${id}"</span>
  <span class="xml-attr">version</span>=<span class="xml-val">"1.0"</span><span class="xml-tag">&gt;</span>
  <span class="xml-tag">&lt;metadata&gt;</span>
    <span class="xml-tag">&lt;schema&gt;</span>${schemaVer}<span class="xml-tag">&lt;/schema&gt;</span>
  <span class="xml-tag">&lt;/metadata&gt;</span>
  <span class="xml-tag">&lt;organizations</span> <span class="xml-attr">default</span>=<span class="xml-val">"org_${id}"</span><span class="xml-tag">&gt;</span>
    <span class="xml-tag">&lt;organization</span> <span class="xml-attr">identifier</span>=<span class="xml-val">"org_${id}"</span><span class="xml-tag">&gt;</span>
      <span class="xml-tag">&lt;title&gt;</span>${dept} — ${title}<span class="xml-tag">&lt;/title&gt;</span>
      <span class="xml-tag">&lt;item</span> <span class="xml-attr">identifier</span>=<span class="xml-val">"item_${id}"</span>
        <span class="xml-attr">identifierref</span>=<span class="xml-val">"res_${id}"</span>
        <span class="xml-attr">isvisible</span>=<span class="xml-val">"true"</span><span class="xml-tag">/&gt;</span>
    <span class="xml-tag">&lt;/organization&gt;</span>
  <span class="xml-tag">&lt;/organizations&gt;</span>
  <span class="xml-tag">&lt;resources&gt;</span>
    <span class="xml-tag">&lt;resource</span> <span class="xml-attr">identifier</span>=<span class="xml-val">"res_${id}"</span>
      <span class="xml-attr">type</span>=<span class="xml-val">"webcontent"</span>
      <span class="xml-attr">adlcp:scormtype</span>=<span class="xml-val">"sco"</span>
      <span class="xml-attr">href</span>=<span class="xml-val">"index.html"</span><span class="xml-tag">/&gt;</span>
  <span class="xml-tag">&lt;/resources&gt;</span>
<span class="xml-tag">&lt;/manifest&gt;</span>`;
}

// ══════════════════════════════════════════════════════
//  UPLOAD STATUS HELPER
// ══════════════════════════════════════════════════════
function showUploadStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = `upload-status ${type}`;
  el.textContent = msg;
}
