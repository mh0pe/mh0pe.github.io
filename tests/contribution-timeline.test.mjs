import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/components/contribution-story/timeline.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const timelineModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function fixture() {
  return {
    publicOnly: true,
    beats: [
      {
        id: "later",
        repository: "mh0pe/example",
        date: "2026-02-01T00:00:00Z",
      },
      {
        id: "earlier",
        repository: "mh0pe/example",
        date: "2026-01-01T00:00:00Z",
      },
    ],
    nodes: [
      {
        id: "repository:mh0pe/example",
        type: "repository",
        evidenceIds: [],
      },
      {
        id: "commit:shared",
        type: "commit",
        repository: "mh0pe/example",
        evidenceIds: ["later", "earlier"],
        date: "2026-01-01T00:00:00Z",
      },
      {
        id: "file:src/index.ts",
        type: "file",
        evidenceIds: ["earlier"],
      },
    ],
    edges: [
      {
        id: "commit-file",
        source: "commit:shared",
        target: "file:src/index.ts",
        kind: "commit-touches-file",
        evidenceId: "earlier",
      },
    ],
  };
}

test("orders public events chronologically and reveals roots first", () => {
  const timeline = timelineModule.createContributionTimeline(fixture());
  assert.equal(timeline.moments[0].evidenceId, "earlier");
  assert.equal(timeline.nodeRevealAt["repository:mh0pe/example"], 0);
  assert.ok(
    timeline.nodeRevealAt["commit:shared"] <=
      timeline.edgeRevealAt["commit-file"],
  );
});

test("keeps exact commit/file edges distinct from Git ancestry", () => {
  assert.deepEqual(
    timelineModule.getContributionEdgeSemantics({
      kind: "commit-touches-file",
    }),
    {
      relationship: "commit-changed-file",
      isLiteralCommitAncestry: false,
      revealPolicy: "endpoints",
    },
  );
});

test("rejects graphs that are not explicitly public-only", () => {
  assert.throws(
    () =>
      timelineModule.createContributionTimeline({
        ...fixture(),
        publicOnly: false,
      }),
    /public-only graph/,
  );
});
