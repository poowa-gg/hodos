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
  currentStep      = 6;
  renderResults();
}

// ─── Results screen ───────────────────────────────────────────────────────────
function renderResults() {
  document.getElementById('app').innerHTML = `
    ${headerHTML()}
    <main class="results-screen" aria-label="Your results">
      <div class="tab-bar" role="tablist">
        <button class="tab-btn tab-btn--active" id="tab-brief-btn"
          role="tab" aria-selected="true" aria-controls="tab-brief">My brief</button>
        <button class="tab-btn" id="tab-parents-btn"
          role="tab" aria-selected="false" aria-controls="tab-parents">For my parents</button>
      </div>

      <div id="tab-brief" class="tab-panel tab-panel--active" role="tabpanel" aria-labelledby="tab-brief-btn">
        ${renderBriefTab()}
      </div>

      <div id="tab-parents" class="tab-panel" role="tabpanel" aria-labelledby="tab-parents-btn">
        ${renderParentsTab()}
      </div>
    </main>`;

  attachStartOver();
  attachTabSwitching();
  attachParentActions();
}

function attachTabSwitching() {
  const briefBtn   = document.getElementById('tab-brief-btn');
  const parentsBtn = document.getElementById('tab-parents-btn');
  const briefPanel   = document.getElementById('tab-brief');
  const parentsPanel = document.getElementById('tab-parents');

  briefBtn.addEventListener('click', () => {
    briefBtn.classList.add('tab-btn--active');
    briefBtn.setAttribute('aria-selected', 'true');
    parentsBtn.classList.remove('tab-btn--active');
    parentsBtn.setAttribute('aria-selected', 'false');
    briefPanel.classList.add('tab-panel--active');
    parentsPanel.classList.remove('tab-panel--active');
  });

  parentsBtn.addEventListener('click', () => {
    parentsBtn.classList.add('tab-btn--active');
    parentsBtn.setAttribute('aria-selected', 'true');
    briefBtn.classList.remove('tab-btn--active');
    briefBtn.setAttribute('aria-selected', 'false');
    parentsPanel.classList.add('tab-panel--active');
    briefPanel.classList.remove('tab-panel--active');
  });

  // CTA card at foot of brief also switches tabs
  const ctaBtn = document.getElementById('cta-to-parents');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => parentsBtn.click());
  }
}

// ─── My Brief tab ─────────────────────────────────────────────────────────────
function renderBriefTab() {
  const worryBlock = worryReassurance && answers[4]
    ? `<div class="worry-quote" aria-label="Your worry and our response">
        <p class="worry-quote__label">You told us</p>
        <p class="worry-quote__text">"${escHtml(answers[4])}"</p>
        <p class="worry-quote__reassurance">${escHtml(worryReassurance)}</p>
       </div>`
    : '';

  const cards = topCourses.map((course, i) => renderCourseCard(course, i)).join('');

  const nextSteps = `
    <section class="next-steps" aria-label="Next steps">
      <h2 class="next-steps__title">Next steps</h2>
      <ol class="next-steps__list">
        ${courses.nextStepsChecklist.map(item => `<li>${escHtml(item)}</li>`).join('')}
      </ol>
    </section>`;

  const cta = `
    <button class="cta-card" id="cta-to-parents" aria-label="See the parent summary">
      <span class="cta-card__text">Ready to talk to your family? See the parent summary</span>
      <span class="cta-card__arrow" aria-hidden="true">→</span>
    </button>`;

  const disclaimer = `
    <p class="disclaimer">
      Verify requirements with official sources (JAMB, the university)
      and talk to a professional in the field.
    </p>`;

  return worryBlock + cards + nextSteps + cta + disclaimer;
}

