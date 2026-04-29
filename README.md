# The Written

**Make it matter. Make it written.**

A browser-based SCORM quiz package generator. Paste a question bank, configure your quiz, and download a ready-to-upload SCORM package — no server, no account, no license required.

Works with any LMS that accepts SCORM 1.2 or SCORM 2004 packages: NinthBrain, Moodle, Canvas, Blackboard, TalentLMS, SCORM Cloud, and others.

---

## Quick Start

1. Open `docs/index.html` in Chrome — or use the [live version](https://AstraCogni.github.io/the-written/)
2. Paste or upload your questions as a TSV file (see format below)
3. Configure your quiz — title, pass threshold, question count, colors, logo
4. Click **Generate SCORM Package** → download ZIP → upload to your LMS

Or click **▶ Preview Quiz** to see your quiz in a new browser tab instantly before packaging.

---

## Question Bank Format

Tab-separated values (`.tsv`), one question per row. First row is a header and is always skipped.

```
QuestionType	QuestionText	Choice1	Choice2	Choice3	Choice4	CorrectIndex
MC	What does PASS stand for?	Pull, Aim, Squeeze, Sweep	Panic, Abandon, Spray, Surrender	Point, Aim, Squirt, Soak		0
TF	Scene safety is assessed once on arrival.	True	False				1
```

| Column | Description |
|--------|-------------|
| `QuestionType` | `MC` for multiple choice, `TF` for true/false |
| `QuestionText` | The question stem |
| `Choice1...ChoiceN` | Answer choices — up to 5 supported |
| `CorrectIndex` | Zero-based index of the correct answer (always last column) |

### Logo / Seal

- **Format:** PNG recommended (supports transparency)
- **Size:** 500×500px minimum — displayed at 44px (header) and 100px (start screen), cropped to a circle
- Embedded as base64 — no external files in the generated package

Empty choice columns between the last choice and `CorrectIndex` are filtered automatically — safe to use a consistent column count across all rows.

A sample question bank (`sample_questions.tsv`) is included to get you started.

---

## Features

- SCORM 2004 3rd Edition and SCORM 1.2 output
- Per-question interaction tracking (`cmi.interactions`) for LMS item analysis — pass rates, distractor popularity, time per question
- Session suspend/resume — learners pick up where they left off across browser sessions
- Question and answer shuffling per attempt
- Configurable pass threshold, question draw count, and retake policy
- Per-question feedback with correct answer reveal
- Logo/seal upload embedded as base64 — no external assets in the package
- Five color presets + full custom color control
- Live quiz preview — no LMS, no ZIP, opens instantly in a new tab
- Responsive quiz output — desktop, laptop, tablet, and phone

---

## Building from Source

```bash
# Install test dependencies (optional)
npm install

# Build the single-file output
python3 build.py

# Run the test suite (32 unit + 6 e2e Playwright)
npm test
```

Source files live in `builder/` (CSS + JS modules). `build.py` inlines everything into `docs/index.html` — the single deployable file. Edit source, rebuild, done.

---

## Hosting Options

`docs/index.html` is fully self-contained — no dependencies, no build step required to use it.

| Option | How |
|--------|-----|
| **Share the file** | Email it, put it on a shared drive — recipient opens in Chrome, done |
| **GitHub Pages** | Enable Pages from the `docs/` folder — instant public URL |
| **SharePoint** | Upload to a document library — opens in browser over HTTPS |
| **Local server** | `python3 -m http.server 8000` — unlocks TSV file upload (bypasses `file://` restriction) |

---

## License

MIT — free to use, modify, and distribute.

---

## Authors

**Shawn Christopher** ([@AstraCogni](https://github.com/AstraCogni)) — concept, domain expertise, design direction, and the name  
**Claude** (Anthropic) — engineering partner

*Started as a fire/EMS training tool. Works for anyone with questions to ask and an LMS to answer to.*
