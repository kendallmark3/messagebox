const STAGES = [
  { name: "Problem", icon: "i-bulb", note: "New ideas start here" },
  { name: "Evidence", icon: "i-doc", note: "Show that it matters" },
  { name: "Prototype", icon: "i-gear", note: "Test it cheaply" },
  { name: "Pilot", icon: "i-flask", note: "Try it with real users" },
  { name: "Investment", icon: "i-bars", note: "Fund and scale it" },
];
const STAGE_NAMES = STAGES.map((stage) => stage.name);
const OUTCOME_STAGES = ["Pilot", "Investment"];
// An idea is approved by an admin at the first of these and cannot enter the second without it.
const APPROVAL_FROM = "Pilot";
const APPROVAL_FOR = "Investment";
// An analysis exists only for ideas approved into this stage or beyond.
const ANALYSIS_STAGE_INDEX = STAGE_NAMES.indexOf("Prototype");

const FIELDS = [
  ["problem", "Problem"],
  ["whoItAffects", "Who it affects"],
  ["potentialValue", "Potential value"],
  ["missingEvidence", "Missing evidence"],
  ["smallestNextStep", "Smallest next step"],
];

const BADGE_CLASS = {
  "Strong Candidate": "badge-strong",
  "Worth Exploring": "badge-explore",
  "Needs More Evidence": "badge-evidence",
  "Low Value / Unclear": "badge-low",
};

const VIEWS = {
  submit: {
    title: "Ideas Workbench",
    lede: "Tell us about a problem or opportunity you see at work. You'll get a quick assessment of whether it's worth pursuing.",
  },
  "my-ideas": { title: "My Ideas", lede: "The ideas you've submitted from this browser.", render: renderMyIdeas },
  pipeline: { title: "Review Pipeline", lede: "Every idea, by the stage it has earned.", render: renderPipeline },
  analytics: { title: "Analytics", lede: "What has been submitted so far.", render: renderAnalytics },
  impact: { title: "Impact", lede: "What ideas at Pilot and Investment have led to.", render: renderImpact },
};

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SVG_NS = "http://www.w3.org/2000/svg";

/* DOM helpers */

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key in el && key !== "list" && key !== "form") el[key] = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter((child) => child != null && child !== false));
  return el;
}

function icon(id) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatHours(hours) {
  return hours.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/* Data */

// "My ideas" means "submitted from this browser": there are no accounts.
function getSubmitterId() {
  try {
    let id = localStorage.getItem("submitterId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("submitterId", id);
    }
    return id;
  } catch {
    return (getSubmitterId.fallback ??= crypto.randomUUID());
  }
}

// Admin sign-in (prototype). Kept for the browser session; the server forgets it on restart.
const admin = { token: null, name: null };
try {
  admin.token = sessionStorage.getItem("adminToken");
  admin.name = sessionStorage.getItem("adminName");
} catch {
  // No session storage: admin sign-in lasts until the page is closed.
}

function setAdmin(token, name) {
  admin.token = token;
  admin.name = name;
  try {
    if (token) {
      sessionStorage.setItem("adminToken", token);
      sessionStorage.setItem("adminName", name);
    } else {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminName");
    }
  } catch {
    // Ignore: the in-memory copy is enough for this page.
  }
  drawAdminArea();
}

let toastTimer;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 6000);
}

