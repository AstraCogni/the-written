# SCORM Quiz Builder
### Generate SCORM 1.2 / 2004 quiz packages from a spreadsheet — no server, no license required.

---

## What It Does

The SCORM Quiz Builder is a single self-contained HTML file that runs entirely in your browser. You supply a question bank (TSV file), a logo, and your configuration — it outputs a ready-to-upload SCORM ZIP package compatible with any standards-compliant LMS including NinthBrain and Fire Engineering Training (FET).

No Articulate license. No server. No installation. Open the HTML file in Chrome or Firefox and go.

---

## Quick Start

1. Open `SCORM_Builder.html` in Chrome or Firefox
2. **Step 1 — Question Bank:** Drop in your `.tsv` question file (or paste TSV directly)
3. **Step 2 — Logo:** Drop in your department seal or logo (PNG recommended)
4. **Step 3 — Course Config:** Set title, department name, course ID, question count, pass threshold
5. **Step 4 — Color Theme:** Pick from presets or customize with color pickers
6. Click **Generate SCORM Package** — a `.zip` file downloads automatically
7. Upload the ZIP to your LMS

---

## TSV Question File Format

Questions are supplied as a **tab-separated values (.tsv)** file. The first row must be a header row — it is ignored by the builder during import. Each subsequent row is one question.

### Column Order

| Column | Name | Required | Description |
|--------|------|----------|-------------|
| 1 | QuestionType | Yes | `MC` for Multiple Choice, `TF` for True/False |
| 2 | QuestionText | Yes | The full question stem |
| 3 | Choice1 | Yes | First answer choice |
| 4 | Choice2 | Yes | Second answer choice |
| 5 | Choice3 | No | Third answer choice (MC only) |
| 6 | Choice4 | No | Fourth answer choice (MC only) |
| 7 | Choice5 | No | Fifth answer choice (MC only, rare) |
| last | CorrectIndex | Yes | **Zero-based** index of the correct answer (0 = first choice) |

> **Important:** The CorrectIndex column must always be the **last** column. Empty choice columns between the last choice and the index are fine.

### True/False Questions

For T/F questions, always use exactly two choices: `True` and `False` in that order.
- Correct answer is `True` → CorrectIndex = `0`
- Correct answer is `False` → CorrectIndex = `1`

### Multiple Choice Questions

Up to 5 answer choices supported. CorrectIndex is zero-based:
- First choice correct → `0`
- Second choice correct → `1`
- Third choice correct → `2`
- And so on.

---

## TSV Example

```
QuestionType	QuestionText	Choice1	Choice2	Choice3	Choice4	CorrectIndex
TF	True/False: An Annunciator Panel displays the source of an alarm or fire protection system operation.	True	False			0
MC	Which stairwell is designated for the main fire attack during high-rise operations?	Evacuation Stairwell	Attack Stairwell	Lobby Stairwell	Service Stairwell	1
MC	Which of the following is NOT part of a CAN report?	Conditions	Actions	Needs	Notifications	3
TF	True/False: A "Branch" in NIMS terminology is always identified by a number.	True	False			1
MC	What device automatically shuts down power to an elevator when a heat detector activates?	Safety Edge	Shunt Trip	Fire Damper	Fusible Link	1
```

> **Tip:** Build your question bank in Excel or Google Sheets and export as TSV (tab-separated). Each tab character separates columns — do not use commas.

---

## Color Presets

| Preset | Description |
|--------|-------------|
| **IFD Gold** | Indianapolis Fire Department coin palette — deep navy/purple background, gold accent |
| **Dark Steel** | Dark GitHub-inspired theme — dark background, blue accent |
| **Navy Command** | Deep navy with sky blue accent |
| **Crimson** | Dark red theme with crimson accent |
| **Forest** | Dark green theme with bright green accent |

Custom colors can be set using the color pickers or by typing hex values directly.

---

