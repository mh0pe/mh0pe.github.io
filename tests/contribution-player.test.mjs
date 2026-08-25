import assert from "node:assert/strict";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const graphDataModule = await tsImport(
  "../app/components/contribution-story/graph-loaders.ts",
  import.meta.url,
);
const playerModule = await tsImport(
  "../app/components/contribution-story/player.ts",
  import.meta.url,
);
const playerRecordModule = await tsImport(
  "../app/components/contribution-story/player-record-loaders.ts",
  import.meta.url,
);

test("builds a linked player record for every complete source entity", () => {
  for (const graphId of expectedProjectGraphIds) {
    const graph = graphDataModule.getContributionGraph(graphId);
    const records = playerRecordModule.getContributionPlayerRecords(graphId);
    const items = playerModule.createContributionPlayerItems(graph, records);
    const nodeIds = new Set(items.map((item) => item.nodeId).filter(Boolean));

    assert.equal(
      items.filter((item) => item.kind === "repository").length,
      records.repositories.length,
      `${graphId} repository records`,
    );
    assert.equal(
      items.filter(
        (item) =>
          item.kind === "pull-request" || item.kind === "direct-change",
      ).length,
      records.changes.length,
      `${graphId} change records`,
    );
    assert.equal(
      items.filter((item) => item.kind === "commit").length,
      records.changes.reduce(
        (total, change) => total + change.commits.length,
        0,
      ),
      `${graphId} complete commit records`,
    );
    assert.equal(
      items.filter((item) => item.kind === "file").length,
      records.changes.reduce(
        (total, change) => total + change.files.length,
        0,
      ),
      `${graphId} complete file records`,
    );
    for (const change of records.changes) {
      for (const commit of change.commits) {
        assert.ok(
          items.some(
            (item) =>
              item.kind === "commit" &&
              item.evidenceId === change.id &&
              item.commitId === commit.sha,
          ),
          `${graphId} commit ${change.id}:${commit.sha}`,
        );
      }
      for (const file of change.files) {
        assert.ok(
          items.some(
            (item) =>
              item.kind === "file" &&
              item.evidenceId === change.id &&
              item.label === file.path,
          ),
          `${graphId} file ${change.id}:${file.path}`,
        );
      }
    }
    for (const nodeId of nodeIds) {
      assert.ok(
        graph.nodes.some((node) => node.id === nodeId),
        `${graphId} visual node ${nodeId}`,
      );
    }
    for (const item of items) {
      assert.match(item.href, /^https:\/\/github\.com\//);
      assert.ok(item.repository.includes("/"));
      assert.ok(item.label.length > 0);
      assert.ok(item.description.length > 0);
      assert.ok(item.facts.length > 0);
    }
  }
});

test("filters the same source catalog without manufacturing new records", () => {
  const graph = graphDataModule.getContributionGraph(
    "automated-security-helper",
  );
  const records = playerRecordModule.getContributionPlayerRecords(
    "automated-security-helper",
  );
  const items = playerModule.createContributionPlayerItems(graph, records);
  const filters = {
    repositories: new Set(["repository"]),
    changes: new Set(["pull-request", "direct-change"]),
    commits: new Set(["commit"]),
    files: new Set(["file"]),
  };

  assert.strictEqual(
    playerModule.filterContributionPlayerItems(items, "all"),
    items,
  );
  for (const [filter, allowedKinds] of Object.entries(filters)) {
    const filtered = playerModule.filterContributionPlayerItems(items, filter);
    assert.ok(filtered.length > 0);
    assert.ok(filtered.every((item) => allowedKinds.has(item.kind)));
    assert.ok(filtered.every((item) => items.includes(item)));
  }
});
