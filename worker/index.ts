import { MAX_TEXT_LENGTH, VERSION, processText, validateOptions } from "../packages/core/src/index";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
const MAX_BODY_BYTES = 100_000;
const MAX_API_TEXT_LENGTH = 2_000;
function json(data: unknown, status = 200): Response {
  const init = {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  };
  return status === 204 ? new Response(null, init) : Response.json(data, init);
}
async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new RangeError("Request body exceeds 100,000 bytes.");
  if (!request.body) throw new TypeError("A JSON request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Request body exceeds 100,000 bytes.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/$/u, "");
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return json(null, 204);
    if (path === "/api/v1/health" && request.method === "GET")
      return json({
        status: "ok",
        version: VERSION,
        maxTextLength: MAX_API_TEXT_LENGTH,
        libraryMaxTextLength: MAX_TEXT_LENGTH,
      });
    if (path !== "/api/v1/process") return json({ error: "Endpoint not found." }, 404);
    if (request.method !== "POST") {
      const response = json({ error: "Use POST with a JSON body." }, 405);
      response.headers.set("Allow", "POST, OPTIONS");
      return response;
    }
    if (
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
    )
      return json({ error: "Content-Type must be application/json." }, 415);
    try {
      const body = await readJson(request);
      if (typeof body !== "object" || body === null || Array.isArray(body))
        throw new TypeError("Body must contain text and optional options.");
      const data = body as Record<string, unknown>;
      if (Object.keys(data).some((key) => !["text", "options"].includes(key)))
        throw new TypeError("Body accepts only text and options.");
      if (typeof data.text !== "string") throw new TypeError("text must be a string.");
      if (data.text.length > MAX_API_TEXT_LENGTH)
        throw new RangeError(
          "API text exceeds 2,000 UTF-16 code units. Use the browser playground or local library for passages up to 20,000.",
        );
      const options = validateOptions(data.options ?? {});
      return json(processText(data.text, options));
    } catch (error) {
      if (error instanceof RangeError) return json({ error: error.message }, 413);
      if (error instanceof SyntaxError) return json({ error: "Invalid JSON body." }, 400);
      if (error instanceof TypeError) return json({ error: error.message }, 400);
      return json({ error: "Unable to process this request." }, 500);
    }
  },
};