## Course Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Course Title | Knowledge Assessment | Displayed in header and start screen |
| Department Name | Fire Department | Displayed as subtitle |
| SCORM Course ID | quiz_001 | Unique identifier in the manifest — no spaces |
| SCORM Version | 1.2 | SCORM 1.2 recommended for broadest compatibility |
| Questions Per Attempt | 25 | Randomly drawn from the full bank each attempt |
| Pass Threshold | 80% | Minimum score to record as passed |
| Shuffle Questions | Yes | Randomizes question order each attempt |
| Shuffle Answer Choices | Yes | Randomizes answer order (T/F always fixed) |
| Show Correct Answer | Each question | Reveals correct answer immediately after selection |
| Allow Retakes | Yes | Shows Retake button on results screen |

---

## SCORM Package Contents

The generated ZIP contains three files:

```
your_course_id_scorm.zip
├── imsmanifest.xml    — LMS entry point and metadata
├── scormAPI.js        — SCORM 1.2 or 2004 communication wrapper
└── index.html         — Complete self-contained quiz (logo + questions embedded)
```

The question bank is embedded in `index.html` using base64 encoding to deter casual inspection. The logo is embedded as a base64 data URI — no external file references, works offline.

---

## SCORM Behavior

### Score Reporting
- `cmi.core.score.raw` — raw score (0–100)
- `cmi.core.lesson_status` — `passed` or `failed`
- `cmi.core.exit` — `normal` on pass, `suspend` on fail

### Session Handling
- **On pass:** Score and status are committed. Session remains open until the learner clicks Exit.
- **On fail:** Score and status are committed. Session stays open — learner can Retake without the LMS closing the window.
- **Exit button:** Explicitly terminates the SCORM session (`LMSFinish`) and displays a "Session Saved" confirmation. The LMS controls window closure — the content cannot force-close an LMS-managed window.

### Retake Behavior
Each retake draws a new random selection of questions from the bank (if shuffle is enabled). The previous score is overwritten when the new attempt finishes.

---

## LMS Compatibility

Tested against:
- **SCORM Cloud** (Rustici) — industry standard test environment
- **NinthBrain** — fire/EMS LMS

Should be compatible with any SCORM 1.2-compliant LMS. If using SCORM 2004, confirm your LMS supports the 3rd Edition before selecting that option.

### NinthBrain Notes
NinthBrain opens SCORM content in a new browser window. When the learner exits, that window remains open showing the "Session Saved" screen — this is expected behavior. The learner closes it manually to return to NinthBrain. Score and pass/fail status record correctly.

### SCORM Cloud Notes
After a failed attempt, SCORM Cloud may still show `exit action=exit` in the debug log — this is a SCORM Cloud course property setting (`finalScoCourseNotSatisfiedNormalExitAction`) that can be changed in Course Properties. It does not affect score recording.

---

## Troubleshooting

**Builder shows 99 questions instead of 100**
The TSV file is missing its header row. The first row is always treated as a header and skipped. Add a header row: `QuestionType	QuestionText	Choice1	...	CorrectIndex`

**Questions not loading from TSV**
- Verify the file uses actual tab characters (not spaces) as separators
- Confirm CorrectIndex is the last column
- Check that CorrectIndex values are zero-based integers
- Rows with fewer than 4 columns or invalid CorrectIndex values are silently skipped — check the build log

**SCORM package won't import to LMS**
- Ensure the ZIP contains `imsmanifest.xml` at the root level (not inside a subfolder)
- Avoid special characters or spaces in the Course ID field
- Try SCORM 1.2 if SCORM 2004 fails

**Window doesn't close on Exit**
Expected. Browsers block `window.close()` for security when the window was opened by an LMS rather than by a script. The "Session Saved" screen confirms the session was committed successfully.

---

## Files in This Package

| File | Description |
|------|-------------|
| `SCORM_Builder.html` | The builder application — open in browser |
| `HOG_questions.tsv` | IFD High-Rise Operations Guide question bank (100 questions) |
| `tsv_template.tsv` | Blank template for building your own question bank |
| `SCORM_Builder_README.md` | This file |

---

## Built With

- **JSZip** (cdnjs) — client-side ZIP generation
- **Google Fonts** — Barlow Condensed + Barlow
- Pure HTML / CSS / JavaScript — no frameworks, no build tools, no dependencies beyond a browser

---

*Built by Claude (Anthropic) · Indianapolis, April 2026*
