import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createPagesServer, resolvePublicPath } from "../tools/serve-pages.mjs";

test("maps clean and slash routes to the same exported document", () => {
  const root = "/tmp/portfolio-preview";
  assert.equal(resolvePublicPath(root, "/work"), `${root}/work/index.html`);
  assert.equal(resolvePublicPath(root, "/work/"), `${root}/work/index.html`);
  assert.equal(resolvePublicPath(root, "/work/index.html"), `${root}/work/index.html`);
  assert.equal(resolvePublicPath(root, "/portfolio-v3.css"), `${root}/portfolio-v3.css`);
});

test("serves both clean route forms without redirects", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "portfolio-preview-"));
  await mkdir(join(root, "work"));
  await mkdir(join(root, "portraits"));
  await writeFile(join(root, "work", "index.html"), "<h1>Work</h1>");
  await writeFile(join(root, "404.html"), "<h1>Missing</h1>");
  await writeFile(join(root, "portraits", "portrait.avif"), "avif");
  await writeFile(join(root, "portraits", "portrait.webp"), "webp");
  await writeFile(join(root, "sitemap.xml"), "<urlset/>");

  const server = createPagesServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert(address && typeof address === "object");

  for (const path of ["/work", "/work/", "/work/index.html"]) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      redirect: "manual",
    });
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), "<h1>Work</h1>");
  }

  for (const [path, contentType] of [
    ["/portraits/portrait.avif", "image/avif"],
    ["/portraits/portrait.webp", "image/webp"],
    ["/sitemap.xml", "application/xml; charset=utf-8"],
  ]) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("content-type"), contentType, path);
  }

  const missing = await fetch(`http://127.0.0.1:${address.port}/unknown`, {
    redirect: "manual",
  });
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), "<h1>Missing</h1>");
});
