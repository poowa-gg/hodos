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

// ─── Placeholder — question + results screens (added in Slice 2 & 3) ─────────
function renderQuestion() {
  // Slice 2 will implement this fully.
  document.getElementById('app').innerHTML = `
    <p style="padding:40px 20px;font-family:sans-serif;color:#6B6B6B;">
      Question flow coming in Slice 2.
    </p>`;
}

// ─── Start ────────────────────────────────────────────────────────────────────
boot();
