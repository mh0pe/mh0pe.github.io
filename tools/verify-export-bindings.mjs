import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import ts from "typescript";

// Inspect generated code as syntax/data. Never execute a generated bundle.
const nodes = (root, predicate) => {
  const result = [];
  function visit(node) { if (predicate(node)) result.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return result;
};
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : null;
const parse = (file, text) => {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(tree.parseDiagnostics.length, 0, `Invalid JavaScript: ${file}`);
  return tree;
};
function assetPath(path) {
  assert.ok(typeof path === "string" && /^[a-zA-Z0-9_./-]+$/.test(path) && !path.startsWith("/") && !path.split("/").some(part => ["", ".", ".."].includes(part)), `Unsafe artifact path: ${path}`);
  return path;
}

export function decodeFlight(html) {
  assert.match(html, /self\.__VINEXT_RSC_DONE__\s*=\s*true/, "Flight completion marker missing");
  const parts = [];
  for (const [, script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (!script.includes(".__VINEXT_RSC_CHUNKS__.push(")) continue;
    const match = script.trim().replace(/;$/, "").match(/^self\.__VINEXT_RSC_CHUNKS__=self\.__VINEXT_RSC_CHUNKS__\|\|\[\];self\.__VINEXT_RSC_CHUNKS__\.push\(([\s\S]*)\)$/);
    assert.ok(match, "Unsupported Flight chunk script");
    const part = JSON.parse(match[1]);
    assert.equal(typeof part, "string");
    parts.push(part);
  }
  assert.ok(parts.length, "Flight chunks missing");
  return parseFlight(parts.join(""));
}

export function parseFlight(text) {
  const bytes = Buffer.from(text), records = [], ids = new Set();
  const decoder = new TextDecoder("utf-8", {fatal: true});
  let offset = 0;
  while (offset < bytes.length) {
    const colon = bytes.indexOf(58, offset);
    assert.ok(colon >= offset, "Truncated Flight record");
    const id = bytes.subarray(offset, colon).toString();
    assert.match(id, /^[a-f0-9]*$/);
    if (id) { assert.ok(!ids.has(id), `Duplicate Flight row ${id}`); ids.add(id); }
    offset = colon + 1;
    if (bytes[offset] === 84) {
      const comma = bytes.indexOf(44, ++offset);
      assert.ok(comma >= offset, "Truncated Flight text length");
      const lengthHex = bytes.subarray(offset, comma).toString();
      assert.match(lengthHex, /^[a-f0-9]+$/);
      const length = Number.parseInt(lengthHex, 16);
      assert.ok(Number.isSafeInteger(length) && comma + 1 + length <= bytes.length, "Truncated Flight text");
      offset = comma + 1;
      records.push({id, kind: "text", value: decoder.decode(bytes.subarray(offset, offset + length))});
      offset += length;
      if (bytes[offset] === 10) offset++;
      continue;
    }
    const newline = bytes.indexOf(10, offset);
    assert.ok(newline >= offset, "Truncated Flight JSON record");
    const row = decoder.decode(bytes.subarray(offset, newline));
    offset = newline + 1;
    const kind = row.startsWith("I") ? "import" : row.startsWith("HL") ? "hint" : "model";
    const value = JSON.parse(row.slice(kind === "import" ? 1 : kind === "hint" ? 2 : 0));
    records.push({id, kind, value});
  }
  return records;
}

function modulePath(from, reference) {
  assert.equal(typeof reference, "string", "Computed module edge is unsupported");
  assert.ok(!/[?#\\]/.test(reference), `Module identity has query, fragment or backslash: ${reference}`);
  assert.ok(reference.startsWith("./") || reference.startsWith("../") || reference.startsWith("/assets/"), `Nonlocal module: ${reference}`);
  const path = posix.normalize(reference.startsWith("/") ? reference.slice(1) : posix.join(posix.dirname(from), reference));
  assert.ok(path.startsWith("assets/") && !path.includes(".."), `Module escapes asset directory: ${reference}`);
  return path;
}

function exportedNames(tree) {
  const result = new Set();
  for (const statement of tree.statements) {
    if (ts.isExportDeclaration(statement)) {
      assert.ok(statement.exportClause && ts.isNamedExports(statement.exportClause), "Unsupported star re-export");
      for (const item of statement.exportClause.elements) result.add(item.name.text);
    } else if (ts.isExportAssignment(statement)) result.add("default");
    else if (statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (statement.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) result.add("default");
      else if (statement.name) result.add(name(statement.name));
      else if (ts.isVariableStatement(statement)) for (const item of statement.declarationList.declarations) result.add(name(item.name));
    }
  }
  return result;
}

export function inspectClientMap(text) {
  const tree = parse("bootstrap.js", text);
  const functions = tree.statements.filter(ts.isFunctionDeclaration);
  const registrars = functions.filter(fn => nodes(fn.body, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && node.left.expression.getText(tree) === "globalThis" && node.left.name.text === "__vite_rsc_client_require__").length);
  assert.equal(registrars.length, 1, "Expected one active RSC registrar");
  const registrar = registrars[0];
  const assignments = nodes(registrar.body, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText(tree) === "globalThis.__vite_rsc_client_require__");
  assert.equal(assignments.length, 1);
  const assignedName = name(assignments[0].right);
  assert.ok(assignedName, "Registrar must assign its constructed loader");
  const constructed = nodes(registrar.body, node => ts.isVariableDeclaration(node) && name(node.name) === assignedName);
  assert.equal(constructed.length, 1);
  const factory = constructed[0].initializer;
  assert.ok(factory && ts.isCallExpression(factory), "Registrar loader factory missing");
  const callback = factory.arguments[0];
  assert.ok(callback && ts.isArrowFunction(callback) && ts.isCallExpression(callback.body), "Registrar callback must call the supplied loader");
  const invocation = callback.body.expression;
  assert.ok(ts.isPropertyAccessExpression(invocation) && invocation.name.text === "load" && name(invocation.expression) === name(registrar.parameters[0].name), "Registrar does not call the supplied loader");
  assert.ok(callback.parameters.length === 1 && ts.isIdentifier(callback.parameters[0].name) && callback.body.arguments.length === 1, "Registrar must forward its requested module ID");
  const requestedId = callback.parameters[0].name.text;
  const forwarded = callback.body.arguments[0];
  if (!ts.isIdentifier(forwarded) || forwarded.text !== requestedId) {
    // The pinned RSC emitter may strip its cache suffix before resolving an ID.
    assert.ok(ts.isCallExpression(forwarded) && ts.isIdentifier(forwarded.expression) && forwarded.arguments.length === 1 && ts.isIdentifier(forwarded.arguments[0]) && forwarded.arguments[0].text === requestedId, "Registrar must forward its requested module ID");
    const normalizers = functions.filter(fn => name(fn.name) === forwarded.expression.text);
    assert.equal(normalizers.length, 1, "Unsupported module ID forwarding helper");
    const normalizer = normalizers[0];
    assert.ok(!normalizer.asteriskToken && !normalizer.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword), "Module ID forwarding helper must be an ordinary synchronous function");
    assert.ok(normalizer.parameters.length === 1 && ts.isIdentifier(normalizer.parameters[0].name) && normalizer.body.statements.length === 1 && ts.isReturnStatement(normalizer.body.statements[0]), "Unsupported module ID forwarding helper");
    const value = normalizer.body.statements[0].expression;
    assert.ok(value && ts.isElementAccessExpression(value) && ts.isNumericLiteral(value.argumentExpression) && value.argumentExpression.text === "0" && ts.isCallExpression(value.expression), "Unsupported module ID forwarding helper");
    const split = value.expression;
    assert.ok(ts.isPropertyAccessExpression(split.expression) && split.expression.name.text === "split" && ts.isIdentifier(split.expression.expression) && split.expression.expression.text === normalizer.parameters[0].name.text && split.arguments.length === 1 && literal(split.arguments[0]) === "$$cache=", "Unsupported module ID forwarding helper");
  }
  const calls = nodes(tree, node => ts.isCallExpression(node) && name(node.expression) === registrar.name.text);
  assert.equal(calls.length, 1, "Expected one RSC loader registration");
  let wrapper = calls[0].parent;
  while (wrapper && !ts.isFunctionDeclaration(wrapper)) wrapper = wrapper.parent;
  assert.ok(wrapper && tree.statements.some(statement => ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && name(statement.expression.expression) === wrapper.name.text), "RSC registration is not initialized at module level");
  const options = calls[0].arguments[0];
  assert.ok(ts.isObjectLiteralExpression(options));
  const loader = options.properties.find(property => name(property.name) === "load");
  assert.ok(loader && ts.isPropertyAssignment(loader) && ts.isArrowFunction(loader.initializer));
  const accesses = nodes(loader.initializer.body, ts.isElementAccessExpression);
  assert.equal(accesses.length, 1, "Unexpected RSC lookup implementation");
  const mapName = name(accesses[0].expression);
  assert.equal(name(accesses[0].argumentExpression), name(loader.initializer.parameters[0].name));
  assert.ok(ts.isVariableDeclaration(accesses[0].parent), "Lookup must bind the selected loader");
  const selectedName = name(accesses[0].parent.name);
  const lookupReturns = nodes(loader.initializer.body, ts.isReturnStatement);
  assert.equal(lookupReturns.length, 1);
  assert.ok(ts.isCallExpression(lookupReturns[0].expression) && name(lookupReturns[0].expression.expression) === selectedName && lookupReturns[0].expression.arguments.length === 0, "Lookup must return the selected loader result");
  const declarations = tree.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]);
  const map = declarations.find(item => name(item.name) === mapName)?.initializer;
  assert.ok(map && ts.isObjectLiteralExpression(map), "Active client map missing");
  const result = new Map();
  for (const property of map.properties) {
    const id = name(property.name);
    assert.match(id ?? "", /^[a-f0-9]{12}$/);
    assert.ok(!result.has(id), `Duplicate client reference ${id}`);
    assert.ok(ts.isPropertyAssignment(property) && ts.isArrowFunction(property.initializer));
    const body = property.initializer.body;
    const returned = body.statements?.filter(ts.isReturnStatement);
    assert.equal(returned?.length, 1, `Unsupported loader ${id}`);
    assert.ok(ts.isObjectLiteralExpression(returned[0].expression));
    const exports = new Set();
    let localName;
    for (const getter of returned[0].expression.properties) {
      assert.ok(ts.isGetAccessor(getter), `Unsupported client export ${id}`);
      assert.equal(getter.body.statements.length, 1, "Client getter must only return its binding");
      const value = getter.body.statements[0];
      assert.ok(ts.isReturnStatement(value) && ts.isPropertyAccessExpression(value.expression));
      const getterName = name(getter.name);
      assert.equal(value.expression.name.text, getterName);
      localName ??= name(value.expression.expression);
      assert.equal(name(value.expression.expression), localName);
      assert.ok(!exports.has(getterName));
      exports.add(getterName);
    }
    const loaded = nodes(body, node => ts.isVariableDeclaration(node) && name(node.name) === localName);
    assert.equal(loaded.length, 1);
    assert.ok(loaded[0].initializer && ts.isAwaitExpression(loaded[0].initializer));
    const preload = loaded[0].initializer.expression;
    assert.ok(ts.isCallExpression(preload), "Loader must await its preload call");
    const loadCallback = preload.arguments[0];
    assert.ok(loadCallback && ts.isArrowFunction(loadCallback) && ts.isCallExpression(loadCallback.body), "Loader must return a direct import or namespace promise");
    const operation = loadCallback.body;
    if (operation.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const target = literal(operation.arguments[0]);
      assert.ok(target, "Computed client loader target");
      result.set(id, {exports, target});
    } else {
      assert.ok(ts.isPropertyAccessExpression(operation.expression) && operation.expression.name.text === "then", "Unsupported namespace load");
      const promise = operation.expression.expression;
      assert.ok(ts.isCallExpression(promise) && promise.expression.getText(tree) === "Promise.resolve" && promise.arguments.length === 0, "Namespace loader must resolve its namespace");
      const callback = operation.arguments[0];
      assert.ok(ts.isArrowFunction(callback) && ts.isIdentifier(callback.body));
      const namespace = declarations.find(item => name(item.name) === callback.body.text)?.initializer;
      assert.ok(namespace && ts.isCallExpression(namespace) && ts.isObjectLiteralExpression(namespace.arguments[0]), "Same-chunk namespace missing");
      const namespaceExports = new Set(namespace.arguments[0].properties.map(item => name(item.name)));
      for (const item of exports) assert.ok(namespaceExports.has(item), `Missing namespace export ${id}:${item}`);
      result.set(id, {exports, target: null});
    }
  }
  return result;
}

export async function verifyExportBindings(siteRoot) {
  const read = file => readFile(resolve(siteRoot, file), "utf8");
  const manifest = JSON.parse(await read("dist/client/.vite/manifest.json"));
  const serverAssetsText = await read("dist/server/__vite_rsc_assets_manifest.js");
  assert.ok(serverAssetsText.startsWith("export default "));
  const serverAssets = JSON.parse(serverAssetsText.slice("export default ".length).trim().replace(/;$/, ""));
  const entry = manifest["virtual:vinext-app-browser-entry"]?.file;
  assert.ok(entry, "Vite browser entry missing");
  assert.equal(serverAssets.bootstrapScriptContent, `import(${JSON.stringify("/" + entry)})`);
  const modules = new Map();
  for (const item of Object.values(manifest)) {
    assetPath(item.file);
    const text = await read("pages-dist/" + item.file);
    assert.equal(text, await read("dist/client/" + item.file), `Export differs from built module ${item.file}`);
    modules.set(item.file, {tree: parse(item.file, text), text, item});
  }
  let edges = 0;
  for (const [file, module] of modules) {
    const declarations = nodes(module.tree, node => ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier);
    for (const statement of declarations) {
      const target = modulePath(file, literal(statement.moduleSpecifier));
      assert.ok(modules.has(target), `Missing imported module ${target}`);
      const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : statement.exportClause;
      const required = [];
      if (ts.isImportDeclaration(statement) && statement.importClause?.name) required.push("default");
      if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) required.push(...bindings.elements.map(item => (item.propertyName ?? item.name).text));
      const available = exportedNames(modules.get(target).tree);
      for (const binding of required) assert.ok(available.has(binding), `Missing export ${binding} in ${target}`);
      edges++;
    }
    for (const call of nodes(module.tree, node => ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)) {
      const target = modulePath(file, literal(call.arguments[0]));
      assert.ok(modules.has(target), `Missing dynamic module ${target}`); edges++;
    }
    for (const key of [...module.item.imports ?? [], ...module.item.dynamicImports ?? []]) {
      assert.ok(manifest[key] && modules.has(manifest[key].file), `Dangling manifest edge ${key}`);
    }
    // Vite's preload table references whole output-relative asset filenames.
    for (const node of nodes(module.tree, node => literal(node)?.startsWith("assets/"))) {
      assert.ok(modules.has(literal(node)), `Missing preloaded module ${literal(node)}`);
    }
    const preloadCalls = nodes(module.tree, node => ts.isCallExpression(node) && name(node.expression) === "__vite__mapDeps");
    if (preloadCalls.length) {
      const tables = nodes(module.tree, node => ts.isVariableDeclaration(node) && name(node.name) === "__vite__mapDeps");
      assert.equal(tables.length, 1, "Missing preload map");
      const arrays = nodes(tables[0].initializer, ts.isArrayLiteralExpression);
      assert.equal(arrays.length, 1, "Unsupported preload table");
      const table = arrays[0].elements.map(literal);
      assert.ok(table.every(file => modules.has(file)), "Invalid preload table entry");
      for (const call of preloadCalls) {
        assert.ok(call.arguments.length === 1 && ts.isArrayLiteralExpression(call.arguments[0]), "Computed preload indices unsupported");
        for (const index of call.arguments[0].elements) {
          assert.ok(ts.isNumericLiteral(index) && Number.isInteger(Number(index.text)) && Number(index.text) >= 0 && Number(index.text) < table.length, "Preload index out of bounds");
        }
      }
    }
  }
  const map = inspectClientMap(modules.get(entry).text);
  assert.deepEqual([...map.keys()].sort(), Object.keys(serverAssets.clientReferenceDeps).sort(), "Server/browser reference IDs differ");
  for (const [id, loader] of map) {
    const target = loader.target ? modulePath(entry, loader.target) : entry;
    if (loader.target) for (const binding of loader.exports) assert.ok(exportedNames(modules.get(target).tree).has(binding), `Missing client export ${id}:${binding}`);
    const dependencies = serverAssets.clientReferenceDeps[id];
    assert.ok(dependencies.js.includes("/" + target), `Loader target absent from server assets: ${id}`);
    for (const file of [...dependencies.js, ...dependencies.css]) {
      assert.ok(file.startsWith("/") && !file.startsWith("//"));
      await read("pages-dist/" + assetPath(file.slice(1)));
    }
  }
  const serverTree = parse("server.js", await read("dist/server/index.js"));
  const serverRefs = new Set(nodes(serverTree, node => ts.isCallExpression(node) && name(node.expression) === "registerClientReference" && node.arguments.length === 3).map(call => `${literal(call.arguments[1])}:${literal(call.arguments[2])}`));
  for (const [id, loader] of map) for (const binding of loader.exports) assert.ok(serverRefs.has(`${id}:${binding}`), `Server registration missing ${id}:${binding}`);
  const buildIds = new Set(nodes(serverTree, node => ts.isPropertyAssignment(node) && name(node.name) === "deploymentVersion" && literal(node.initializer)).map(node => literal(node.initializer)));
  assert.equal(buildIds.size, 1, "Ambiguous server build identity");
  const html = await read("build/local-preview/models-vinext.html");
  const bootstraps = [...html.matchAll(/import\(["'](\/assets\/index-[^"']+)["']\)/g)].map(match => match[1]);
  assert.deepEqual(bootstraps, ["/" + entry], "HTML bootstrap does not match build");
  for (const [, url] of html.matchAll(/<link[^>]+href="(\/assets\/[^\"]+)"/g)) {
    assert.ok(!/[?#]/.test(url), `Preload identity differs: ${url}`);
    assert.ok(modules.has(url.slice(1)), `Missing HTML preload ${url}`);
  }
  const records = decodeFlight(html), imports = records.filter(row => row.kind === "import");
  const rows = new Map(records.filter(row => row.id).map(row => [row.id, row]));
  function validateReferences(value) {
    if (typeof value === "string") {
      const reference = value.match(/^\$(L?)([a-f0-9]+)$/);
      if (reference) {
        assert.ok(rows.has(reference[2]), `Missing Flight row ${reference[2]}`);
      }
    } else if (Array.isArray(value)) value.forEach(validateReferences);
    else if (value && typeof value === "object") Object.values(value).forEach(validateReferences);
  }
  records.filter(row => row.kind === "model").forEach(row => validateReferences(row.value));
  assert.ok(imports.length, "No Flight imports");
  for (const {value} of imports) {
    assert.ok(Array.isArray(value) && value.length === 4 && value[3] === 1, "Unsupported Flight import tuple");
    const [id, chunks, binding] = value;
    assert.ok(Array.isArray(chunks) && chunks.length === 0, "Unexpected Flight chunk format");
    assert.ok(map.get(id)?.exports.has(binding), `Unresolvable Flight import ${id}:${binding}`);
  }
  for (const {value} of records.filter(row => row.kind === "hint")) {
    const [url, kind] = value;
    assert.ok(url.startsWith("/"));
    await read("pages-dist/" + assetPath(url.split("?")[0].slice(1)));
    assert.ok(html.includes(`href="${url.replaceAll("&", "&amp;")}"`), `Flight ${kind} hint differs from HTML ${url}`);
  }
  const compatibility = records.filter(row => row.kind === "model").map(row => row.value?.__artifactCompatibility).filter(Boolean);
  assert.equal(compatibility.length, 1, "Flight build identity missing");
  assert.ok(buildIds.has(compatibility[0].deploymentVersion), "Flight belongs to a different build");
  return {modules: modules.size, edges, clientReferences: map.size, flightImports: imports.length, deploymentVersion: compatibility[0].deploymentVersion};
}
