import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

try {
  process.loadEnvFile();
} catch {
  // No .env file; rely on the process environment.
}

const PORT = Number(process.env.PORT) || 3210;
// Local only by default: there is no sign-in, so anyone who can reach the port can read every idea.
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const MAX_SUGGESTION_CHARS = 4000;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_NOTE_CHARS = 500;
// IDEAS_FILE lets a test run use a throwaway store instead of the real one.
const DATA_FILE = process.env.IDEAS_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "ideas.json");
const STAGES = ["Problem", "Evidence", "Prototype", "Pilot", "Investment"];
const OUTCOME_STAGES = ["Pilot", "Investment"];
// Moving an idea into this stage is the approval that triggers the analysis.
const ANALYSIS_STAGE = "Prototype";

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const STATIC_FILES = {
  "/": [PUBLIC_DIR, "index.html", "text/html; charset=utf-8"],
  "/styles.css": [PUBLIC_DIR, "styles.css", "text/css; charset=utf-8"],
  "/app.js": [PUBLIC_DIR, "app.js", "text/javascript; charset=utf-8"],
  // The same files a person can open and copy by hand; there is one source for the template text.
  "/templates/idea-template.txt": [TEMPLATES_DIR, "idea-template.txt", "text/plain; charset=utf-8"],
  "/templates/example-idea.txt": [TEMPLATES_DIR, "example-idea.txt", "text/plain; charset=utf-8"],
};

// The idea template: each section is its name and a colon on a line of its own.
const TEMPLATE_SECTIONS = [
  ["title", "Title"],
  ["problem", "Problem"],
  ["whoItAffects", "Who it affects"],
  ["evidence", "Evidence"],
  ["whyPrototype", "Why it is worth prototyping"],
  ["prototype", "Prototype"],
  ["pilot", "Pilot"],
  ["outcome", "Outcome"],
  ["hoursSavedPerWeek", "Hours saved per week"],
];
// The section that supplies the note for the move into each stage.
const SECTION_FOR_STAGE = { Evidence: "evidence", Prototype: "whyPrototype", Pilot: "prototype", Investment: "pilot" };
const SECTION_LABEL = Object.fromEntries(TEMPLATE_SECTIONS);

// Returns the sections found, or null when the text is not in the template's form.
// Fixed rules only: a submission is templated when it has a "Problem:" line.
function parseTemplate(text) {
  const keyByHeading = new Map(TEMPLATE_SECTIONS.map(([key, label]) => [`${label.toLowerCase()}:`, key]));
  const found = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const key = keyByHeading.get(line.trim().toLowerCase());
    if (key) {
      current = key;
      found[key] ??= [];
    } else if (current) {
      found[current].push(line);
    }
  }
  if (!("problem" in found)) return null;
  const sections = {};
  for (const [key] of TEMPLATE_SECTIONS) {
    const content = (found[key] ?? []).join("\n").trim();
    // A section still holding only its [bracketed prompt] counts as empty.
    sections[key] = content === "" || /^\[[^\]]*\]$/.test(content) ? null : content;
  }
  return sections;
}