function renderCourseCard(course, rankIndex) {
  const rankLabel = ['First match', 'Second match', 'Third match'][rankIndex] || `Match ${rankIndex + 1}`;
  const card = course.card;
  if (!card) return '';

  // JAMB mismatch alert
  const selectedSubjects = answers[0];
  const missingJamb = (course.jambRequired || []).filter(k => !selectedSubjects.includes(k));
  const jambAlert = missingJamb.length
    ? `<p class="jamb-alert">⚠ Your selected subjects don't include
        <strong>${missingJamb.map(k => subjectLabel(k)).join(', ')}</strong>.
        Verify this requirement with JAMB before applying.</p>`
    : '';

  // Limit notes — only for limits the student selected, skip no_limits and family_expects
  // (family_expects drives Parent Mode tone in Slice 4, not individual card notes)
  const selectedLimits = (answers[3] || []).filter(k => k !== 'no_limits' && k !== 'family_expects');
  const limitNoteItems = selectedLimits
    .filter(k => card.limitNotes && card.limitNotes[k])
    .map(k => `<p class="limit-note">${escHtml(card.limitNotes[k])}</p>`)
    .join('');
  const limitSection = limitNoteItems
    ? `<div class="limit-notes" aria-label="Notes on your situation">${limitNoteItems}</div>`
    : '';

  // Skills list
  const skillsList = Array.isArray(card.skillsToStack)
    ? `<ul class="skills-list">${card.skillsToStack.map(s => `<li>${escHtml(s)}</li>`).join('')}</ul>`
    : `<p class="course-card__section-body">${escHtml(card.skillsToStack || '')}</p>`;

  // Mentor questions
  const mentorList = Array.isArray(card.mentorQuestions)
    ? `<ul class="mentor-list">${card.mentorQuestions.map(q => `<li>${escHtml(q)}</li>`).join('')}</ul>`
    : `<p class="course-card__section-body">${escHtml(card.mentorQuestions || '')}</p>`;

  // "If this doesn't work out" — only reference courses that exist in our 13
  const fallback = card.ifNotWorkedOut
    ? `<p class="course-card__section-body">
        ${escHtml(card.ifNotWorkedOut.relatedCourses.join(' or '))}.
        ${escHtml(card.ifNotWorkedOut.verifyNote)}
       </p>`
    : '';

  // Match rationale — show which of the student's picks triggered this card
  const triggeredSubjects  = selectedSubjects.filter(k  => course.subjectKeys.includes(k)).map(k => subjectLabel(k));
  const triggeredInterests = answers[1].filter(k  => course.interestKeys.includes(k)).map(k => interestLabel(k));
  const matchLine = [...triggeredSubjects, ...triggeredInterests].length
    ? `Matched on: ${[...triggeredSubjects, ...triggeredInterests].join(', ')}.`
    : card.rationale;

  return `
    <article class="course-card" aria-label="${escAttr(course.name)} course details">
      <p class="course-card__rank">${escHtml(rankLabel)}</p>
      <h2 class="course-card__title">${escHtml(course.name)}</h2>
      <p class="course-card__rationale">${escHtml(matchLine)}</p>

      <div class="course-card__section">
        <p class="course-card__section-title">What you'll actually study</p>
        <p class="course-card__section-body">${escHtml(card.whatYouStudy || '')}</p>
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">JAMB subject combination</p>
        <p class="course-card__section-body">
          ${escHtml((course.jambRequired || []).map(k => subjectLabel(k)).join(', ') || 'VERIFY')}
        </p>
        ${jambAlert}
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">Nigerian career reality</p>
        <p class="course-card__section-body">${escHtml(card.careerReality || '')}</p>
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">Skills to stack</p>
        ${skillsList}
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">Honest risks</p>
        <p class="course-card__section-body">${escHtml(card.honestRisks || '')}</p>
        ${limitSection}
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">If this doesn't work out</p>
        ${fallback}
      </div>

      <div class="course-card__section">
        <p class="course-card__section-title">Questions to ask a professional</p>
        ${mentorList}
      </div>
    </article>`;
}

// ─── Parent Mode tab (stub — full implementation in Slice 4) ──────────────────
function renderParentsTab() {
  return `<p style="padding:24px 0;font-family:sans-serif;color:#6B6B6B;font-size:0.9rem;">
    Parent Mode coming in Slice 4.
  </p>`;
}

// stub — wired in Slice 4
function attachParentActions() {}

// ─── Label helpers ────────────────────────────────────────────────────────────
// Map option keys back to human-readable labels from courses.json
function subjectLabel(key) {
  const q = courses.questions[0];
  const opt = q && q.options ? q.options.find(o => o.key === key) : null;
  return opt ? opt.label : key;
}

function interestLabel(key) {
  const q = courses.questions[1];
  const opt = q && q.options ? q.options.find(o => o.key === key) : null;
  return opt ? opt.label : key;
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
