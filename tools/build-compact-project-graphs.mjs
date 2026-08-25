import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  packContributionGraphCatalog,
  unpackContributionGraph,
} from "../app/data/contribution-graph-compact.mjs";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const graphRoot = resolve(siteRoot, "app/data/project-graphs");
const manifestPath = resolve(graphRoot, "manifest.json");
const outputPath = resolve(siteRoot, "app/data/project-graphs.compact.json");

export async function writeCompactGraphCatalog(graphs) {
  const catalog = packContributionGraphCatalog(graphs);
  for (const graph of graphs) {
    const unpacked = assertContributionGraphV2(
      unpackContributionGraph(catalog, graph.id),
      graph.id,
    );
    assert.deepEqual(unpacked, graph);
  }
  const source = `${JSON.stringify(catalog)}\n`;
  await writeFile(outputPath, source, "utf8");
  return {
    bytes: Buffer.byteLength(source),
    graphCount: graphs.length,
    stringCount: catalog.s.length,
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const graphs = await Promise.all(
    manifest.graphIds.map(async (graphId) =>
      assertContributionGraphV2(
        JSON.parse(
          await readFile(resolve(graphRoot, `${graphId}.json`), "utf8"),
        ),
        graphId,
      ),
    ),
  );
  const result = await writeCompactGraphCatalog(graphs);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