async function api(path, { method = "GET", body } = {}) {
  let response;
  try {
    const headers = body ? { "Content-Type": "application/json" } : {};
    if (admin.token) headers.Authorization = `Bearer ${admin.token}`;
    response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("We couldn't reach the workbench. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || GENERIC_ERROR);
  return data;
}

function isValidEvaluation(evaluation) {
  return (
    evaluation &&
    FIELDS.every(([key]) => typeof evaluation[key] === "string" && evaluation[key].trim() !== "") &&
    evaluation.recommendation in BADGE_CLASS
  );
}

/* Shared components */

function badge(recommendation) {
  return h("span", { class: `badge ${BADGE_CLASS[recommendation] || "badge-low"}` }, recommendation);
}

function stageTag(stage) {
  return h("span", { class: `tag tag-${stage.toLowerCase()}` }, stage);
}

// `approval` is undefined on the generic picture, null when an idea still needs it, or the approval record.
function pipelineCard(currentStage, currentNote, approval) {
  return h(
    "section",
    { class: "card pipeline", "aria-label": "Idea pipeline" },
    h("h2", { class: "card-title" }, "Idea Pipeline"),
    h(
      "ol",
      { class: "stages" },
      STAGES.map((stage) => {
        const current = stage.name === currentStage;
        return h(
          "li",
          { class: `stage stage-${stage.name.toLowerCase()}${current ? " is-current" : ""}` },
          h("span", { class: "stage-dot" }, icon(stage.icon)),
          h("span", { class: "stage-name" }, stage.name),
          h("span", { class: "stage-note" }, current ? currentNote : stage.note),
          stage.name === APPROVAL_FOR &&
            approval !== "none" &&
            h("span", { class: `approval-mark${approval ? " is-approved" : ""}` }, approval ? "Admin approved" : "Needs admin approval")
        );
      })
    )
  );
}

function evaluationCard(evaluation, headExtra) {
  return h(
    "section",
    { class: "card evaluation" },
    h("div", { class: "evaluation-head" }, h("h2", { class: "card-title" }, "Evaluation"), badge(evaluation.recommendation)),
    h(
      "dl",
      { class: "fields" },
      FIELDS.map(([key, label]) =>
        h("div", { class: `field${key === "smallestNextStep" ? " field-next" : ""}` }, h("dt", null, label), h("dd", null, evaluation[key]))
      )
    ),
    headExtra
  );
}

function emptyState(title, text, action) {
  return h("section", { class: "card empty" }, h("h2", { class: "card-title" }, title), h("p", { class: "hint" }, text), action);
}

function statTile(value, label, note) {
  return h(
    "div",
    { class: "card tile-stat" },
    h("span", { class: "stat-label" }, label),
    h("span", { class: "stat-value" }, String(value)),
    note && h("span", { class: "hint" }, note)
  );
}

// A templated idea is listed by its title; a free-text one by its opening words.
function ideaName(idea) {
  return idea.title || idea.suggestion;
}

function ideaRow(idea, href, extra) {
  const name = ideaName(idea);
  const text = name.length > 140 ? `${name.slice(0, 140).trimEnd()}…` : name;
  return h(
    "a",
    { class: "idea-row", href },
    h("span", { class: "idea-row-main" }, h("span", { class: "idea-row-text" }, text), h("span", { class: "hint" }, extra || `Submitted ${formatDate(idea.submittedAt)}`)),
    h("span", { class: "idea-row-meta" }, badge(idea.evaluation.recommendation), stageTag(idea.stage))
  );
}

/* Submit view (static markup in index.html) */

const form = document.getElementById("idea-form");
const input = document.getElementById("suggestion");
const submitBtn = document.getElementById("submit-btn");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const errorText = document.getElementById("error-text");
const evaluationBox = document.getElementById("evaluation");
const submitPipeline = document.getElementById("submit-pipeline");
let pending = false;

function syncSubmit() {
  submitBtn.disabled = pending || input.value.trim() === "";
}

function showSubmitPipeline(note) {
  submitPipeline.replaceChildren(pipelineCard("Problem", note));
}

async function submitIdea() {
  const suggestion = input.value.trim();
  if (!suggestion || pending) return;

  pending = true;
  syncSubmit();
  input.readOnly = true;
  errorBox.hidden = true;
  evaluationBox.replaceChildren();
  loading.hidden = false;

  try {
    const { idea } = await api("/api/ideas", { method: "POST", body: { suggestion, submitterId: getSubmitterId() } });
    if (!isValidEvaluation(idea?.evaluation)) throw new Error("We couldn't evaluate this idea. Please try again.");
    showSubmitPipeline("Your idea is here");
    evaluationBox.replaceChildren(
      evaluationCard(
        idea.evaluation,
        h("p", { class: "saved-note" }, "Saved. ", h("a", { href: `#/my-ideas/${idea.id}` }, "View it in My Ideas"))
      )
    );
    submitPipeline.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    errorText.textContent = error.message;
    errorBox.hidden = false;
  } finally {
    pending = false;
    input.readOnly = false;
    loading.hidden = true;
    syncSubmit();
  }
}

function resetSubmit() {
  if (pending) return;
  form.reset();
  input.style.height = "";
  templateAsk.hidden = true;
  templateError.textContent = "";
  errorBox.hidden = true;
  evaluationBox.replaceChildren();
  showSubmitPipeline("New ideas start here");
  syncSubmit();
  window.scrollTo({ top: 0 });
  input.focus({ preventScroll: true });
}

// Puts the blank template or the filled example in the box, asking first if there is text to lose.
const templateAsk = document.getElementById("template-ask");
const templateError = document.getElementById("template-error");
let pendingTemplate = null;

async function useTemplate(file) {
  templateAsk.hidden = true;
  templateError.textContent = "";
  try {
    const response = await fetch(`/templates/${file}`);
    if (!response.ok) throw new Error();
    input.value = (await response.text()).trim();
    input.style.height = "340px";
    syncSubmit();
    input.focus();
    input.setSelectionRange(0, 0);
    input.scrollTop = 0;
  } catch {
    templateError.textContent = "The template couldn't be loaded.";
  }
}

for (const button of document.querySelectorAll("[data-template]")) {
  button.addEventListener("click", () => {
    if (pending) return;
    if (input.value.trim() === "") return useTemplate(button.dataset.template);
    pendingTemplate = button.dataset.template;
    templateAsk.hidden = false;
  });
}
document.getElementById("template-yes").addEventListener("click", () => useTemplate(pendingTemplate));
document.getElementById("template-no").addEventListener("click", () => (templateAsk.hidden = true));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitIdea();
});
input.addEventListener("input", syncSubmit);
document.getElementById("retry").addEventListener("click", submitIdea);
document.getElementById("new-idea").addEventListener("click", () => {
  if (currentRoute().view === "submit") resetSubmit();
  else {
    resetSubmit();
    location.hash = "#/submit";
  }
});

/* My Ideas */

async function renderMyIdeas() {
  const { ideas } = await api(`/api/ideas?submitterId=${encodeURIComponent(getSubmitterId())}`);
  if (ideas.length === 0) {
    return emptyState(
      "You haven't submitted any ideas yet",
      "Ideas you submit from this browser will appear here with their evaluation and stage.",
      h("a", { class: "btn btn-primary", href: "#/submit" }, "Submit an idea")
    );
  }
  const newestFirst = [...ideas].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return h(
    "section",
    { class: "card list" },
    newestFirst.map((idea) => h("div", { class: "row-with-action" }, ideaRow(idea, `#/my-ideas/${idea.id}`), deleteControl(idea)))
  );
}

