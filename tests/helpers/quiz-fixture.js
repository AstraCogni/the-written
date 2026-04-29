const { buildQuizHTML } = require('../../builder/js/generator');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

function createQuizDir(cfg, questions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scorm-quiz-'));
  fs.writeFileSync(path.join(dir, 'quiz.html'), buildQuizHTML(cfg, questions));
  return dir;
}

function removeQuizDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Minimal deterministic question bank — no shuffling surprises
const QUESTIONS = [
  { type: 'MC', text: 'Q1: Which stairwell is the attack stairwell?',
    choices: ['Evacuation', 'Attack', 'Lobby'], correct: 1 },
  { type: 'TF', text: 'Q2: An annunciator panel displays the source of an alarm.',
    choices: ['True', 'False'], correct: 0 },
  { type: 'MC', text: 'Q3: What does the C in CAN report stand for?',
    choices: ['Conditions', 'Command', 'Control'], correct: 0 },
];

const BASE_CFG = {
  title:     'Test Quiz',
  dept:      'Test Dept',
  id:        'test_001',
  qcount:    3,
  threshold: 0.8,
  shuffleQ:  false,
  shuffleA:  false,
  showCorrect: true,
  showAnswer:  false,
  retakes:   true,
  colors: { bg:'#000', surface:'#111', border:'#222', accent:'#fff', text:'#eee', muted:'#888' },
  logoB64:   null,
  logoMime:  'image/png',
};

module.exports = { createQuizDir, removeQuizDir, QUESTIONS, BASE_CFG };
