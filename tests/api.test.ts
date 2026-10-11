import { describe, it, expect } from "vitest";
import worker from "../worker/index";
const env = { ASSETS: { fetch: async () => new Response("static") } };
const post = (body: unknown, type = "application/json") =>
  worker.fetch(
    new Request("https://zimankit.test/api/v1/process", {
      method: "POST",
      headers: { "content-type": type },
      body: JSON.stringify(body),
    }),
    env,
  );
describe("REST API", () => {
  it("returns the same explicit Sorani normalization and change report", async () => {
    const response = await post({ text: "كوردی", options: { language: "sorani" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ text: "کوردی", original: "كوردی" });
  });
  it("defaults to Unicode-only", async () => {
    expect(await (await post({ text: "ك" })).json()).toMatchObject({
      text: "ك",
      language: "unicode",
    });
  });
  it("rejects incorrect types, options and unknown fields", async () => {
    for (const body of [
      null,
      [],
      { text: 1 },
      { text: "x", options: [] },
      { text: "x", options: { bad: true } },
      { text: "x", unknown: true },
    ])
      expect((await post(body)).status).toBe(400);
  });
  it("rejects wrong media types and malformed JSON", async () => {
    expect((await post({ text: "x" }, "text/plain")).status).toBe(415);
    expect(
      (
        await worker.fetch(
          new Request("https://zimankit.test/api/v1/process", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
          }),
          env,
        )
      ).status,
    ).toBe(400);
  });
  it("rejects oversized text and request bodies", async () => {
    expect((await post({ text: "x".repeat(2_001) })).status).toBe(413);
    expect((await post({ text: "x".repeat(2_000) })).status).toBe(200);
    expect((await post({ text: "x".repeat(100_001) })).status).toBe(413);
  });
  it("handles health, methods, CORS and missing routes", async () => {
    expect(
      (await worker.fetch(new Request("https://zimankit.test/api/v1/health"), env)).status,
    ).toBe(200);
    expect(
      (await worker.fetch(new Request("https://zimankit.test/api/v1/process"), env)).status,
    ).toBe(405);
    expect((await worker.fetch(new Request("https://zimankit.test/api/nope"), env)).status).toBe(
      404,
    );
    expect(
      (
        await worker.fetch(
          new Request("https://zimankit.test/api/v1/process", { method: "OPTIONS" }),
          env,
        )
      ).status,
    ).toBe(204);
    expect(await (await worker.fetch(new Request("https://zimankit.test/docs/"), env)).text()).toBe(
      "static",
    );
  });
});
