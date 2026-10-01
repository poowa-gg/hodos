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
  // Slice 3 will wire scoring here; for now show a placeholder
  document.getElementById('app').innerHTML = `
    ${headerHTML()}
    <main style="padding:40px 0;font-family:sans-serif;color:#6B6B6B;">
      <p>Results coming in Slice 3. Your answers were captured:</p>
      <pre style="font-size:0.75rem;margin-top:16px;white-space:pre-wrap;">${JSON.stringify(answers, null, 2)}</pre>
    </main>`;
  attachStartOver();
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
