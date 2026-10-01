# Hodos

**Choose your path well.**

A mentor-in-your-pocket that helps Nigerian students choose a university course they
will not regret — and helps them explain that choice to their parents.

Hodos interviews the student with five short questions, weighs fit and Nigerian-market
prospects, and produces two outputs: a personal course-fit brief and a Parent Mode
summary the student can share with their family.

---

## How to run it

### Option A — local server (recommended)

Avoids a browser security restriction that can block the course data from loading.

**If you have Node.js installed:**
```
npx serve .
```
Then open the URL shown in the terminal (usually `http://localhost:3000`).

**If you have Python installed:**
```
python -m http.server 8000
```
Then open `http://localhost:8000`.

**VS Code:** Install the *Live Server* extension, right-click `index.html`, and
choose *Open with Live Server*.

### Option B — open the file directly

Double-click `index.html` to open it in your browser. This works in most browsers
but Chrome may block the course data from loading. If you see an error about
loading data, use Option A instead.

---

## Demo walkthrough

Two runs are needed to show that different answers produce different results.

**Run 1 — STEM profile**
- Subjects: Mathematics, Biology, Chemistry
- Interests: Solving problems and puzzles; Understanding the human body and health
- Work setting: Laboratory
- Limits: No major limits
- Worry: *(skip)*

Expected: Medicine, Pharmacy, or Radiography in the top 3.

**Run 2 — Humanities / Social sciences profile**
- Subjects: Government, Literature in English, Economics
- Interests: Debating, justice and fairness; Writing, speaking and storytelling
- Work setting: Courtroom or government
- Limits: My family expects a specific course
- Worry: *(type something about jobs or career)*

Expected: Law, Mass Communication, or Psychology in the top 3. The worry
text should appear quoted under "You told us:" on the brief. Parent Mode should
open with a note about family expectations.

---

## Files

| File | What it does |
|---|---|
| `index.html` | Single-page shell. All three surfaces live here. |
| `style.css` | All styling. CSS custom properties for the palette at the top. `@media print` rules at the bottom. |
| `app.js` | All JavaScript. Loads `courses.json`, renders each screen, runs scoring and worry matching, handles all events. |
| `courses.json` | All course data, question options, worry themes, discussion starters, next-steps checklist. |
| `jspdf.umd.min.js` | Client-side PDF generator used to download the Parent Summary directly without needing a printer. |

No `node_modules/`, no build step, no server required.

---

## Optional deployment

- **GitHub Pages:** push to a public repo, enable Pages on the `main` branch root.
- **Netlify Drop:** drag the project folder to `app.netlify.com/drop`.
- **Vercel:** run `npx vercel` from the project folder.

---

## Data notes

All course data is marked **[VERIFY]** where the detail needs checking against
official sources before the app goes public. Verify JAMB subject combinations at
[jamb.gov.ng](https://www.jamb.gov.ng) and programme structures at
[nuc.edu.ng](https://www.nuc.edu.ng).

Hodos contains no invented statistics, salary figures, cut-off marks, or
employment numbers. Economic and career descriptions are qualitative.
