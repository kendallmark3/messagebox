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

const STATIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
};

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

function present(idea) {
  const run = analysisRuns.get(idea.id);
  return { ...idea, analysisStatus: run?.state ?? (idea.analysis ? "ready" : "none"), analysisError: run?.message ?? null };
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

function requireText(value, label, maxChars) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new RequestError(400, `${label} is required.`);
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
    ...(idea.history.length ? idea.history.map((entry) => `- ${entry.from} to ${entry.to}: ${entry.note}`) : ["- none"]),
  ];
  if (idea.outcome) {
    lines.push("", `Recorded outcome: ${idea.outcome.description} (reviewer estimate: ${idea.outcome.hoursSavedPerWeek} hours saved per week)`);
  }
  return lines.join("\n");
}

const isBlank = (text) => text.trim() === "";
const ANALYSIS_FAILURE = "The analysis couldn't be produced. Please try again.";

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

async function moveIdea(id, body) {
  const idea = findIdea(id);
  if (body?.direction !== "forward" && body?.direction !== "back") {
    throw new RequestError(400, "Choose whether to move the idea forward or back.");
  }
  const note = requireText(body.note, "A note", MAX_NOTE_CHARS);
  const target = STAGES[STAGES.indexOf(idea.stage) + (body.direction === "forward" ? 1 : -1)];
  if (!target) {
    throw new RequestError(409, `An idea at ${idea.stage} cannot move ${body.direction === "forward" ? "forward" : "back"}.`);
  }
  idea.history.push({ from: idea.stage, to: target, note, at: new Date().toISOString() });
  idea.stage = target;
  await saveIdeas();
  // The move is already saved; the analysis can fail without affecting it.
  if (body.direction === "forward" && target === ANALYSIS_STAGE && analysisRuns.get(id)?.state !== "running") {
    startAnalysis(idea);
  }
  return idea;
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
    case "POST /:id/stage":
      return sendJson(res, 200, { idea: present(await moveIdea(id, await readJsonBody(req))) });
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
  const [file, contentType] = entry;
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
  res.end(await readFile(path.join(PUBLIC_DIR, file)));
});

await loadIdeas();
server.listen(PORT, () => {
  console.log(`Ideas Workbench running at http://localhost:${PORT}`);
});
