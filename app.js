/**
 * app.js — Hodos
 * Single-page vanilla JS app. No framework, no build step.
 *
 * Session state lives here in module scope.
 * Rendering is done by swapping innerHTML inside #app.
 */

// ─── Session state ────────────────────────────────────────────────────────────
let currentStep = 0;    // 0 = landing, 1–5 = questions, 6 = results
let answers = [
  [],   // [0] subjects   — array of option keys
  [],   // [1] interests  — array of option keys
  [],   // [2] workSetting — array of option keys
  [],   // [3] limits     — array of option keys
  ""    // [4] worryText  — string (empty if skipped)
];
let topCourses = [];          // populated by score()
let worryReassurance = null;  // populated by matchWorry()
let courses = null;           // loaded from courses.json

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const res = await fetch('./courses.json');
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    courses = await res.json();
  } catch (err) {
    // Friendly error if fetch is blocked (e.g. file:// CORS)
    document.getElementById('app').innerHTML = `
      <div style="padding:40px 20px; font-family: sans-serif; color:#1A1A1A;">
        <strong>Hodos couldn't load its course data.</strong><br><br>
        If you're opening this file directly in a browser, try running a local server instead:<br>
        <code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;display:inline-block;margin-top:8px;">npx serve .</code><br><br>
        Or use VS Code's Live Server extension. See README.md for details.
        <br><br><small style="color:#888;">${err.message}</small>
      </div>`;
    return;
  }

  renderLanding();
}

// ─── Landing screen ───────────────────────────────────────────────────────────
function renderLanding() {
  currentStep = 0;

  document.getElementById('app').innerHTML = `
    <section class="landing" aria-label="Welcome to Hodos">
      <div>
        <h1 class="landing__wordmark">Hodos</h1>
        <p class="landing__sub">ὁδός · the path</p>
      </div>

      <p class="landing__hero">
        Choosing a university course is one of the most important decisions you'll make —
        and most people make it with very little real information. Hodos gives you an
        honest look at the courses that actually fit you, and the tools to talk it through
        with your family.
      </p>

      <p class="landing__tagline">Choose your path well.</p>

      <button id="start-btn" class="btn-primary" aria-label="Start the questionnaire">
        Start
      </button>
    </section>`;

  document.getElementById('start-btn').addEventListener('click', () => {
    currentStep = 1;
    renderQuestion();
  });
}

// ─── Persistent header (questions + results screens) ─────────────────────────
function headerHTML() {
  return `
    <header class="site-header" role="banner">
      <span class="site-header__wordmark" aria-label="Hodos">Hodos</span>
      <div id="startover-area">
        <button class="btn-ghost" id="startover-btn" aria-label="Start over">Start over</button>
      </div>
    </header>`;
}

function attachStartOver() {
  const btn = document.getElementById('startover-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const area = document.getElementById('startover-area');
    area.innerHTML = `
      <span class="startover-confirm">
        <span class="startover-confirm__msg">Start over? Your answers will be cleared.</span>
        <button class="startover-confirm__yes" id="startover-yes">Yes, start over</button>
        <button class="startover-confirm__no" id="startover-no">Cancel</button>
      </span>`;
    document.getElementById('startover-yes').addEventListener('click', () => {
      answers = [[], [], [], [], ""];
      topCourses = [];
      worryReassurance = null;
      renderLanding();
    });
    document.getElementById('startover-no').addEventListener('click', () => {
      area.innerHTML = `<button class="btn-ghost" id="startover-btn" aria-label="Start over">Start over</button>`;
      attachStartOver();
    });
  });
}

// ─── Question screen ──────────────────────────────────────────────────────────
// stepIndex: 1–5 (maps to answers[0]–answers[4])
function renderQuestion() {
  const stepIndex = currentStep; // 1-based
  const qIndex    = stepIndex - 1; // 0-based into answers[] and questions[]

  const q = courses.questions[qIndex];

  // Q5 is the worry free-text question (type: "text")
  const isWorry = (q && q.type === 'text');

  document.getElementById('app').innerHTML = `
    ${headerHTML()}
    <main class="question-screen" aria-label="Question ${stepIndex} of 5">
      <p class="question-screen__progress" aria-live="polite">Question ${stepIndex} of 5</p>
      <h1 class="question-screen__heading">${q ? escHtml(q.text) : ''}</h1>
      <p class="question-screen__helper">${q ? escHtml(q.helper || '') : ''}</p>
      ${isWorry ? renderWorryInput() : renderChipGrid(qIndex)}
      ${isWorry ? renderQ5Actions() : renderNextBtn(qIndex)}
    </main>`;

  attachStartOver();

  if (isWorry) {
    attachWorryListeners();
  } else {
    attachChipListeners(qIndex);
  }
}

function renderChipGrid(qIndex) {
  const q = courses.questions[qIndex];
  if (!q || !q.options) return '';
  const chips = q.options.map(opt => {
    const sel = answers[qIndex].includes(opt.key) ? ' chip--selected' : '';
    return `<button class="chip${sel}" data-key="${escAttr(opt.key)}" aria-pressed="${answers[qIndex].includes(opt.key)}">${escHtml(opt.label)}</button>`;
  }).join('');
  return `<div class="chip-grid" role="group" aria-label="Options">${chips}</div>`;
}

function renderNextBtn(qIndex) {
  const enough = answers[qIndex].length >= 1;
  return `<button class="btn-primary" id="next-btn" ${enough ? '' : 'disabled'} aria-label="Next question">Next</button>`;
}