// A Delete button that asks once before deleting. Shown only in My Ideas.
function deleteControl(idea) {
  const control = h("span", { class: "delete-control" });
  const ask = () => {
    const message = h("span", { class: "form-message is-error", role: "status" });
    const confirm = h("button", { type: "button", class: "btn btn-danger" }, "Yes, delete");
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      try {
        await api(`/api/ideas/${idea.id}?submitterId=${encodeURIComponent(getSubmitterId())}`, { method: "DELETE" });
        if (location.hash === "#/my-ideas") await route();
        else location.hash = "#/my-ideas";
      } catch (error) {
        message.textContent = error.message;
        confirm.disabled = false;
      }
    });
    control.replaceChildren(
      h("span", { class: "delete-question" }, "Delete this idea for good?"),
      confirm,
      h("button", { type: "button", class: "btn btn-secondary", onclick: reset }, "Cancel"),
      message
    );
  };
  const reset = () => control.replaceChildren(h("button", { type: "button", class: "btn btn-quiet", onclick: ask }, "Delete"));
  reset();
  return control;
}

/* Review Pipeline */

async function renderPipeline() {
  const { ideas } = await api("/api/ideas");
  if (ideas.length === 0) {
    return emptyState(
      "No ideas in the pipeline yet",
      "Submitted ideas start at Problem and move forward as they earn it.",
      h("a", { class: "btn btn-primary", href: "#/submit" }, "Submit an idea")
    );
  }
  return h(
    "div",
    { class: "board" },
    STAGES.map((stage) => {
      const inStage = ideas.filter((idea) => idea.stage === stage.name);
      return h(
        "section",
        { class: `board-column stage-${stage.name.toLowerCase()}` },
        h("h2", { class: "board-head" }, h("span", { class: "board-dot" }), stage.name, h("span", { class: "board-count" }, String(inStage.length))),
        inStage.length === 0
          ? h("p", { class: "hint board-empty" }, "No ideas here yet")
          : inStage.map((idea) =>
              h(
                "a",
                { class: "board-card", href: `#/pipeline/${idea.id}` },
                h("span", { class: "board-card-text" }, ideaName(idea).length > 90 ? `${ideaName(idea).slice(0, 90).trimEnd()}…` : ideaName(idea)),
                h(
                  "span",
                  { class: "board-card-tags" },
                  badge(idea.evaluation.recommendation),
                  idea.analysis && h("span", { class: "badge badge-ai" }, "Analysis"),
                  idea.history.at(-1)?.override && h("span", { class: "badge gate-overridden" }, "Overridden"),
                  idea.stage === APPROVAL_FROM && h("span", { class: `badge ${idea.approval ? "gate-met" : "badge-low"}` }, idea.approval ? "Approved" : "Awaiting approval")
                )
              )
            )
      );
    })
  );
}

/* Idea detail: read-only from My Ideas, with review controls from Review Pipeline and Impact */

async function renderDetail(view, id) {
  const { idea } = await api(`/api/ideas/${encodeURIComponent(id)}`);
  const position = STAGE_NAMES.indexOf(idea.stage);
  const canRecordOutcome = view !== "my-ideas" && OUTCOME_STAGES.includes(idea.stage);

  return h(
    "div",
    { class: "detail" },
    h("a", { class: "back-link", href: `#/${view}` }, `← Back to ${VIEWS[view].title}`),
    h(
      "section",
      { class: "card" },
      h("div", { class: "evaluation-head" }, h("h2", { class: "card-title" }, "Suggestion"), stageTag(idea.stage)),
      idea.title && h("p", { class: "idea-title" }, idea.title),
      h("p", { class: "suggestion-text" }, idea.suggestion),
      h("p", { class: "hint" }, `Submitted ${formatDate(idea.submittedAt)}`),
      idea.supplied && suppliedRow(idea.supplied),
      view === "my-ideas" && idea.submitterId === getSubmitterId() && h("div", { class: "form-row" }, h("span"), deleteControl(idea))
    ),
    // An idea that reached Investment before approvals existed has none to show; leave the mark off.
    pipelineCard(idea.stage, "This idea is here", idea.approval ?? (idea.stage === APPROVAL_FOR ? "none" : null)),
    approvalCard(view, idea),
    view === "pipeline" && moveForm(idea, position),
    evaluationCard(idea.evaluation),
    architectureSection(view, idea),
    canRecordOutcome ? outcomeForm(idea) : idea.outcome && outcomeSummary(idea.outcome),
    historyCard(idea)
  );
}

