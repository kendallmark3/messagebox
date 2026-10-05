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
  summary: z.string(),
  pattern: z.string(),
  whyItFits: z.string(),
  components: z.array(z.object({ name: z.string(), responsibility: z.string() })),
  dataAndIntegrations: z.string(),
  simplerAlternative: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  firstPrototype: z.string(),
});

const ANALYSIS_PROMPT = `You propose a potential architectural pattern for an employee idea that has been approved to move into prototyping.

You are given everything recorded about the idea: the employee's original suggestion, an earlier evaluation, the reviewers' notes from each stage move, and an outcome if one was recorded. That is all you know. You have no knowledge of the organisation's systems, teams, budgets, or tools beyond what those records say.

Your reader is a business reviewer and the people who will build the prototype. Write in plain language, and when you name a pattern, name it in words a non-engineer can follow.

Fill in each field:
- summary: what a solution would need to do, in two or three sentences.
- pattern: a short plain-language name for the solution shape you propose.
- whyItFits: why that shape suits this problem, given what was written and what the reviewers recorded.
- components: three to six main parts, each with a name and a one-sentence responsibility.
- dataAndIntegrations: what information and existing systems it would need to touch, as far as the records reveal. Say plainly what is not known.
- simplerAlternative: the cheapest option that might be enough. Consider a change to the process with no new software.
- assumptions: what you had to assume because the records did not say. If you assumed nothing, give one entry saying so.
- risks: the main things that could make this the wrong shape.
- firstPrototype: the smallest thing to build or try that would test the pattern.

Take the reviewers' notes into account; they are the evidence. Do not contradict a fact recorded there.
Do not invent systems, vendors, team names, costs, or timelines. Put anything unknown under assumptions rather than stating it as fact.
Do not reach for AI by default. Propose AI only where the problem genuinely calls for it.
This is a starting point for discussion, not a design. Keep the whole thing readable in a couple of minutes.`;

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

// Starts an analysis in the background. The caller has already checked the stage.
function startAnalysis(idea) {
  analysisRuns.set(idea.id, { state: "running", message: null });
  askClaude({
    system: ANALYSIS_PROMPT,
    content: describeIdea(idea),
    schema: Analysis,
    effort: "medium",
    failure: "The potential architecture couldn't be produced. Please try again.",
    refusal: "A potential architecture couldn't be produced for this idea.",
  })
    .then(async (analysis) => {
      const texts = [analysis.summary, analysis.pattern, analysis.whyItFits, analysis.dataAndIntegrations, analysis.simplerAlternative, analysis.firstPrototype];
      const incomplete =
        texts.some(isBlank) ||
        analysis.components.length === 0 ||
        analysis.components.some((part) => isBlank(part.name) || isBlank(part.responsibility)) ||
        analysis.assumptions.length === 0 ||
        analysis.assumptions.some(isBlank) ||
        analysis.risks.some(isBlank);
      if (incomplete) throw new RequestError(502, "The potential architecture couldn't be produced. Please try again.");
      idea.analysis = { ...analysis, generatedAt: new Date().toISOString() };
      await saveIdeas();
      analysisRuns.delete(idea.id);
    })
    .catch((error) => {
      if (!(error instanceof RequestError)) console.error("Analysis failed:", error);
      analysisRuns.set(idea.id, {
        state: "failed",
        message: error instanceof RequestError ? error.message : "The potential architecture couldn't be produced. Please try again.",
      });
    });
}

function requestAnalysis(id) {
  const idea = findIdea(id);
  if (STAGES.indexOf(idea.stage) < STAGES.indexOf(ANALYSIS_STAGE)) {
    throw new RequestError(409, `A potential architecture is only produced once an idea reaches ${ANALYSIS_STAGE}.`);
  }
  if (analysisRuns.get(id)?.state === "running") {
    throw new RequestError(409, "A potential architecture is already being produced for this idea.");
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
