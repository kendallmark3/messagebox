import http from "node:http";
import { readFile } from "node:fs/promises";
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

// The service-level failures the browser is allowed to see.
class EvaluationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function evaluate(suggestion) {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: suggestion }],
      output_config: {
        effort: "low",
        format: zodOutputFormat(Evaluation),
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic authentication failed; check ANTHROPIC_API_KEY.");
      throw new EvaluationError(503, "The evaluation service is not configured yet.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new EvaluationError(503, "The evaluation service is busy. Please try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}: ${error.message}`);
    } else if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      // The SDK raises a plain Error before sending when it finds no credentials.
      console.error("No Anthropic credentials found; set ANTHROPIC_API_KEY in .env.");
      throw new EvaluationError(503, "The evaluation service is not configured yet.");
    } else {
      console.error("Evaluation failed:", error);
    }
    throw new EvaluationError(502, "We couldn't evaluate this idea. Please try again.");
  }

  if (response.stop_reason === "refusal") {
    throw new EvaluationError(422, "This suggestion couldn't be evaluated. Try describing the workplace problem differently.");
  }

  const parsed = Evaluation.safeParse(response.parsed_output);
  if (!parsed.success) {
    console.error(`Evaluation did not match the contract (stop_reason: ${response.stop_reason}).`);
    throw new EvaluationError(502, "We couldn't evaluate this idea. Please try again.");
  }
  return parsed.data;
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
    if (size > MAX_BODY_BYTES) throw new EvaluationError(413, "That suggestion is too long.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EvaluationError(400, "The request could not be read.");
  }
}

async function handleEvaluate(req, res) {
  try {
    const body = await readJsonBody(req);
    const suggestion = typeof body?.suggestion === "string" ? body.suggestion.trim() : "";
    if (!suggestion) throw new EvaluationError(400, "Describe your idea or problem first.");
    if (suggestion.length > MAX_SUGGESTION_CHARS) {
      throw new EvaluationError(400, `Please keep it under ${MAX_SUGGESTION_CHARS} characters.`);
    }
    sendJson(res, 200, { evaluation: await evaluate(suggestion) });
  } catch (error) {
    if (error instanceof EvaluationError) return sendJson(res, error.status, { error: error.message });
    console.error("Unexpected error:", error);
    sendJson(res, 500, { error: "Something went wrong. Please try again." });
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/api/evaluate") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
    return handleEvaluate(req, res);
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

server.listen(PORT, () => {
  console.log(`Ideas Workbench running at http://localhost:${PORT}`);
});