// The approval step in front of Investment. The button is shown to everyone so the step is visible;
// the server decides who may actually approve.
function approvalCard(view, idea) {
  const approved = idea.approval;
  if (idea.stage !== APPROVAL_FROM && !approved) return null;
  const approve = async (button) => {
    if (!admin.token) return toast("Only admins can approve an idea. Sign in as admin first.");
    button.disabled = true;
    try {
      await api(`/api/ideas/${idea.id}/approval`, { method: "POST", body: { submitterId: getSubmitterId() } });
      toast(`Approved for ${APPROVAL_FOR}.`);
      await route();
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    }
  };
  return h(
    "section",
    { class: "card approval" },
    h(
      "div",
      { class: "evaluation-head" },
      h("h2", { class: "card-title" }, "Investment approval"),
      h("span", { class: `badge ${approved ? "gate-met" : "gate-overridden"}` }, approved ? "Approved" : "Awaiting approval")
    ),
    approved
      ? h("p", null, `Approved for ${APPROVAL_FOR} by ${approved.by} on ${formatDate(approved.at)}.`)
      : h("p", null, `An admin must approve this idea before it can move to ${APPROVAL_FOR}. The approver cannot be the person who submitted it.`),
    !approved &&
      view === "pipeline" &&
      h(
        "div",
        { class: "form-row" },
        h("span", { class: "hint" }, admin.token ? `Signed in as admin: ${admin.name}` : "You are not signed in as admin."),
        h("button", { type: "button", class: "btn btn-primary", id: "approve-btn", onclick: (event) => approve(event.currentTarget) }, `Approve for ${APPROVAL_FOR}`)
      )
  );
}

// For a templated idea: which stage moves already have their information.
function suppliedRow(supplied) {
  return h(
    "div",
    { class: "supplied" },
    h("span", { class: "gate-label" }, "Supplied in the template"),
    h(
      "span",
      { class: "supplied-tags" },
      supplied.map(({ stage, supplied: has }) => h("span", { class: `tag tag-${stage.toLowerCase()}${has ? "" : " is-missing"}` }, `${stage}: ${has ? "supplied" : "not supplied"}`))
    )
  );
}

// Draws itself from the idea and, while an analysis is running, polls until it finishes.
// Only this section is redrawn, so a note being typed elsewhere on the page is not lost.
function architectureSection(view, idea) {
  const container = h("div", { class: "architecture" });
  const canRun = view === "pipeline";

  const run = async (button, message) => {
    button.disabled = true;
    try {
      draw((await api(`/api/ideas/${idea.id}/analysis`, { method: "POST" })).idea);
    } catch (error) {
      message.textContent = error.message;
      message.className = "form-message is-error";
      button.disabled = false;
    }
  };

  const runRow = (label) => {
    const message = h("span", { class: "hint form-message", role: "status" });
    const button = h("button", { type: "button", class: "btn btn-secondary", onclick: () => run(button, message) }, label);
    return h("div", { class: "form-row" }, message, button);
  };

  const poll = async () => {
    if (!container.isConnected) return;
    try {
      draw((await api(`/api/ideas/${idea.id}`)).idea);
    } catch {
      setTimeout(poll, 4000);
    }
  };

  function draw(current) {
    const { analysis, analysisStatus: status } = current;
    const eligible = STAGE_NAMES.indexOf(current.stage) >= ANALYSIS_STAGE_INDEX;
    const parts = [];

    if (status === "running") {
      parts.push(
        h(
          "section",
          { class: "card notice", "aria-live": "polite" },
          h("span", { class: "spinner", "aria-hidden": "true" }),
          h("p", null, analysis ? "Producing a new analysis…" : "Producing an analysis for this idea…")
        )
      );
      setTimeout(poll, 2000);
    }
    if (status === "failed") {
      parts.push(
        h(
          "section",
          { class: "card notice notice-error", role: "alert" },
          h("p", null, current.analysisError || GENERIC_ERROR),
          canRun && eligible && h("button", { type: "button", class: "btn btn-quiet", onclick: (event) => run(event.currentTarget, event.currentTarget.previousSibling) }, "Try again")
        )
      );
    }
    if (analysis) {
      // Analyses stored before the evidence-led format have no recommendation.
      const card = analysis.recommendation ? analysisCard : legacyArchitectureCard;
      parts.push(card(analysis, canRun && eligible && status !== "running" && runRow("Run the analysis again")));
    } else if (status === "none" && eligible && canRun) {
      parts.push(
        h(
          "section",
          { class: "card" },
          h("h2", { class: "card-title" }, "Analysis"),
          h("p", { class: "hint" }, "No analysis has been produced for this idea yet."),
          runRow("Run the analysis")
        )
      );
    }
    container.replaceChildren(...parts);
  }

  draw(idea);
  return container;
}

const INVESTMENT_TRIGGER = "Build only if evidence shows the next increment will produce enough measurable value to justify its cost and operational burden.";

const RECOMMENDATION_CLASS = {
  "Do not build yet": "verdict-hold",
  "Change the process first": "verdict-process",
  "Build the smallest next step": "verdict-build",
};

