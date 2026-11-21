import assert from "node:assert/strict";
import {cp, mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {decodeFlight, inspectClientMap, parseFlight, verifyExportBindings} from "../tools/verify-export-bindings.mjs";

const site = fileURLToPath(new URL("../", import.meta.url));
const wrap = value => `<script>self.__VINEXT_RSC_CHUNKS__=self.__VINEXT_RSC_CHUNKS__||[];self.__VINEXT_RSC_CHUNKS__.push(${JSON.stringify(value).replaceAll("<", "\\u003c")})</script><script>self.__VINEXT_RSC_DONE__=true</script>`;

test("Flight text uses UTF-8 byte framing, including newlines and script-like text", () => {
  const text = "café ✨\n</script>";
  const stream = `1:T${Buffer.byteLength(text).toString(16)},${text}2:I["abcdef123456",[],"default",1]\n`;
  assert.deepEqual(decodeFlight(wrap(stream)), [{id: "1", kind: "text", value: text}, {id: "2", kind: "import", value: ["abcdef123456", [], "default", 1]}]);
  assert.throws(() => decodeFlight(wrap(stream).replace("self.__VINEXT_RSC_DONE__=true", "")), /completion/);
  assert.throws(() => parseFlight("1:T4,é"), /Truncated/);
  assert.throws(() => parseFlight("1:T1,é"), /encoded data/);
  assert.throws(() => parseFlight('1:I["a",[],"default"]\n1:null\n'), /Duplicate/);
  assert.throws(() => parseFlight("1:E{}\n"), SyntaxError);
});

const loaderFixture = `var ns=namespace({default:()=>component}),refs={"abcdef123456":async()=>{let m=await preload(()=>Promise.resolve().then(()=>ns));return{get default(){return m.default}}}};
function register(o){let r=cache(id=>o.load(id));globalThis.__vite_rsc_client_require__=r}
function start(){register({load:async id=>{let f=refs[id];return f()}})}start();`;

test("RSC lookup selects the active registered map and rejects missing exports", () => {
  const withDecoy = loaderFixture + 'var unused={"123456abcdef":async()=>{throw Error("decoy")}};';
  assert.deepEqual([...inspectClientMap(withDecoy).keys()], ["abcdef123456"]);
  assert.throws(() => inspectClientMap(loaderFixture.replace("namespace({default:", "namespace({missing:")), /namespace export/);
  assert.throws(() => inspectClientMap(loaderFixture.replace("start();", "")), /initialized/);
  assert.throws(() => inspectClientMap(loaderFixture.replace("return f()", "return null")), /selected loader result/);
  assert.throws(() => inspectClientMap(loaderFixture.replace("globalThis.__vite_rsc_client_require__=r", "globalThis.__vite_rsc_client_require__=()=>null")), /constructed loader/);
  assert.throws(() => inspectClientMap(loaderFixture.replace("o.load(id)", 'o.load("ffffffffffff")')), /forward its requested module ID/);
  assert.throws(() => inspectClientMap(loaderFixture.replace("await preload(()=>Promise.resolve().then(()=>ns))", "await (preload(()=>Promise.resolve().then(()=>ns)), {default:null})")), /preload call/);
  const duplicate = loaderFixture.replace('refs={', 'refs={"abcdef123456":async()=>{let m=await preload(()=>Promise.resolve().then(()=>ns));return{get default(){return m.default}}},');
  assert.throws(() => inspectClientMap(duplicate), /Duplicate/);
});

test("RSC registrar forwards the requested ID through only the supported cache normalizer", () => {
  const normalized = loaderFixture.replace("o.load(id)", "o.load(clean(id))") + 'function clean(value){return value.split(`$$cache=`)[0]}';
  assert.deepEqual([...inspectClientMap(normalized).keys()], ["abcdef123456"]);
  assert.throws(() => inspectClientMap(normalized.replace("function clean", "async function clean")), /ordinary synchronous function/);
  assert.throws(() => inspectClientMap(normalized.replace("function clean", "function* clean")), /ordinary synchronous function/);
  for (const altered of [
    normalized.replace("clean(id)", 'clean("ffffffffffff")'),
    normalized.replace("value.split", '"ffffffffffff".split'),
    normalized.replace("$$cache=", "$$other="),
    normalized.replace("[0]", "[1]"),
    normalized.replace("return value.split(`$$cache=`)[0]", 'return "ffffffffffff"'),
  ]) assert.throws(() => inspectClientMap(altered), /forward its requested module ID|forwarding helper/);
});

test("all exported module, server reference and Flight relationships agree", async () => {
  const result = await verifyExportBindings(site);
  assert.ok(result.modules >= 6);
  assert.ok(result.edges > 0);
  assert.equal(result.clientReferences, 5);
  assert.equal(result.flightImports, 6);
});

test("artifact joins reject independently corrupted build relationships", async t => {
  const manifest = JSON.parse(await readFile(join(site, "dist/client/.vite/manifest.json"), "utf8"));
  const entry = manifest["virtual:vinext-app-browser-entry"].file;
  const frameworkFixture = "build/local-preview/models-vinext.html";
  const mutations = [
    ["stale HTML bootstrap", frameworkFixture, text => text.replace(`import("/${entry}")`, 'import("/assets/index-stale.js")'), /bootstrap/],
    ["preload query divergence", frameworkFixture, text => text.replace(`href="/${entry}"`, `href="/${entry}?v=stale"`), /identity/],
    ["different Flight build", frameworkFixture, text => text.replace(/(deploymentVersion\\":\\")[^\\]+/, "$1different-build"), /different build/],
    ["mixed Flight IDs", frameworkFixture, text => text.replace(/(:I\[\\")[a-f0-9]{12}/, "$1ffffffffffff"), /Unresolvable/],
    ["missing referenced Flight row", frameworkFixture, text => text.replace(/\$L[0-9a-f]+/, "$Lffff"), /Missing Flight row/],
    ["malformed asynchronous marker", frameworkFixture, text => text.replace(/(:I\[\\"[a-f0-9]+\\",\[\],\\"[^\\]+\\",)1/, "$10"), /import tuple/],
    ["missing transitive chunk", "pages-dist/" + Object.values(manifest).find(item => item.name === "framework").file, null, /ENOENT/],
    ["manifest traversal", "dist/client/.vite/manifest.json", text => text.replace(/"file": "assets\//, '"file": "../'), /Unsafe artifact path/],
    ["out of bounds preload", "pages-dist/" + entry, text => text.replace(/__vite__mapDeps\(\[\d+/, "__vite__mapDeps([999"), /Preload index/, true],
  ];
  for (const [label, file, mutate, error, mirrored] of mutations) await t.test(label, async t => {
    const folder = await mkdtemp(join(tmpdir(), "portfolio-binding-check-"));
    t.after(() => rm(folder, {recursive: true, force: true}));
    for (const path of ["dist/client", "dist/server", "pages-dist"]) await cp(join(site, path), join(folder, path), {recursive: true});
    await mkdir(join(folder, "build/local-preview"), {recursive: true});
    await cp(join(site, frameworkFixture), join(folder, frameworkFixture));
    if (mutate) {
      const before = await readFile(join(folder, file), "utf8"), after = mutate(before);
      assert.notEqual(after, before, `Mutation did not apply: ${label}`);
      await writeFile(join(folder, file), after);
      if (mirrored) await writeFile(join(folder, file.replace("pages-dist/", "dist/client/")), after);
    } else await rm(join(folder, file));
    await assert.rejects(verifyExportBindings(folder), error);
  });
});