function renderWorryInput() {
  const val = answers[4] || '';
  const remaining = 140 - val.length;
  return `
    <div class="worry-wrap">
      <textarea class="worry-textarea" id="worry-input" maxlength="140"
        placeholder="Type your worry here…" rows="3"
        aria-label="Your worry (optional)">${escHtml(val)}</textarea>
      <p class="worry-counter" aria-live="polite" id="worry-counter">${remaining} characters remaining</p>
    </div>`;
}

function renderQ5Actions() {
  return `
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      <button class="btn-primary" id="get-brief-btn">Get my brief</button>
      <button class="btn-ghost" id="skip-btn" style="color:var(--color-muted);font-size:0.9rem;">Skip</button>
    </div>`;
}

function attachChipListeners(qIndex) {
  const q     = courses.questions[qIndex];
  const max   = q.max || Infinity;        // no max on Q4 limits
  const noLimitsKey = 'no_limits';

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.key;

      if (answers[qIndex].includes(key)) {
        // Deselect
        answers[qIndex] = answers[qIndex].filter(k => k !== key);
      } else {
        // Q4 special: selecting "No major limits" deselects everything else
        if (qIndex === 3 && key === noLimitsKey) {
          answers[qIndex] = [noLimitsKey];
        } else if (qIndex === 3 && answers[qIndex].includes(noLimitsKey)) {
          // Selecting another limit deselects "No major limits"
          answers[qIndex] = answers[qIndex].filter(k => k !== noLimitsKey);
          answers[qIndex].push(key);
        } else if (answers[qIndex].length >= max) {
          // Rolling selection: drop oldest, add new
          answers[qIndex] = [...answers[qIndex].slice(1), key];
        } else {
          answers[qIndex].push(key);
        }
      }

      // Re-render chips and next button in place
      document.querySelector('.chip-grid').outerHTML; // read before replace
      const grid = document.querySelector('.chip-grid');
      grid.outerHTML = renderChipGrid(qIndex);
      // Re-attach chip listeners after DOM swap
      attachChipListeners(qIndex);

      // Update Next button state
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) nextBtn.disabled = answers[qIndex].length < 1;

      // Sync aria-pressed on newly rendered chips
      document.querySelectorAll('.chip').forEach(c => {
        c.setAttribute('aria-pressed', answers[qIndex].includes(c.dataset.key));
      });
    });
  });

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', advanceStep);
  }
}

function attachWorryListeners() {
  const textarea = document.getElementById('worry-input');
  const counter  = document.getElementById('worry-counter');

  textarea.addEventListener('input', () => {
    answers[4] = textarea.value;
    counter.textContent = `${140 - textarea.value.length} characters remaining`;
  });

  document.getElementById('get-brief-btn').addEventListener('click', () => {
    answers[4] = textarea.value.trim();
    finishQuestionnaire();
  });

  document.getElementById('skip-btn').addEventListener('click', () => {
    answers[4] = "";
    finishQuestionnaire();
  });
}

function advanceStep() {
  currentStep += 1;
  if (currentStep <= 5) {
    renderQuestion();
  } else {
    finishQuestionnaire();
  }
}

function finishQuestionnaire() {
  // Run scoring and worry matching
  topCourses       = score(answers);
  worryReassurance = matchWorry(answers[4]);

  // Slice 3b renders the full results UI; for now show a verification dump
  document.getElementById('app').innerHTML = `
    ${headerHTML()}
    <main style="padding:40px 0;font-family:sans-serif;color:#1A1A1A;">
      <p style="margin-bottom:12px;"><strong>Top 3 courses:</strong></p>
      <ol style="padding-left:20px;margin-bottom:24px;">
        ${topCourses.map(c => `<li>${escHtml(c.name)} (score: ${c._score})</li>`).join('')}
      </ol>
      <p><strong>Worry reassurance:</strong> ${worryReassurance ? escHtml(worryReassurance) : '(none)'}</p>
      <p style="margin-top:24px;font-size:0.8rem;color:#888;">Full results UI coming in Slice 3b.</p>
    </main>`;
  attachStartOver();
}

// ─── Scoring engine ───────────────────────────────────────────────────────────
// Weights per spec: subjects ×5, interests ×4, work setting ×2
const WEIGHTS = { subject: 5, interest: 4, work: 2 };

/**
 * score(answers) → array of 3 course objects, ranked highest first.
 * Each returned object is the original course data extended with _score.
 */
function score(answers) {
  const selectedSubjects  = answers[0];
  const selectedInterests = answers[1];
  const selectedWork      = answers[2];

  const scored = courses.courses.map(course => {
    const subjectMatches  = selectedSubjects.filter(k  => course.subjectKeys.includes(k)).length;
    const interestMatches = selectedInterests.filter(k => course.interestKeys.includes(k)).length;
    const workMatches     = selectedWork.filter(k      => course.workKeys.includes(k)).length;

    const total = (subjectMatches  * WEIGHTS.subject)
                + (interestMatches * WEIGHTS.interest)
                + (workMatches     * WEIGHTS.work);

    return { ...course, _score: total };
  });

  // Sort descending by score, then ascending by tiebreakOrder for ties
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return a.tiebreakOrder - b.tiebreakOrder;
  });

  return scored.slice(0, 3);
}

// ─── Worry matcher ────────────────────────────────────────────────────────────
/**
 * matchWorry(text) → reassurance string, or null if no match / empty input.
 * First matching theme wins. Case-insensitive substring search.
 */
function matchWorry(text) {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();
  for (const theme of courses.worryThemes) {
    if (theme.triggers.some(trigger => lower.includes(trigger))) {
      return theme.reassurance;
    }
  }
  return null;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return escHtml(str);
}

// ─── Start ────────────────────────────────────────────────────────────────────
boot();