function analysisCard(analysis, footer) {
  const { evidence, ifJustified } = analysis;
  const bullets = (items) => h("ul", { class: "plain-list" }, items.map((item) => h("li", null, item)));
  const group = (label, hint, items) =>
    h("div", { class: "field" }, h("dt", null, label), h("dd", null, h("p", { class: "hint" }, hint), items.length ? bullets(items) : h("p", { class: "none" }, "Nothing in this group.")));

  return h(
    "section",
    { class: "card evaluation" },
    h("div", { class: "evaluation-head" }, h("h2", { class: "card-title" }, "Analysis"), h("span", { class: "badge badge-ai" }, "AI-generated suggestion")),
    h("p", { class: "hint ai-note" }, `Produced ${formatDate(analysis.generatedAt)} from this idea's suggestion, evaluation, and reviewer notes. Check it with the people who would act on it.`),
    h(
      "div",
      { class: `verdict ${RECOMMENDATION_CLASS[analysis.recommendation] || "verdict-hold"}` },
      h("span", { class: "verdict-label" }, "Recommendation"),
      h("strong", { class: "verdict-text" }, analysis.recommendation),
      h("p", { class: "verdict-move" }, h("strong", null, "Smallest next move: "), analysis.nextMove),
      h("p", null, analysis.reason)
    ),
    h(
      "div",
      { class: "trigger" },
      h("p", null, h("strong", null, "Investment trigger: "), INVESTMENT_TRIGGER),
      h("p", null, h("strong", null, "For this idea, that means: "), analysis.buildTrigger)
    ),
    h("h3", { class: "sub-title" }, "What the evidence says"),
    h(
      "dl",
      { class: "fields fields-three" },
      group("Known", "Measured or directly observed.", evidence.known),
      group("Reported but unverified", "Stated without saying how it was measured.", evidence.reportedUnverified),
      group("Inferred", "The analysis's own reading.", evidence.inferred)
    ),
    h(
      "div",
      { class: "conditional" },
      h("h3", { class: "sub-title" }, "If automation is justified…"),
      h("p", null, h("strong", null, `${ifJustified.pattern}. `), ifJustified.summary),
      h("ul", { class: "plain-list" }, ifJustified.components.map((part) => h("li", null, h("strong", null, `${part.name}: `), part.responsibility))),
      h("p", null, h("strong", null, "It would touch: "), ifJustified.dataAndSystems)
    ),
    h("h3", { class: "sub-title" }, "Risks"),
    analysis.risks.length ? bullets(analysis.risks) : h("p", { class: "none" }, "None identified."),
    footer
  );
}

// The V3 layout, kept so analyses stored before the evidence-led format still display.
function legacyArchitectureCard(analysis, footer) {
  const block = (label, body, extraClass) => h("div", { class: `field${extraClass ? ` ${extraClass}` : ""}` }, h("dt", null, label), h("dd", null, body));
  const bullets = (items) => h("ul", { class: "plain-list" }, items.map((item) => h("li", null, item)));
  return h(
    "section",
    { class: "card evaluation" },
    h("div", { class: "evaluation-head" }, h("h2", { class: "card-title" }, "Potential architecture"), h("span", { class: "badge badge-ai" }, "AI-generated suggestion")),
    h("p", { class: "hint ai-note" }, `Produced ${formatDate(analysis.generatedAt)}, before the evidence-led format. Run the analysis again from Review Pipeline to update it.`),
    h(
      "dl",
      { class: "fields" },
      block("Proposed pattern", [h("strong", { class: "pattern-name" }, analysis.pattern), h("p", null, analysis.summary)], "field-next"),
      block("Why it fits", analysis.whyItFits, "field-wide"),
      block(
        "Main parts",
        h("ul", { class: "plain-list" }, analysis.components.map((part) => h("li", null, h("strong", null, `${part.name}: `), part.responsibility))),
        "field-wide"
      ),
      block("Data and systems it would touch", analysis.dataAndIntegrations),
      block("A simpler alternative", analysis.simplerAlternative),
      block("Assumptions", bullets(analysis.assumptions)),
      block("Risks", analysis.risks.length ? bullets(analysis.risks) : "None identified."),
      block("Smallest first prototype", analysis.firstPrototype, "field-wide")
    ),
    footer
  );
}

// Moves made before the evidence gate have no check recorded and get no tag.
function gateTag(entry) {
  if (!entry.gate) return null;
  if (entry.override) {
    return h("span", { class: "badge gate-overridden" }, entry.gate.verdict === "Not checked" ? "Not checked, moved anyway" : "Overridden");
  }
  return h("span", { class: "badge gate-met" }, "Met the bar");
}

function historyCard(idea) {
  return h(
    "section",
    { class: "card" },
    h("h2", { class: "card-title" }, "Stage history"),
    idea.history.length === 0
      ? h("p", { class: "hint" }, "This idea has not moved from Problem yet.")
      : h(
          "ol",
          { class: "history" },
          idea.history.map((entry) =>
            h(
              "li",
              null,
              h("span", { class: "history-move" }, `${entry.from} → ${entry.to}`),
              h("span", { class: "hint" }, formatDate(entry.at)),
              gateTag(entry),
              h("p", null, entry.note),
              entry.override && h("p", null, h("strong", null, "Moved anyway because: "), entry.override),
              entry.gate && entry.gate.verdict !== "Not checked" && h("div", { class: "history-gate" }, h("p", { class: "hint" }, entry.gate.reason), gateEvidence(entry.gate))
            )
          )
        )
  );
}

function outcomeSummary(outcome) {
  return h(
    "section",
    { class: "card" },
    h("h2", { class: "card-title" }, "Outcome"),
    h("p", { class: "suggestion-text" }, outcome.description),
    h("p", { class: "hint" }, `Reviewer estimate: ${formatHours(outcome.hoursSavedPerWeek)} hours saved per week`)
  );
}

// Runs a save, then redraws the current view so every figure reflects it.
async function saveAndRefresh(formEl, messageEl, request) {
  const buttons = formEl.querySelectorAll("button");
  buttons.forEach((button) => (button.disabled = true));
  messageEl.textContent = "Saving…";
  messageEl.className = "hint form-message";
  try {
    await request();
    await route();
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.className = "form-message is-error";
    buttons.forEach((button) => (button.disabled = false));
  }
}