function shorten(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

const Evaluation = z.object({
  problem: z.string(),
  whoItAffects: z.string(),
  potentialValue: z.string(),
  missingEvidence: z.string(),
  smallestNextStep: z.string(),
  recommendation: z.enum([
    "Strong Candidate",
    "Worth Exploring",
    "Needs More Evidence",
    "Low Value / Unclear",
  ]),
});

const Analysis = z.object({
  recommendation: z.enum(["Do not build yet", "Change the process first", "Build the smallest next step"]),
  nextMove: z.string(),
  reason: z.string(),
  evidence: z.object({
    known: z.array(z.string()),
    reportedUnverified: z.array(z.string()),
    inferred: z.array(z.string()),
  }),
  buildTrigger: z.string(),
  ifJustified: z.object({
    pattern: z.string(),
    summary: z.string(),
    components: z.array(z.object({ name: z.string(), responsibility: z.string() })),
    dataAndSystems: z.string(),
  }),
  risks: z.array(z.string()),
});

// The bar an idea must meet to move into each stage. Fixed text, shown to the reviewer.
const GATE_BARS = {
  Evidence: "Something about the problem has been measured or counted, not only asserted.",
  Prototype: "The measurements show the problem is big enough to be worth a small test.",
  Pilot: "A small test has been run and its result is recorded.",
  Investment: "Real users tried it over a stated period and the measured result is recorded.",
};

const Gate = z.object({
  verdict: z.enum(["Meets the bar", "Not yet"]),
  reason: z.string(),
  known: z.array(z.string()),
  unverified: z.array(z.string()),
  missing: z.string(),
});

const GATE_PROMPT = `You check whether an employee idea has earned a move to the next stage of a pipeline: Problem, Evidence, Prototype, Pilot, Investment.

Each move has a bar. Moving along the pipeline should mean stronger evidence, not more enthusiasm. A reviewer wants to move an idea forward and has written a note. Judge whether what is recorded meets the bar for this move.

You are given the idea's record (the employee's suggestion, an earlier evaluation, earlier reviewer notes, and any outcome), the proposed move, the bar for it, and the reviewer's new note. That is all you know.

What counts:
- Only measured, counted, or directly observed facts count as evidence: a number with what it measures, a sample, a duration, a recorded result.
- Evidence anywhere in the record counts, not only in the new note. The note does not have to repeat what the suggestion or an earlier note already established.
- Approval, opinion, enthusiasm, seniority, and intention are not evidence. "Approved", "looks good", "management wants this", and "we will build it" establish nothing.
- The earlier evaluation is commentary, not evidence.
- If a note is unclear or garbled, quote it as written under unverified. Do not interpret it into a fact.

Fill in:
- verdict: "Meets the bar" if the recorded evidence meets the bar for this move, otherwise "Not yet".
- reason: why, in one or two plain sentences.
- known: the recorded evidence your verdict rests on. Each item is one short sentence that says where it comes from (the suggestion, a named stage note, the new note, or the outcome). Empty if there is none.
- unverified: claims in the new note or the record that do not count, quoted as written. Empty if there are none.
- missing: when the verdict is "Not yet", the one thing to go and get, said concretely enough to act on. One or two sentences, not a list. Leave it empty when the bar is met.

Be neither a pushover nor a nag. If the bar is plainly met, say so and do not ask for more. If it is not, ask for the single most useful thing. Judge this move only, not the stages after it.
Do not invent facts. Keep every field short.`;

const ANALYSIS_PROMPT = `You advise on the smallest next move for an employee idea that has been approved to move toward prototyping.

Your job is not to design a solution. It is to say what the evidence justifies doing next, and whether anything needs to be built at all. Do not architect the imagined solution; architect the smallest next move the evidence justifies. Moving along the pipeline should mean stronger evidence, not bigger software.

You are given everything recorded about the idea: the employee's original suggestion, an earlier evaluation, the reviewers' notes from each stage move, and an outcome if one was recorded. That is all you know. You have no knowledge of the organisation's systems, teams, budgets, or tools beyond what those records say.

Your reader is a business reviewer. Write in plain language, in short sentences.

First sort the evidence. Each item is one short sentence that says where it comes from (the suggestion, a named stage note, or the outcome).
- evidence.known: facts the records state with a measurement, a count, a sample, or a direct observation.
- evidence.reportedUnverified: claims the records make without saying how they were measured or what they refer to. This includes unclear or garbled reviewer notes, a technology that is named but not described, and money or savings figures with no backing. Quote an unclear note as written; do not interpret it into a fact.
- evidence.inferred: what you yourself are guessing or reading between the lines.
Use an empty list where there is nothing to put in a group. Do not list the same item twice.

Then decide.
- recommendation: "Do not build yet" when the next step should be to measure or verify something; "Change the process first" when a change with no new software is the obvious next thing to try; "Build the smallest next step" only when known evidence shows a process change will not be enough.
- nextMove: the smallest next move the evidence justifies, concrete enough to start this week. Say exactly what to measure, change, or build, and with whom.
- reason: why that is the right move, in two or three sentences that point at the known evidence.
- buildTrigger: the specific, measurable evidence that would justify building something for this idea.

Then, briefly and conditionally, describe what could be built if that trigger were met.
- ifJustified.pattern: a short plain-language name for the solution shape.
- ifJustified.summary: what it would do, in one or two sentences.
- ifJustified.components: two to four main parts, each with a name and a one-sentence responsibility.
- ifJustified.dataAndSystems: what it would need to touch, as far as the known evidence reveals. Say plainly what is not known.

- risks: up to three things that could make your recommendation the wrong call.

Only known evidence carries weight. Base the recommendation, the reason, and the conditional design on known items. If a sentence leans on an unverified or inferred item, say so in that sentence.
Do not invent systems, vendors, team names, costs, or timelines. Do not reach for AI by default.
Keep it short: about 300 words across all fields, readable in a minute.`;

const SYSTEM_PROMPT = `You evaluate employee suggestions for an internal ideas workbench.

An employee has described a workplace problem, improvement idea, or opportunity in their own words. They are not expected to propose a solution or a technology. Assess what they wrote so a reviewer can decide whether it deserves further investigation.

Fill in each field in one to three short, plain sentences:
- problem: what appears to be happening.
- whoItAffects: who experiences the problem.
- potentialValue: why solving it might matter.
- missingEvidence: what would need to be proven before anyone invests in it.
- smallestNextStep: the cheapest practical way to investigate or test the idea.
- recommendation: "Strong Candidate" when the problem is concrete and the value is evident from what was written; "Worth Exploring" when it is plausible and a cheap check would settle it; "Needs More Evidence" when the claim is plausible but key facts are missing; "Low Value / Unclear" when the text does not describe a real workplace problem or the benefit is negligible.

The employee may have written the suggestion as a filled-in form with sections such as Evidence, Prototype, and Pilot. Treat what those sections report as part of what the employee wrote: do not list as missing anything they already supply, and say only what is still unknown.

Base the assessment only on what the employee wrote. Do not invent numbers, names, or systems. When something is unknown, say so in missingEvidence. Do not prescribe AI or any particular technology as the solution.`;

// A failure the browser is allowed to see.
class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Analysis runs that are in progress or failed, by idea id. Not persisted:
// after a restart an unfinished run is simply absent and can be started again.
const analysisRuns = new Map();

// The last "Not yet" result per idea, so moving anyway records the result the reviewer was shown
// instead of running the check again. Also marks ideas with a check in progress.
const gateResults = new Map();
const gateRuns = new Set();

function present(idea) {
  const run = analysisRuns.get(idea.id);
  const next = STAGES[STAGES.indexOf(idea.stage) + 1];
  return {
    ...idea,
    analysisStatus: run?.state ?? (idea.analysis ? "ready" : "none"),
    analysisError: run?.message ?? null,
    nextGate: next ? { to: next, bar: GATE_BARS[next], ...suggestedNote(idea, next) } : null,
    ...templateView(idea),
  };
}

// The template section that belongs to the move into `stage`, offered as the note for that move.
function suggestedNote(idea, stage) {
  const key = SECTION_FOR_STAGE[stage];
  const text = idea.template?.[key];
  if (!text) return { suggestedNote: null };
  return { suggestedNote: shorten(text, MAX_NOTE_CHARS), suggestedFrom: SECTION_LABEL[key], suggestedShortened: text.length > MAX_NOTE_CHARS };
}

// What the page needs from a templated idea: its name, what each stage already has, and an outcome to offer.
function templateView(idea) {
  const sections = idea.template;
  if (!sections) return { title: null, supplied: null, suggestedOutcome: null };
  const hours = sections.hoursSavedPerWeek;
  return {
    title: sections.title ?? shorten(sections.problem.split("\n")[0], 80),
    supplied: STAGES.slice(1).map((stage) => ({ stage, supplied: Boolean(sections[SECTION_FOR_STAGE[stage]]) })),
    suggestedOutcome:
      sections.outcome && !idea.outcome
        ? {
            description: shorten(sections.outcome, MAX_NOTE_CHARS),
            hoursSavedPerWeek: hours && /^\d+(\.\d+)?$/.test(hours) ? Number(hours) : null,
            shortened: sections.outcome.length > MAX_NOTE_CHARS,
          }
        : null,
  };
}

// Ideas live in memory and are written to one JSON file after every change.
let ideas = [];
let writeQueue = Promise.resolve();

async function loadIdeas() {
  try {
    ideas = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function saveIdeas() {
  const snapshot = JSON.stringify(ideas, null, 2);
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await writeFile(`${DATA_FILE}.tmp`, snapshot);
    await rename(`${DATA_FILE}.tmp`, DATA_FILE);
  });
  return writeQueue;
}

function findIdea(id) {
  const idea = ideas.find((candidate) => candidate.id === id);
  if (!idea) throw new RequestError(404, "That idea could not be found.");
  return idea;
}

// Text that looks like a credential is refused before it is stored or sent to the model.
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9]{2,}-[A-Za-z0-9_-]{16,}/,
  /\bsk-[A-Za-z0-9_-]{24,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
];
const SECRET_MESSAGE = "That looks like a password or API key. Remove it and try again.";

