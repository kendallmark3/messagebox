const form = document.getElementById("idea-form");
const input = document.getElementById("suggestion");
const submitBtn = document.getElementById("submit-btn");
const newIdeaBtn = document.getElementById("new-idea");
const retryBtn = document.getElementById("retry");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const errorText = document.getElementById("error-text");
const evaluationBox = document.getElementById("evaluation");
const stageNote = document.getElementById("stage-note");
const badge = document.getElementById("recommendation");

const FIELDS = {
  problem: "f-problem",
  whoItAffects: "f-who",
  potentialValue: "f-value",
  missingEvidence: "f-evidence",
  smallestNextStep: "f-next",
};

const BADGE_CLASS = {
  "Strong Candidate": "badge-strong",
  "Worth Exploring": "badge-explore",
  "Needs More Evidence": "badge-evidence",
  "Low Value / Unclear": "badge-low",
};

const GENERIC_ERROR = "We couldn't evaluate this idea. Please try again.";
let pending = false;

function syncSubmit() {
  submitBtn.disabled = pending || input.value.trim() === "";
}

function show(el, visible) {
  el.hidden = !visible;
}

function isValidEvaluation(evaluation) {
  return (
    evaluation &&
    Object.keys(FIELDS).every((key) => typeof evaluation[key] === "string" && evaluation[key].trim() !== "") &&
    evaluation.recommendation in BADGE_CLASS
  );
}

function renderEvaluation(evaluation) {
  for (const [key, id] of Object.entries(FIELDS)) {
    document.getElementById(id).textContent = evaluation[key];
  }
  badge.textContent = evaluation.recommendation;
  badge.className = `badge ${BADGE_CLASS[evaluation.recommendation]}`;
  stageNote.textContent = "Your idea is here";
  show(evaluationBox, true);
  document.getElementById("pipeline").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitIdea() {
  const suggestion = input.value.trim();
  if (!suggestion || pending) return;

  pending = true;
  syncSubmit();
  input.readOnly = true;
  show(errorBox, false);
  show(evaluationBox, false);
  show(loading, true);

  try {
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || GENERIC_ERROR);
    if (!isValidEvaluation(body?.evaluation)) throw new Error(GENERIC_ERROR);
    renderEvaluation(body.evaluation);
  } catch (error) {
    errorText.textContent = error instanceof TypeError ? "We couldn't reach the workbench. Check your connection and try again." : error.message;
    show(errorBox, true);
  } finally {
    pending = false;
    input.readOnly = false;
    show(loading, false);
    syncSubmit();
  }
}

function resetWorkbench() {
  if (pending) return;
  form.reset();
  show(errorBox, false);
  show(evaluationBox, false);
  stageNote.textContent = "New ideas start here";
  syncSubmit();
  window.scrollTo({ top: 0, behavior: "smooth" });
  input.focus({ preventScroll: true });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitIdea();
});
input.addEventListener("input", syncSubmit);
retryBtn.addEventListener("click", submitIdea);
newIdeaBtn.addEventListener("click", resetWorkbench);
syncSubmit();