function gateEvidence(gate) {
  const list = (label, items) => items.length > 0 && h("div", null, h("p", { class: "gate-label" }, label), h("ul", { class: "plain-list" }, items.map((item) => h("li", null, item))));
  return [list("Counts as evidence", gate.known), list("Does not count", gate.unverified)];
}

function moveForm(idea, position) {
  const note = h("textarea", { id: "move-note", rows: 2, maxLength: 500, placeholder: "What has been measured or observed since the last stage?" });
  const message = h("span", { class: "hint form-message", role: "status" });
  const result = h("div", { class: "gate-result", "aria-live": "polite" });
  const formEl = h("form", { class: "card review-form", novalidate: "" });
  const next = idea.nextGate;
  const prefilled = next?.suggestedNote ?? "";
  note.value = prefilled;
  if (prefilled) note.rows = 5;

  const setBusy = (busy, text) => {
    formEl.querySelectorAll("button").forEach((button) => (button.disabled = busy));
    note.readOnly = busy;
    message.textContent = text || "";
    message.className = "hint form-message";
  };
  const fail = (text) => {
    setBusy(false);
    message.textContent = text;
    message.className = "form-message is-error";
  };

  const send = async (direction, overrideReason) => {
    if (note.value.trim() === "") {
      fail("Add a short note saying why before moving the idea.");
      note.focus();
      return;
    }
    if (direction === "forward" && next.to === APPROVAL_FOR && !idea.approval) {
      toast(`This idea needs admin approval before it can move to ${APPROVAL_FOR}.`);
      return;
    }
    // The template's text belongs to the forward move; a move back needs its own note.
    if (direction === "back" && prefilled && note.value.trim() === prefilled) {
      fail("Type a note saying why this idea is moving back.");
      note.focus();
      return;
    }
    setBusy(true, direction === "forward" && !overrideReason ? "Checking the evidence…" : "Saving…");
    try {
      const body = { direction, note: note.value.trim() };
      if (overrideReason) body.overrideReason = overrideReason;
      const response = await api(`/api/ideas/${idea.id}/stage`, { method: "POST", body });
      if (response.moved) return await route();
      setBusy(false);
      showNotMoved(response);
    } catch (error) {
      fail(error.message);
    }
  };

  // The idea was not moved: say why, and offer moving anyway with a reason.
  function showNotMoved({ gate, checkError }) {
    const reason = h("textarea", { id: "override-reason", rows: 2, maxLength: 500, placeholder: "Why move it without meeting the bar?" });
    const overrideMessage = h("span", { class: "form-message is-error", role: "status" });
    const moveAnyway = () => {
      if (reason.value.trim() === "") {
        overrideMessage.textContent = "Give a reason to move it anyway. It is kept in the idea's history.";
        reason.focus();
        return;
      }
      send("forward", reason.value.trim());
    };
    result.replaceChildren(
      h(
        "div",
        { class: "gate-panel gate-not-yet", role: "alert" },
        h("strong", { class: "gate-verdict" }, gate ? `Not yet: this does not meet the bar for ${next.to}` : "The evidence could not be checked"),
        h("p", null, gate ? gate.reason : `${checkError} You can try again, or move the idea anyway with a reason.`),
        gate && h("p", null, h("strong", null, "What's missing: "), gate.missing),
        gate && gateEvidence(gate),
        h("p", { class: "hint" }, "Improve the note above and move again, or:"),
        h("label", { class: "gate-label", for: "override-reason" }, "Move anyway, with a reason"),
        reason,
        h("div", { class: "form-row" }, overrideMessage, h("button", { type: "button", class: "btn btn-secondary", onclick: moveAnyway }, `Move to ${next.to} anyway`))
      )
    );
  }

  formEl.append(
    h("h2", { class: "card-title" }, "Move this idea"),
    next && h("p", { class: "gate-bar" }, h("strong", null, `To move to ${next.to}: `), next.bar),
    h("label", { class: "prompt", for: "move-note" }, "A short note is required and is kept in the idea's history."),
    note,
    prefilled &&
      h(
        "p",
        { class: "hint prefill-note" },
        `Filled in from the template's "${next.suggestedFrom}" section. Use it, edit it, or replace it.`,
        next.suggestedShortened && " It was shortened to fit the 500-character limit."
      ),
    h(
      "div",
      { class: "form-row" },
      message,
      h(
        "span",
        { class: "button-group" },
        position > 0 && h("button", { type: "button", class: "btn btn-secondary", onclick: () => send("back") }, `← Back to ${STAGE_NAMES[position - 1]}`),
        next && h("button", { type: "button", class: "btn btn-primary", onclick: () => send("forward") }, `Move to ${next.to} →`)
      )
    ),
    result
  );
  formEl.addEventListener("submit", (event) => event.preventDefault());
  return formEl;
}