function refuseSecrets(text) {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) throw new RequestError(400, SECRET_MESSAGE);
}

function requireText(value, label, maxChars) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new RequestError(400, `${label} is required.`);
  refuseSecrets(text);
  if (text.length > maxChars) throw new RequestError(400, `${label} must be under ${maxChars} characters.`);
  return text;
}

// One structured-output call. `failure` is the message shown when it cannot be completed.
async function askClaude({ system, content, schema, effort, failure, refusal }) {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content }],
      output_config: {
        effort,
        format: zodOutputFormat(schema),
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic authentication failed; check ANTHROPIC_API_KEY.");
      throw new RequestError(503, "The evaluation service is not configured yet.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new RequestError(503, "The evaluation service is busy. Please try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}: ${error.message}`);
    } else if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      // The SDK raises a plain Error before sending when it finds no credentials.
      console.error("No Anthropic credentials found; set ANTHROPIC_API_KEY in .env.");
      throw new RequestError(503, "The evaluation service is not configured yet.");
    } else {
      console.error("Model call failed:", error);
    }
    throw new RequestError(502, failure);
  }

  if (response.stop_reason === "refusal") throw new RequestError(422, refusal);

  const parsed = schema.safeParse(response.parsed_output);
  if (!parsed.success) {
    console.error(`Model output did not match the contract (stop_reason: ${response.stop_reason}).`);
    throw new RequestError(502, failure);
  }
  return parsed.data;
}

function evaluate(suggestion) {
  return askClaude({
    system: SYSTEM_PROMPT,
    content: suggestion,
    schema: Evaluation,
    effort: "low",
    failure: "We couldn't evaluate this idea. Please try again.",
    refusal: "This suggestion couldn't be evaluated. Try describing the workplace problem differently.",
  });
}

function describeIdea(idea) {
  const lines = [
    "Employee's suggestion:",
    idea.suggestion,
    "",
    "Earlier evaluation:",
    ...Object.entries(idea.evaluation).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "Reviewer notes, oldest first:",
    ...(idea.history.length
      ? idea.history.map((entry) => `- ${entry.from} to ${entry.to}: ${entry.note}${entry.override ? " (moved without meeting the evidence bar)" : ""}`)
      : ["- none"]),
  ];
  if (idea.outcome) {
    lines.push("", `Recorded outcome: ${idea.outcome.description} (reviewer estimate: ${idea.outcome.hoursSavedPerWeek} hours saved per week)`);
  }
  return lines.join("\n");
}

const isBlank = (text) => text.trim() === "";
const ANALYSIS_FAILURE = "The analysis couldn't be produced. Please try again.";
const GATE_FAILURE = "The evidence check couldn't be run.";

// Starts an analysis in the background. The caller has already checked the stage.
function startAnalysis(idea) {
  analysisRuns.set(idea.id, { state: "running", message: null });
  askClaude({
    system: ANALYSIS_PROMPT,
    content: describeIdea(idea),
    schema: Analysis,
    effort: "medium",
    failure: ANALYSIS_FAILURE,
    refusal: "An analysis couldn't be produced for this idea.",
  })
    .then(async (analysis) => {
      const { evidence, ifJustified } = analysis;
      const lists = [evidence.known, evidence.reportedUnverified, evidence.inferred, analysis.risks];
      const incomplete =
        [analysis.nextMove, analysis.reason, analysis.buildTrigger, ifJustified.pattern, ifJustified.summary, ifJustified.dataAndSystems].some(isBlank) ||
        lists.some((list) => list.some(isBlank)) ||
        evidence.known.length + evidence.reportedUnverified.length === 0 ||
        ifJustified.components.length === 0 ||
        ifJustified.components.some((part) => isBlank(part.name) || isBlank(part.responsibility));
      if (incomplete) throw new RequestError(502, ANALYSIS_FAILURE);
      if (!ideas.includes(idea)) return;
      idea.analysis = { ...analysis, generatedAt: new Date().toISOString() };
      await saveIdeas();
      analysisRuns.delete(idea.id);
    })
    .catch((error) => {
      if (!(error instanceof RequestError)) console.error("Analysis failed:", error);
      analysisRuns.set(idea.id, {
        state: "failed",
        message: error instanceof RequestError ? error.message : ANALYSIS_FAILURE,
      });
    });
}

function requestAnalysis(id) {
  const idea = findIdea(id);
  if (STAGES.indexOf(idea.stage) < STAGES.indexOf(ANALYSIS_STAGE)) {
    throw new RequestError(409, `An analysis is only produced once an idea reaches ${ANALYSIS_STAGE}.`);
  }
  if (analysisRuns.get(id)?.state === "running") {
    throw new RequestError(409, "An analysis is already being produced for this idea.");
  }
  startAnalysis(idea);
  return idea;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413, "That request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "The request could not be read.");
  }
}

async function createIdea(body) {
  const suggestion = typeof body?.suggestion === "string" ? body.suggestion.trim() : "";
  if (!suggestion) throw new RequestError(400, "Describe your idea or problem first.");
  if (suggestion.length > MAX_SUGGESTION_CHARS) {
    throw new RequestError(400, `Please keep it under ${MAX_SUGGESTION_CHARS} characters.`);
  }
  refuseSecrets(suggestion);
  const template = parseTemplate(suggestion);
  if (template && !template.problem) {
    throw new RequestError(400, "Describe the problem in the Problem section first.");
  }
  if (typeof body.submitterId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(body.submitterId)) {
    throw new RequestError(400, "The request could not be read.");
  }
  // Only a successfully evaluated suggestion is stored.
  const evaluation = await evaluate(suggestion);
  const idea = {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    submitterId: body.submitterId,
    suggestion,
    template,
    evaluation,
    stage: STAGES[0],
    history: [],
    outcome: null,
    analysis: null,
  };
  ideas.push(idea);
  await saveIdeas();
  return idea;
}

// Asks the model whether the record plus the new note meets the bar for the move.
async function checkGate(idea, target, note) {
  const gate = await askClaude({
    system: GATE_PROMPT,
    content: [
      describeIdea(idea),
      "",
      `Proposed move: ${idea.stage} to ${target}`,
      `Bar for this move: ${GATE_BARS[target]}`,
      "",
      "Reviewer's new note for this move:",
      note,
    ].join("\n"),
    schema: Gate,
    effort: "low",
    failure: GATE_FAILURE,
    refusal: GATE_FAILURE,
  });
  if (isBlank(gate.reason) || gate.known.some(isBlank) || gate.unverified.some(isBlank)) throw new RequestError(502, GATE_FAILURE);
  // A pass has to rest on something; one that lists no evidence does not count.
  if (gate.verdict === "Meets the bar" && gate.known.length === 0) {
    gate.verdict = "Not yet";
    gate.missing = gate.missing.trim() || "The check found no measured evidence to rest this move on. Record what was measured or observed.";
  }
  if (gate.verdict === "Not yet" && isBlank(gate.missing)) throw new RequestError(502, GATE_FAILURE);
  if (gate.verdict === "Meets the bar") gate.missing = "";
  return { ...gate, checkedAt: new Date().toISOString() };
}

// Returns { idea, moved, gate, checkError }. Only this function decides whether a move is saved.
async function moveIdea(id, body) {
  const idea = findIdea(id);
  if (body?.direction !== "forward" && body?.direction !== "back") {
    throw new RequestError(400, "Choose whether to move the idea forward or back.");
  }
  const forward = body.direction === "forward";
  const note = requireText(body.note, "A note", MAX_NOTE_CHARS);
  const overrideReason = body.overrideReason == null ? null : requireText(body.overrideReason, "A reason for moving anyway", MAX_NOTE_CHARS);
  const target = STAGES[STAGES.indexOf(idea.stage) + (forward ? 1 : -1)];
  if (!target) {
    throw new RequestError(409, `An idea at ${idea.stage} cannot move ${forward ? "forward" : "back"}.`);
  }

  const entry = { from: idea.stage, to: target, note, at: null };
  if (forward) {
    if (gateRuns.has(id)) throw new RequestError(409, "The evidence for this idea is already being checked.");
    const shown = gateResults.get(id);
    let gate = overrideReason && shown?.from === idea.stage && shown.note === note ? shown.gate : undefined;
    let checkError = null;
    if (!gate) {
      gateRuns.add(id);
      try {
        gate = await checkGate(idea, target, note);
      } catch (error) {
        if (!(error instanceof RequestError)) throw error;
        checkError = error.message;
      } finally {
        gateRuns.delete(id);
      }
    }
    const met = gate?.verdict === "Meets the bar";
    if (!met && !overrideReason) {
      if (gate) gateResults.set(id, { from: idea.stage, note, gate });
      return { idea, moved: false, gate: gate ?? null, checkError };
    }
    entry.gate = gate ?? { verdict: "Not checked", reason: checkError, known: [], unverified: [], missing: "", checkedAt: null };
    entry.override = met ? null : overrideReason;
    gateResults.delete(id);
  }

  entry.at = new Date().toISOString();
  idea.history.push(entry);
  idea.stage = target;
  await saveIdeas();
  // The move is already saved; the analysis can fail without affecting it.
  if (forward && target === ANALYSIS_STAGE && analysisRuns.get(id)?.state !== "running") {
    startAnalysis(idea);
  }
  return { idea, moved: true, gate: entry.gate ?? null, checkError: null };
}

// Only the browser that submitted an idea may delete it. There is no sign-in, so this
// is a guard against accidents, not a security boundary.
async function deleteIdea(id, submitterId) {
  const idea = findIdea(id);
  if (!submitterId || idea.submitterId !== submitterId) {
    throw new RequestError(403, "Only the person who submitted an idea can delete it.");
  }
  ideas = ideas.filter((candidate) => candidate.id !== id);
  analysisRuns.delete(id);
  gateResults.delete(id);
  await saveIdeas();
}

async function recordOutcome(id, body) {
  const idea = findIdea(id);
  if (!OUTCOME_STAGES.includes(idea.stage)) {
    throw new RequestError(409, "An outcome can only be recorded for an idea at Pilot or Investment.");
  }
  const description = requireText(body?.description, "A description", MAX_NOTE_CHARS);
  const hours = body.hoursSavedPerWeek;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0 || hours > 100000) {
    throw new RequestError(400, "Hours saved per week must be a number of zero or more.");
  }
  idea.outcome = { description, hoursSavedPerWeek: hours, recordedAt: new Date().toISOString() };
  await saveIdeas();
  return idea;
}

async function handleApi(req, res, pathname, searchParams) {
  const [, , resource, id, action] = pathname.split("/");
  if (resource !== "ideas" || pathname.split("/").length > 5) throw new RequestError(404, "Not found.");
  const route = `${req.method} ${id ? "/:id" : ""}${action ? `/${action}` : ""}`;

  switch (route) {
    case "GET ": {
      const submitterId = searchParams.get("submitterId");
      const list = submitterId ? ideas.filter((idea) => idea.submitterId === submitterId) : ideas;
      return sendJson(res, 200, { ideas: list.map(present) });
    }
    case "POST ":
      return sendJson(res, 201, { idea: present(await createIdea(await readJsonBody(req))) });
    case "GET /:id":
      return sendJson(res, 200, { idea: present(findIdea(id)) });
    case "POST /:id/stage": {
      const result = await moveIdea(id, await readJsonBody(req));
      return sendJson(res, 200, { ...result, idea: present(result.idea) });
    }
    case "DELETE /:id":
      await deleteIdea(id, searchParams.get("submitterId"));
      return sendJson(res, 200, { deleted: true });
    case "PUT /:id/outcome":
      return sendJson(res, 200, { idea: present(await recordOutcome(id, await readJsonBody(req))) });
    case "POST /:id/analysis":
      return sendJson(res, 202, { idea: present(requestAnalysis(id)) });
    default:
      throw new RequestError(405, "Method not allowed.");
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://localhost");

  if (pathname.startsWith("/api/")) {
    try {
      return await handleApi(req, res, pathname, searchParams);
    } catch (error) {
      if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message });
      console.error("Unexpected error:", error);
      return sendJson(res, 500, { error: "Something went wrong. Please try again." });
    }
  }

  const entry = req.method === "GET" ? STATIC_FILES[pathname] : undefined;
  if (!entry) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  const [dir, file, contentType] = entry;
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
  res.end(await readFile(path.join(dir, file)));
});

await loadIdeas();
server.listen(PORT, HOST, () => {
  console.log(`Ideas Workbench running at http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`);
});
