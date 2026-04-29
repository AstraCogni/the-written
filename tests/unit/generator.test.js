const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { buildManifest, buildSCORMAPI, escapeXML } = require('../../builder/js/generator');

// ── escapeXML ────────────────────────────────────────────────────────────────

test('escapeXML: escapes &, <, >, "', () => {
  assert.equal(
    escapeXML('<div class="x">&amp;</div>'),
    '&lt;div class=&quot;x&quot;&gt;&amp;amp;&lt;/div&gt;'
  );
});

test('escapeXML: handles null/undefined gracefully', () => {
  assert.equal(escapeXML(null), '');
  assert.equal(escapeXML(undefined), '');
  assert.equal(escapeXML(''), '');
});

// ── buildManifest — SCORM 1.2 ────────────────────────────────────────────────

const CFG_12 = { id: 'test_quiz', title: 'Knowledge Check', dept: 'Test Dept', scorm: '1.2' };

test('SCORM 1.2 manifest: schema version', () => {
  const xml = buildManifest(CFG_12);
  assert.ok(xml.includes('<schemaversion>1.2</schemaversion>'));
});

test('SCORM 1.2 manifest: uses ADL SCORM 1.2 namespaces', () => {
  const xml = buildManifest(CFG_12);
  assert.ok(xml.includes('adlcp_rootv1p2'));
});

test('SCORM 1.2 manifest: identifier matches cfg.id', () => {
  const xml = buildManifest(CFG_12);
  assert.ok(xml.includes(`identifier="${CFG_12.id}"`));
});

test('SCORM 1.2 manifest: href points to index.html', () => {
  assert.ok(buildManifest(CFG_12).includes('href="index.html"'));
});

test('SCORM 1.2 manifest: scormAPI.js is inlined, not listed as a resource file', () => {
  assert.ok(!buildManifest(CFG_12).includes('scormAPI.js'));
});

// ── buildManifest — SCORM 2004 ───────────────────────────────────────────────

const CFG_2004 = { id: 'test_quiz', title: 'Knowledge Check', dept: 'Test Dept', scorm: '2004' };

test('SCORM 2004 manifest: schema version', () => {
  const xml = buildManifest(CFG_2004);
  assert.ok(xml.includes('2004 3rd Edition'));
});

test('SCORM 2004 manifest: includes imsss:sequencing', () => {
  assert.ok(buildManifest(CFG_2004).includes('imsss:sequencing'));
});

test('SCORM 2004 manifest: deliveryControls completionSetByContent', () => {
  assert.ok(buildManifest(CFG_2004).includes('completionSetByContent="true"'));
});

test('SCORM 2004 manifest: adlcp:scormType (capital T)', () => {
  // SCORM 2004 uses adlcp:scormType (camelCase T), 1.2 uses adlcp:scormtype (lowercase)
  assert.ok(buildManifest(CFG_2004).includes('adlcp:scormType="sco"'));
  assert.ok(buildManifest(CFG_12).includes('adlcp:scormtype="sco"'));
});

test('manifest escapes special chars in title and dept', () => {
  const cfg = { id: 'quiz', title: 'Fire & Rescue', dept: 'Station <1>', scorm: '1.2' };
  const xml  = buildManifest(cfg);
  assert.ok(xml.includes('Fire &amp; Rescue'));
  assert.ok(xml.includes('Station &lt;1&gt;'));
});

// ── buildSCORMAPI ─────────────────────────────────────────────────────────────

test('SCORM 1.2 API wrapper contains LMSInitialize', () => {
  assert.ok(buildSCORMAPI('1.2').includes('LMSInitialize'));
});

test('SCORM 1.2 API wrapper contains LMSSetValue', () => {
  assert.ok(buildSCORMAPI('1.2').includes('LMSSetValue'));
});

test('SCORM 1.2 wrapper: saveSuspend uses cmi.suspend_data', () => {
  assert.ok(buildSCORMAPI('1.2').includes('cmi.suspend_data'));
});

test('SCORM 2004 API wrapper contains Initialize (no LMS prefix)', () => {
  const api = buildSCORMAPI('2004');
  assert.ok(api.includes("api.Initialize('')"));
  assert.ok(!api.includes('LMSInitialize'));
});

test('SCORM 2004 wrapper: finish uses cmi.success_status', () => {
  assert.ok(buildSCORMAPI('2004').includes('cmi.success_status'));
});

test('SCORM 2004 wrapper: saveSuspend uses cmi.suspend_data', () => {
  assert.ok(buildSCORMAPI('2004').includes('cmi.suspend_data'));
});
