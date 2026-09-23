import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function credentialRecords(source) {
  return [...source.matchAll(
    /credential\(\s*"([0-9a-f-]{36})",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"(\d{4}-\d{2}-\d{2})",\s*"([a-z-]+)",?\s*\)/g,
  )].map((match) => ({
    id: match[1],
    name: match[2],
    issuer: match[3],
    issued: match[4],
    issuedDate: match[5],
    category: match[6],
  }));
}

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("credentials-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("keeps one complete, unique Credly record for every earned credential", async () => {
  const source = await readFile(new URL("app/data/credentials.ts", root), "utf8");
  const records = credentialRecords(source);

  assert.equal(records.length, 25);
  assert.equal(new Set(records.map((item) => item.id)).size, 25);
  assert.equal(new Set(records.map((item) => item.name)).size, 25);
  assert.deepEqual(
    new Set(records.map((item) => item.category)),
    new Set(["security-trust", "architecture-operations", "ai-data", "platforms-industry"]),
  );
  assert.doesNotMatch(source, /certificate number/i);

  for (const item of records) {
    assert.match(item.id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    assert.match(item.issuedDate, /^20\d{2}-\d{2}-\d{2}$/);
  }
});

test("ships normalized local badge art within a strict weight budget", async () => {
  const source = await readFile(new URL("app/data/credentials.ts", root), "utf8");
  const records = credentialRecords(source);
  let totalBytes = 0;

  for (const item of records) {
    const image = new URL(`public/credentials/${item.id}.webp`, root);
    const [contents, metadata] = await Promise.all([readFile(image), stat(image)]);
    totalBytes += metadata.size;
    assert.equal(contents.subarray(0, 4).toString("ascii"), "RIFF", item.id);
    assert.equal(contents.subarray(8, 12).toString("ascii"), "WEBP", item.id);
    assert.ok(metadata.size <= 80 * 1024, `${item.id} is ${metadata.size} bytes`);
  }

  assert.ok(totalBytes <= 1024 * 1024, `credential art totals ${totalBytes} bytes`);
});

test("renders 25 source-linked credentials without lifecycle claims", async () => {
  const source = await readFile(new URL("app/data/credentials.ts", root), "utf8");
  const records = credentialRecords(source);
  const response = await render("/credentials");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/class="credential-card"/g) ?? []).length, 25);
  assert.equal((html.match(/class="credential-card__record"/g) ?? []).length, 25);
  assert.match(html, /Credly record ID/i);
  assert.match(html, /href="\/credentials\.css\?v=/i);
  assert.match(html, /numberOfItems(?:&quot;|\")?:25/i);
  assert.doesNotMatch(html, /\b(?:expired|expiration|expires)\b/i);
  assert.doesNotMatch(html, /\/_vinext\/image/i);

  for (const item of records) {
    assert.ok(html.includes(item.id), item.id);
    assert.ok(
      html.includes(`<code>${item.id}</code>`),
      `${item.id} visible record ID`,
    );
    assert.ok(
      html.includes(`href="https://www.credly.com/badges/${item.id}/public_url"`),
      `${item.id} direct verification link`,
    );
    assert.ok(
      html.includes(`src="/credentials/${item.id}.webp"`),
      `${item.id} local art`,
    );
  }

  for (const link of html.matchAll(/<a class="credential-card__verify"[^>]+>/g)) {
    assert.match(link[0], /target="_blank"/);
    assert.match(link[0], /rel="noreferrer"/);
  }

  for (const item of records) {
    const escapedName = item.name.replaceAll("&", "&amp;");
    assert.ok(
      html.includes(`aria-label="Verify ${escapedName} on Credly, opens in a new tab"`),
      `${item.name} standalone verification label`,
    );
  }
});

test("keeps credential metadata readable and the smallest accent AA-safe", async () => {
  const css = await readFile(new URL("public/credentials.css", root), "utf8");
  assert.match(css, /--credential-accent:\s*#6b5518/);
  assert.match(css, /data-theme="dark"[\s\S]*?--credential-accent:\s*#d7b866/);
  assert.match(css, /\.credential-card__record code\s*\{[\s\S]*?font-size:\s*0\.7rem/);
  assert.match(css, /\.credential-card__verify\s*\{[\s\S]*?font-size:\s*0\.78rem/);
});

test("keeps the badge refresh manifest aligned with the public catalog", async () => {
  const [source, refresh] = await Promise.all([
    readFile(new URL("app/data/credentials.ts", root), "utf8"),
    readFile(new URL("tools/refresh-credential-badges.mjs", root), "utf8"),
  ]);
  const records = credentialRecords(source);
  const sourceIds = [...refresh.matchAll(/\["([0-9a-f-]{36})", "https:\/\/images\.credly\.com\//g)]
    .map((match) => match[1]);

  assert.equal(sourceIds.length, 25);
  assert.deepEqual(new Set(sourceIds), new Set(records.map((item) => item.id)));
});