function outcomeForm(idea) {
  const description = h("textarea", { id: "outcome-description", rows: 2, maxLength: 500, placeholder: "What has this idea led to?" });
  const offered = idea.suggestedOutcome;
  description.value = idea.outcome?.description ?? offered?.description ?? "";
  const hours = h("input", { id: "outcome-hours", type: "number", min: "0", step: "0.5", inputMode: "decimal" });
  hours.value = idea.outcome ? String(idea.outcome.hoursSavedPerWeek) : offered?.hoursSavedPerWeek != null ? String(offered.hoursSavedPerWeek) : "";
  const message = h("span", { class: "hint form-message", role: "status" });

  const formEl = h(
    "form",
    { class: "card review-form", novalidate: "" },
    h("h2", { class: "card-title" }, "Outcome"),
    h("label", { class: "prompt", for: "outcome-description" }, "Describe the result so far."),
    description,
    h("label", { class: "prompt", for: "outcome-hours" }, "Estimated hours saved per week (your estimate)"),
    hours,
    offered &&
      h(
        "p",
        { class: "hint prefill-note" },
        "Filled in from the template. Nothing is recorded until you save.",
        offered.shortened && " The description was shortened to fit the 500-character limit."
      ),
    h("div", { class: "form-row" }, message, h("button", { type: "submit", class: "btn btn-primary" }, idea.outcome ? "Update outcome" : "Record outcome"))
  );

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number(hours.value);
    if (description.value.trim() === "" || hours.value.trim() === "" || !Number.isFinite(value) || value < 0) {
      message.textContent = "Add a description and an estimate of zero or more hours.";
      message.className = "form-message is-error";
      return;
    }
    saveAndRefresh(formEl, message, () =>
      api(`/api/ideas/${idea.id}/outcome`, { method: "PUT", body: { description: description.value.trim(), hoursSavedPerWeek: value } })
    );
  });
  return formEl;
}

/* Analytics */

function barList(title, rows) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return h(
    "section",
    { class: "card" },
    h("h2", { class: "card-title" }, title),
    h(
      "ul",
      { class: "bars" },
      rows.map((row) =>
        h(
          "li",
          { title: `${row.label}: ${plural(row.count, "idea")}` },
          h("span", { class: "bar-label" }, row.label),
          h("span", { class: "bar-track" }, h("span", { class: "bar-fill", style: `width: ${(row.count / max) * 100}%` })),
          h("span", { class: "bar-value" }, String(row.count))
        )
      )
    )
  );
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function submissionsChart(ideas) {
  const counts = new Map();
  for (const idea of ideas) {
    const key = dayKey(new Date(idea.submittedAt));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // One column per day, from the first submission (at most 30 days back) to today.
  const today = new Date();
  const first = new Date(Math.min(...ideas.map((idea) => new Date(idea.submittedAt))));
  const days = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    if (dayKey(day) >= dayKey(first)) days.push(day);
  }
  const max = Math.max(1, ...days.map((day) => counts.get(dayKey(day)) || 0));
  const label = (day) => day.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return h(
    "section",
    { class: "card" },
    h("h2", { class: "card-title" }, "Submissions over time"),
    h("p", { class: "hint" }, `Ideas submitted per day. The busiest day had ${max}.`),
    h(
      "div",
      { class: "columns-chart", role: "img", "aria-label": `Ideas submitted per day from ${label(days[0])} to ${label(days.at(-1))}` },
      days.map((day) => {
        const count = counts.get(dayKey(day)) || 0;
        return h(
          "div",
          { class: "column-slot", title: `${label(day)}: ${plural(count, "idea")}` },
          h("span", { class: "column-value" }, count > 0 ? String(count) : ""),
          h("span", { class: "column-bar", style: `height: ${(count / max) * 100}%` })
        );
      })
    ),
    h("div", { class: "chart-axis hint" }, h("span", null, label(days[0])), days.length > 1 && h("span", null, label(days.at(-1))))
  );
}

async function renderAnalytics() {
  const { ideas } = await api("/api/ideas");
  if (ideas.length === 0) {
    return emptyState(
      "Nothing to analyse yet",
      "Counts and charts appear here once ideas have been submitted.",
      h("a", { class: "btn btn-primary", href: "#/submit" }, "Submit an idea")
    );
  }
  const count = (test) => ideas.filter(test).length;
  return h(
    "div",
    { class: "stack" },
    h(
      "div",
      { class: "tiles" },
      statTile(ideas.length, "Ideas submitted"),
      statTile(count((idea) => idea.stage !== "Problem"), "Moved beyond Problem"),
      statTile(count((idea) => idea.evaluation.recommendation === "Strong Candidate"), "Strong candidates")
    ),
    h(
      "div",
      { class: "two-up" },
      barList("Ideas per stage", STAGE_NAMES.map((stage) => ({ label: stage, count: count((idea) => idea.stage === stage) }))),
      barList(
        "Ideas per recommendation",
        Object.keys(BADGE_CLASS).map((recommendation) => ({
          label: recommendation,
          count: count((idea) => idea.evaluation.recommendation === recommendation),
        }))
      )
    ),
    submissionsChart(ideas)
  );
}

/* Impact */

async function renderImpact() {
  const { ideas } = await api("/api/ideas");
  const advanced = ideas.filter((idea) => OUTCOME_STAGES.includes(idea.stage));
  if (advanced.length === 0) {
    return emptyState(
      "No ideas have reached Pilot yet",
      "Ideas appear here once they reach Pilot or Investment, and a reviewer can then record what they led to.",
      h("a", { class: "btn btn-primary", href: "#/pipeline" }, "Open Review Pipeline")
    );
  }
  const withOutcome = advanced.filter((idea) => idea.outcome);
  const totalHours = withOutcome.reduce((sum, idea) => sum + idea.outcome.hoursSavedPerWeek, 0);
  return h(
    "div",
    { class: "stack" },
    h(
      "div",
      { class: "tiles" },
      statTile(advanced.filter((idea) => idea.stage === "Pilot").length, "Ideas at Pilot"),
      statTile(advanced.filter((idea) => idea.stage === "Investment").length, "Ideas at Investment"),
      statTile(
        formatHours(totalHours),
        "Estimated hours saved per week",
        `Reviewer estimates from ${plural(withOutcome.length, "recorded outcome")}`
      )
    ),
    h(
      "section",
      { class: "card list" },
      advanced.map((idea) =>
        ideaRow(
          idea,
          `#/impact/${idea.id}`,
          idea.outcome
            ? `${idea.outcome.description} · Reviewer estimate: ${formatHours(idea.outcome.hoursSavedPerWeek)} hours per week`
            : "No outcome recorded yet"
        )
      )
    )
  );
}

