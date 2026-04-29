const { test, expect } = require('@playwright/test');
const path = require('path');
const { MOCK_2004, MOCK_12 }              = require('../helpers/scorm-mock');
const { createQuizDir, removeQuizDir, QUESTIONS, BASE_CFG } = require('../helpers/quiz-fixture');

// ── Page helpers ─────────────────────────────────────────────────────────────

async function startQuiz(page) {
  await page.locator('#start-screen .btn-primary').click();
  await page.locator('.choice-btn').first().waitFor();
}

async function pickChoice(page, idx) {
  await page.locator('.choice-btn').nth(idx).click();
  await page.locator('#next-btn:not([disabled])').waitFor();
}

async function advance(page) {
  await page.locator('#next-btn').click();
}

// Answer all questions in one pass.
// choices: array of 0-based choice indices, one per question.
async function answerAll(page, choices) {
  for (let i = 0; i < choices.length; i++) {
    if (i > 0) await page.locator('.choice-btn').first().waitFor();
    await pickChoice(page, choices[i]);
    await advance(page);
  }
  await page.locator('#results-screen.active').waitFor();
}

// ── SCORM 2004 ────────────────────────────────────────────────────────────────

test.describe('SCORM 2004 interaction tracking', () => {
  let dir;

  test.beforeAll(() => {
    dir = createQuizDir({ ...BASE_CFG, scorm: '2004' }, QUESTIONS);
  });
  test.afterAll(() => removeQuizDir(dir));

  test('records id, type, result, response, pattern, latency, timestamp per question', async ({ page }) => {
    await page.addInitScript(MOCK_2004);
    await page.goto(`file://${path.join(dir, 'quiz.html')}`);
    await startQuiz(page);

    // Q1 (MC): pick Attack (idx 1) → correct
    // Q2 (TF): pick True  (idx 0) → correct
    // Q3 (MC): pick Control (idx 2) → wrong (correct is idx 0)
    await answerAll(page, [1, 0, 2]);

    const d = await page.evaluate(() => window.API_1484_11._getData());

    // Q1 — correct MC
    expect(d['cmi.interactions.0.id']).toBe('q_0');
    expect(d['cmi.interactions.0.description']).toBe('Q1: Which stairwell is the attack stairwell?');
    expect(d['cmi.interactions.0.type']).toBe('choice');
    expect(d['cmi.interactions.0.result']).toBe('correct');
    expect(d['cmi.interactions.0.learner_response']).toBe('1');
    expect(d['cmi.interactions.0.correct_responses.0.pattern']).toBe('1');
    expect(d['cmi.interactions.0.latency']).toMatch(/^PT\d+\.\d{2}S$/);
    expect(d['cmi.interactions.0.timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(d['cmi.interactions.0.weighting']).toBe('1');

    // Q2 — correct T/F
    expect(d['cmi.interactions.1.id']).toBe('q_1');
    expect(d['cmi.interactions.1.type']).toBe('true-false');
    expect(d['cmi.interactions.1.result']).toBe('correct');
    expect(d['cmi.interactions.1.learner_response']).toBe('0');
    expect(d['cmi.interactions.1.correct_responses.0.pattern']).toBe('0');

    // Q3 — wrong MC
    expect(d['cmi.interactions.2.id']).toBe('q_2');
    expect(d['cmi.interactions.2.result']).toBe('incorrect');
    expect(d['cmi.interactions.2.learner_response']).toBe('2');
    expect(d['cmi.interactions.2.correct_responses.0.pattern']).toBe('0');

    // Final score: 2/3 = 67% → FAIL (threshold 80%)
    expect(d['cmi.score.raw']).toBe('67');
    expect(d['cmi.success_status']).toBe('failed');
    expect(d['cmi.completion_status']).toBe('completed');
  });

  test('perfect score sets success_status to passed', async ({ page }) => {
    await page.addInitScript(MOCK_2004);
    await page.goto(`file://${path.join(dir, 'quiz.html')}`);
    await startQuiz(page);
    await answerAll(page, [1, 0, 0]); // all correct

    const d = await page.evaluate(() => window.API_1484_11._getData());
    expect(d['cmi.score.raw']).toBe('100');
    expect(d['cmi.success_status']).toBe('passed');
  });

  test('interactionIdx accumulates across retakes — does not reset to 0', async ({ page }) => {
    await page.addInitScript(MOCK_2004);
    await page.goto(`file://${path.join(dir, 'quiz.html')}`);
    await startQuiz(page);

    // First attempt — all wrong
    await answerAll(page, [0, 1, 1]);

    // Retake
    await page.locator('button:has-text("Retake")').click();
    await page.locator('#start-screen.active').waitFor();
    await startQuiz(page);

    // Second attempt
    await answerAll(page, [1, 0, 0]);

    const d = await page.evaluate(() => window.API_1484_11._getData());

    // Second attempt interactions start at idx 3
    expect(d['cmi.interactions.3.id']).toBe('q_3');
    expect(d['cmi.interactions.4.id']).toBe('q_4');
    expect(d['cmi.interactions.5.id']).toBe('q_5');
    expect(d['cmi.interactions.5.result']).toBe('correct');
  });

  test('interactionIdx is restored from suspend_data.xi on cross-session resume', async ({ context }) => {
    // Simulate a second browser session: the LMS re-loads the page and hands back
    // the suspend_data that was saved when the learner closed mid-quiz.
    // State: answered Q1 correctly (s=1), paused before Q2 (i=1), interactionIdx=1 (xi=1).
    const suspendState = JSON.stringify({ q: [0, 1, 2], i: 1, s: 1, xi: 1 });
    const mockWithResume = `
      window.API_1484_11 = (function() {
        var data = { 'cmi.suspend_data': ${JSON.stringify(suspendState)} };
        return {
          Initialize:     function()    { return 'true'; },
          SetValue:       function(k,v) { data[k] = v; return 'true'; },
          GetValue:       function(k)   { return data[k] || ''; },
          Commit:         function()    { return 'true'; },
          Terminate:      function()    { return 'true'; },
          GetLastError:   function()    { return '0'; },
          GetErrorString: function()    { return ''; },
          GetDiagnostic:  function()    { return ''; },
          _getData:       function()    { return data; }
        };
      })();
    `;

    const p = await context.newPage();
    await p.addInitScript(mockWithResume);
    await p.goto(`file://${path.join(dir, 'quiz.html')}`);

    // Resume dialog should appear
    await p.locator('button:has-text("Continue")').click();
    await p.locator('.choice-btn').first().waitFor();

    // Q2 (TF): pick False (idx 1) → wrong  |  Q3 (MC): pick Conditions (idx 0) → correct
    await pickChoice(p, 1); await advance(p);
    await p.locator('.choice-btn').first().waitFor();
    await pickChoice(p, 0); await advance(p);
    await p.locator('#results-screen.active').waitFor();

    const d = await p.evaluate(() => window.API_1484_11._getData());

    // idx 0 was Q1 from session 1 — session 2 must NOT have touched it
    expect(d['cmi.interactions.0.id']).toBeUndefined();
    // idx 1 = Q2, idx 2 = Q3 — written in session 2 starting from restored xi=1
    expect(d['cmi.interactions.1.id']).toBe('q_1');
    expect(d['cmi.interactions.1.result']).toBe('incorrect');
    expect(d['cmi.interactions.2.id']).toBe('q_2');
    expect(d['cmi.interactions.2.result']).toBe('correct');

    await p.close();
  });
});

// ── SCORM 1.2 ─────────────────────────────────────────────────────────────────

test.describe('SCORM 1.2 interaction tracking', () => {
  let dir;

  test.beforeAll(() => {
    dir = createQuizDir({ ...BASE_CFG, scorm: '1.2' }, QUESTIONS);
  });
  test.afterAll(() => removeQuizDir(dir));

  test('uses student_response (not learner_response) and HHHH:MM:SS.SS latency', async ({ page }) => {
    await page.addInitScript(MOCK_12);
    await page.goto(`file://${path.join(dir, 'quiz.html')}`);
    await startQuiz(page);
    await answerAll(page, [1, 0, 0]); // all correct

    const d = await page.evaluate(() => window.API._getData());

    // 1.2-specific field names
    expect(d['cmi.interactions.0.student_response']).toBe('1');
    expect(d['cmi.interactions.0.learner_response']).toBeUndefined();

    // HHHH:MM:SS.SS format
    expect(d['cmi.interactions.0.latency']).toMatch(/^\d{4}:\d{2}:\d{2}\.\d{2}$/);
    expect(d['cmi.interactions.0.time']).toMatch(/^\d{2}:\d{2}:\d{2}/);

    // 1.2 score fields
    expect(d['cmi.core.score.raw']).toBeDefined();
    expect(d['cmi.core.lesson_status']).toMatch(/^(passed|failed)$/);
  });

  test('wrong answer recorded correctly in 1.2', async ({ page }) => {
    await page.addInitScript(MOCK_12);
    await page.goto(`file://${path.join(dir, 'quiz.html')}`);
    await startQuiz(page);
    await answerAll(page, [0, 0, 0]); // Q1 wrong (correct=1), Q2 correct, Q3 correct

    const d = await page.evaluate(() => window.API._getData());

    expect(d['cmi.interactions.0.result']).toBe('incorrect');
    expect(d['cmi.interactions.0.student_response']).toBe('0');
    expect(d['cmi.interactions.0.correct_responses.0.pattern']).toBe('1');
    expect(d['cmi.core.lesson_status']).toMatch(/^(passed|failed)$/);
  });
});
