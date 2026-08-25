import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const siteRoot = new URL("../", import.meta.url);
const physicsModule = await tsImport(
  "../app/components/contribution-story/gource-physics.ts",
  import.meta.url,
);

async function readGraph(id) {
  return JSON.parse(
    await readFile(
      new URL(`app/data/project-graphs/${id}.json`, siteRoot),
      "utf8",
    ),
  );
}

function settle(runtime, frameRate = 60, seconds = 5) {
  const frameCount = frameRate * seconds;
  for (let frame = 0; frame < frameCount; frame += 1) {
    runtime.tick(1 / frameRate);
  }
}

function renderedSpan(runtime) {
  const xs = runtime.nodes.map((node) =>
    physicsModule.gourceSceneCoordinate(node.x, node.anchorX),
  );
  const ys = runtime.nodes.map((node) =>
    physicsModule.gourceSceneCoordinate(node.y, node.anchorY),
  );
  return Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
}

test("keeps the persistent physics world to repository hierarchy nodes", async () => {
  const graph = await readGraph("automated-security-helper");
  const runtime = physicsModule.createGourcePhysics(graph);

  assert.ok(
    runtime.nodes.every((node) =>
      ["repository", "directory", "file"].includes(node.graphNode.type),
    ),
  );
  assert.ok(
    runtime.links.every((link) =>
      ["contains-directory", "contains-subdirectory", "contains-file"].includes(
        link.graphEdge.kind,
      ),
    ),
  );

  runtime.dispose();
});

test("settles every public graph into finite artwork-scale bounds", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("app/data/project-graphs/manifest.json", siteRoot),
      "utf8",
    ),
  );

  for (const graphId of manifest.graphIds) {
    const graph = await readGraph(graphId);
    const runtime = physicsModule.createGourcePhysics(graph);
    runtime.activateEvidence(graph.beats.at(-1).id);
    settle(runtime);

    assert.ok(
      runtime.nodes.every(
        (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
      ),
      `${graphId} produced a non-finite coordinate`,
    );
    assert.ok(
      renderedSpan(runtime) < 6,
      `${graphId} escaped the artwork viewport`,
    );
    runtime.dispose();
  }
});

test("fixed-step physics advances consistently across refresh rates", async () => {
  const graph = await readGraph("portable-frameworks");
  const sixty = physicsModule.createGourcePhysics(graph);
  const highRefresh = physicsModule.createGourcePhysics(graph);
  const evidenceId = graph.beats.at(-1).id;

  sixty.activateEvidence(evidenceId);
  highRefresh.activateEvidence(evidenceId);
  settle(sixty, 60, 1);
  settle(highRefresh, 144, 1);

  assert.ok(
    Math.abs(sixty.simulation.alpha() - highRefresh.simulation.alpha()) < 0.01,
  );
  assert.ok(Math.abs(renderedSpan(sixty) - renderedSpan(highRefresh)) < 0.08);

  sixty.dispose();
  highRefresh.dispose();
});

test("future hierarchy does not perturb an earlier contribution bloom", async () => {
  const graph = await readGraph("portable-frameworks");
  assert.ok(graph.beats.length > 1);
  const firstEvidenceId = graph.beats[0].id;
  const futureEvidenceId = graph.beats.at(-1).id;
  const repository = graph.nodes.find((node) => node.type === "repository");
  assert.ok(repository);

  const withFutureBranch = structuredClone(graph);
  const futureNodeId = `file:${repository.repository}:future-only.fixture`;
  withFutureBranch.nodes.push({
    id: futureNodeId,
    type: "file",
    label: "future-only.fixture",
    path: "future-only.fixture",
    href: `${repository.href}/blob/future/future-only.fixture`,
    repository: repository.repository,
    status: "added",
    evidenceIds: [futureEvidenceId],
    x: 2.9,
    y: -2.9,
    z: 0.05,
    weight: 1,
  });
  withFutureBranch.edges.push({
    id: `contains-file:${repository.id}:${futureNodeId}`,
    source: repository.id,
    target: futureNodeId,
    kind: "contains-file",
  });

  const baseline = physicsModule.createGourcePhysics(graph);
  const extended = physicsModule.createGourcePhysics(withFutureBranch);
  baseline.activateEvidence(firstEvidenceId);
  extended.activateEvidence(firstEvidenceId);
  settle(baseline, 60, 2);
  settle(extended, 60, 2);

  for (const baselineNode of baseline.nodes.filter(
    (node) => node.revealIndex === 0,
  )) {
    const extendedNode = extended.nodeById.get(baselineNode.id);
    assert.ok(extendedNode);
    assert.ok(Math.abs((baselineNode.x ?? 0) - (extendedNode.x ?? 0)) < 1e-6);
    assert.ok(Math.abs((baselineNode.y ?? 0) - (extendedNode.y ?? 0)) < 1e-6);
  }

  baseline.dispose();
  extended.dispose();
});

test("repository anchors remain stable when another root appears", async () => {
  const graph = await readGraph("automated-security-helper");
  const existingRepository = graph.nodes.find(
    (node) => node.type === "repository",
  );
  assert.ok(existingRepository);
  const extendedGraph = structuredClone(graph);
  extendedGraph.nodes.push({
    ...existingRepository,
    id: "repository:mh0pe/future-root",
    label: "mh0pe/future-root",
    href: "https://github.com/mh0pe/future-root",
    repository: "mh0pe/future-root",
  });

  const baseline = physicsModule.createGourcePhysics(graph);
  const extended = physicsModule.createGourcePhysics(extendedGraph);
  const before = baseline.nodeById.get(existingRepository.id);
  const after = extended.nodeById.get(existingRepository.id);
  assert.ok(before && after);
  assert.equal(before.anchorX, after.anchorX);
  assert.equal(before.anchorY, after.anchorY);
  assert.equal(before.fx, after.fx);
  assert.equal(before.fy, after.fy);

  baseline.dispose();
  extended.dispose();
});

test("fixed repository roots retain collision-safe visual spacing", async () => {
  const graph = await readGraph("portable-frameworks");
  const runtime = physicsModule.createGourcePhysics(graph);
  const repositories = runtime.nodes.filter(
    (node) => node.graphNode.type === "repository",
  );
  assert.ok(repositories.length > 1);

  for (let leftIndex = 0; leftIndex < repositories.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < repositories.length;
      rightIndex += 1
    ) {
      const left = repositories[leftIndex];
      const right = repositories[rightIndex];
      const distance = Math.hypot(
        physicsModule.gourceSceneCoordinate(left.fx, left.anchorX) -
          physicsModule.gourceSceneCoordinate(right.fx, right.anchorX),
        physicsModule.gourceSceneCoordinate(left.fy, left.anchorY) -
          physicsModule.gourceSceneCoordinate(right.fy, right.anchorY),
      );
      assert.ok(
        distance >= 0.52,
        `${left.id} and ${right.id} overlap at ${distance.toFixed(3)}`,
      );
    }
  }

  runtime.dispose();
});
