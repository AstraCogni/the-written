function parseTSV(rawText) {
  if (!rawText || !rawText.trim()) return { questions: [], errors: [] };

  const lines = rawText.trim().split('\n').filter(l => l.trim());
  const questions = [];
  const errors = [];

  lines.forEach((line, i) => {
    const parts = line.split('\t');
    const qtype = parts[0].trim().toUpperCase();

    if (!['MC', 'TF'].includes(qtype)) {
      if (i > 0) errors.push(`Row ${i + 1}: unknown type "${qtype}" — skipped`);
      return;
    }

    if (parts.length < 4) {
      errors.push(`Row ${i + 1}: too few columns (${parts.length})`);
      return;
    }

    const qtext   = parts[1].trim();
    const last    = parts[parts.length - 1].trim();
    const lastNum = parseInt(last);
    let correctIdx, feedback, choiceEnd;

    if (!isNaN(lastNum)) {
      // Old format: CorrectIndex is the last column
      correctIdx = lastNum;
      feedback   = null;
      choiceEnd  = parts.length - 1;
    } else {
      // New format: last column is feedback text, second-to-last is CorrectIndex
      correctIdx = parseInt(parts[parts.length - 2].trim());
      feedback   = last || null;
      choiceEnd  = parts.length - 2;
    }

    const choices = parts.slice(2, choiceEnd).map(c => c.trim()).filter(Boolean);

    if (!qtext)            { errors.push(`Row ${i + 1}: empty question text`); return; }
    if (choices.length < 2){ errors.push(`Row ${i + 1}: need at least 2 choices`); return; }
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= choices.length) {
      errors.push(`Row ${i + 1}: invalid correct index ${correctIdx}`);
      return;
    }
    questions.push({ type: qtype, text: qtext, choices, correct: correctIdx, feedback });
  });

  return { questions, errors };
}

if (typeof module !== 'undefined') module.exports = { parseTSV };
