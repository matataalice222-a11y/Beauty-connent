import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { createServer } from "./server.js";

let server;
let baseUrl;
let dataDirectory;

before(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cabal-privy-test-"));
  server = createServer({ dataDirectory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await rm(dataDirectory, { recursive: true, force: true });
});

test("serves the standalone website and health endpoint", async () => {
  const [page, health] = await Promise.all([
    fetch(baseUrl),
    fetch(`${baseUrl}/api/health`),
  ]);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /Cabal Privy/);
  assert.deepEqual(await health.json(), { status: "ok" });
});

test("saves a valid quote request and returns a confirmation", async () => {
  const response = await fetch(`${baseUrl}/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Amina W.",
      phone: "+254 712 345 678",
      event: "Wedding",
      date: "2027-04-15",
      message: "About 120 guests near Thindigwa.",
    }),
  });

  assert.equal(response.status, 201);
  assert.match((await response.json()).message, /received/);
  const lines = (await readFile(path.join(dataDirectory, "quotes.jsonl"), "utf8")).trim().split("\n");
  const quote = JSON.parse(lines[0]);
  assert.equal(quote.name, "Amina W.");
  assert.equal(quote.phone, "+254 712 345 678");
  assert.equal(quote.event, "Wedding");
  assert.equal(quote.date, "2027-04-15");
  assert.equal(quote.message, "About 120 guests near Thindigwa.");
  assert.ok(quote.receivedAt);
});

test("rejects malformed or invalid quote requests", async () => {
  const invalidCases = [
    { name: "A", phone: "0712345678", event: "Wedding" },
    { name: "Amina W.", phone: "not a phone", event: "Wedding" },
    { name: "Amina W.", phone: "0712345678", event: "Unknown event" },
    { name: "Amina W.", phone: "0712345678", event: "Wedding", date: "2027-02-31" },
  ];

  for (const quote of invalidCases) {
    const response = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quote),
    });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
});

test("serves frontend styles and blocks traversal paths", async () => {
  const [styles, traversal] = await Promise.all([
    fetch(`${baseUrl}/styles.css`),
    fetch(`${baseUrl}/..%2F..%2FREADME.md`),
  ]);
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get("content-type"), /text\/css/);
  assert.match(await styles.text(), /--sky:/);
  assert.equal(traversal.status, 403);
});
