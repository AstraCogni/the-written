const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { parseTSV } = require('../../builder/js/parser');

const HDR = 'QuestionType\tQuestionText\tChoice1\tChoice2\tCorrectIndex\n';

test('skips header row and parses MC question', () => {
  const { questions, errors } = parseTSV(HDR + 'MC\tWhat color is the sky?\tBlue\tRed\t0');
  assert.equal(questions.length, 1);
  assert.equal(errors.length, 0);
  assert.equal(questions[0].type, 'MC');
  assert.equal(questions[0].text, 'What color is the sky?');
  assert.deepEqual(questions[0].choices, ['Blue', 'Red']);
  assert.equal(questions[0].correct, 0);
});

test('parses T/F question with correct=1 (False)', () => {
  const { questions } = parseTSV(HDR + 'TF\tFire is cold.\tTrue\tFalse\t\t1');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].type, 'TF');
  assert.deepEqual(questions[0].choices, ['True', 'False']);
  assert.equal(questions[0].correct, 1);
});

test('filters empty choice columns between last choice and index', () => {
  const { questions } = parseTSV(HDR + 'MC\tQ?\tA\tB\tC\t\t2');
  assert.equal(questions[0].choices.length, 3);
  assert.equal(questions[0].correct, 2);
});

test('handles 5-choice MC question', () => {
  const { questions } = parseTSV(HDR + 'MC\tQ?\tA\tB\tC\tD\tE\t4');
  assert.equal(questions[0].choices.length, 5);
  assert.equal(questions[0].correct, 4);
});

test('returns empty for blank input', () => {
  const { questions, errors } = parseTSV('');
  assert.equal(questions.length, 0);
  assert.equal(errors.length, 0);
});

test('returns empty for whitespace-only input', () => {
  const { questions } = parseTSV('   \n\t\n  ');
  assert.equal(questions.length, 0);
});

test('skips header row silently (no error)', () => {
  const { questions, errors } = parseTSV('QuestionType\tText\tC1\tC2\tIdx\nMC\tQ\tA\tB\t0');
  assert.equal(questions.length, 1);
  assert.equal(errors.length, 0);
});

test('error: too few columns', () => {
  const { questions, errors } = parseTSV('header\nMC\tOnly two cols');
  assert.equal(questions.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /too few columns/);
});

test('error: empty question text', () => {
  const { questions, errors } = parseTSV('header\nMC\t\tA\tB\t0');
  assert.equal(questions.length, 0);
  assert.match(errors[0], /empty question text/);
});

test('error: fewer than 2 choices', () => {
  const { questions, errors } = parseTSV('header\nMC\tQ?\tOnlyOne\t0');
  assert.equal(questions.length, 0);
  assert.match(errors[0], /at least 2 choices/);
});

test('error: correct index out of range', () => {
  const { questions, errors } = parseTSV('header\nMC\tQ?\tA\tB\t5');
  assert.equal(questions.length, 0);
  assert.match(errors[0], /invalid correct index/);
});

test('error: negative correct index', () => {
  const { questions, errors } = parseTSV('header\nMC\tQ?\tA\tB\t-1');
  assert.equal(questions.length, 0);
  assert.match(errors[0], /invalid correct index/);
});

test('parses mixed MC and TF rows, collects parse errors for bad rows', () => {
  const raw = [
    'header',
    'MC\tGood MC\tA\tB\t0',
    'TF\tGood TF\tTrue\tFalse\t1',
    'MC\tBad row\tA\tB\t99',
  ].join('\n');
  const { questions, errors } = parseTSV(raw);
  assert.equal(questions.length, 2);
  assert.equal(errors.length, 1);
});

test('trims whitespace from values', () => {
  const { questions } = parseTSV('header\n MC \t  What? \t Yes \t No \t 1');
  assert.equal(questions[0].type, 'MC');
  assert.equal(questions[0].text, 'What?');
  assert.deepEqual(questions[0].choices, ['Yes', 'No']);
  assert.equal(questions[0].correct, 1);
});