/* Admin sign-in */

function drawAdminArea() {
  const area = document.getElementById("admin-area");
  if (admin.token) {
    area.replaceChildren(
      h("span", { class: "admin-who" }, h("strong", null, "Admin: "), admin.name),
      h(
        "button",
        {
          type: "button",
          class: "admin-link",
          id: "admin-sign-out",
          onclick: async () => {
            await api("/api/admin/logout", { method: "POST" }).catch(() => {});
            setAdmin(null, null);
            route();
          },
        },
        "Sign out"
      )
    );
  } else {
    area.replaceChildren(h("button", { type: "button", class: "admin-link", id: "admin-sign-in", onclick: openAdminDialog }, "Admin sign-in"));
  }
}

function openAdminDialog() {
  const name = h("input", { id: "admin-name", type: "text", maxLength: 60, autocomplete: "name" });
  const passcode = h("input", { id: "admin-passcode", type: "password", autocomplete: "off" });
  const message = h("p", { class: "form-message is-error", role: "status" });
  const dialog = h("dialog", { class: "admin-dialog" });
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  const formEl = h(
    "form",
    { novalidate: "" },
    h("h2", { class: "card-title" }, "Admin sign-in"),
    h("p", { class: "hint" }, "Admins can approve ideas for Investment. This is a prototype sign-in with one shared passcode."),
    h("label", { class: "prompt", for: "admin-name" }, "Your name"),
    name,
    h("label", { class: "prompt", for: "admin-passcode" }, "Admin passcode"),
    passcode,
    message,
    h(
      "div",
      { class: "form-row" },
      h("button", { type: "button", class: "btn btn-secondary", onclick: close }, "Cancel"),
      h("button", { type: "submit", class: "btn btn-primary" }, "Sign in")
    )
  );
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (name.value.trim() === "" || passcode.value === "") {
      message.textContent = "Enter your name and the admin passcode.";
      return;
    }
    try {
      const result = await api("/api/admin/login", { method: "POST", body: { name: name.value.trim(), passcode: passcode.value } });
      close();
      setAdmin(result.token, result.name);
      toast(`Signed in as admin: ${result.name}`);
      route();
    } catch (error) {
      message.textContent = error.message;
      passcode.value = "";
    }
  });
  dialog.append(formEl);
  dialog.addEventListener("cancel", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  name.focus();
}

// A sign-in kept from before a server restart is no longer valid; drop it quietly.
async function restoreAdmin() {
  drawAdminArea();
  if (!admin.token) return;
  try {
    const response = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${admin.token}` } });
    await response.text();
    if (response.status === 401) {
      setAdmin(null, null);
      route();
    }
  } catch {
    // Leave it; the next request will say if the workbench is unreachable.
  }
}

/* Router */

const submitView = document.getElementById("view-submit");
const dynamicView = document.getElementById("view-dynamic");
let routeToken = 0;

function currentRoute() {
  const [view, id] = location.hash.replace(/^#\/?/, "").split("/");
  return view in VIEWS ? { view, id } : { view: "submit" };
}

async function route() {
  const { view, id } = currentRoute();
  const token = (routeToken += 1);

  document.getElementById("view-title").textContent = VIEWS[view].title;
  document.getElementById("view-lede").textContent = VIEWS[view].lede;
  document.title = view === "submit" ? "Ideas Workbench" : `${VIEWS[view].title} · Ideas Workbench`;
  for (const item of document.querySelectorAll(".nav-item")) {
    const active = item.dataset.view === view;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }

  submitView.hidden = view !== "submit";
  dynamicView.hidden = view === "submit";
  if (view === "submit") return;

  // Keep the previous content in place when the same view is redrawn after a save.
  if (dynamicView.dataset.route !== location.hash) {
    dynamicView.replaceChildren(h("section", { class: "card notice" }, h("span", { class: "spinner", "aria-hidden": "true" }), h("p", null, "Loading…")));
  }
  try {
    const content = id ? await renderDetail(view, id) : await VIEWS[view].render();
    if (token !== routeToken) return;
    dynamicView.replaceChildren(content);
    dynamicView.dataset.route = location.hash;
  } catch (error) {
    if (token !== routeToken) return;
    dynamicView.dataset.route = "";
    dynamicView.replaceChildren(
      h(
        "section",
        { class: "card notice notice-error", role: "alert" },
        h("p", null, error.message),
        h("button", { type: "button", class: "btn btn-quiet", onclick: route }, "Try again")
      )
    );
  }
}

window.addEventListener("hashchange", () => {
  window.scrollTo({ top: 0 });
  route();
});
showSubmitPipeline("New ideas start here");
syncSubmit();
restoreAdmin();
route();
