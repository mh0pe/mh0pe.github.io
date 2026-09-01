import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import {
  assertContributionGraphV2,
  CONTRIBUTION_GRAPH_SCHEMA_VERSION,
} from "../app/data/contribution-graph-contract.mjs";
import { writeCompactGraphCatalog } from "./build-compact-project-graphs.mjs";
import { writeProjectPlayerRecords } from "./build-project-player-records.mjs";

const execFileAsync = promisify(execFile);
const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(siteRoot, "..");
const historyRoot = resolve(
  process.env.PUBLIC_HISTORY_EXPORT ??
    resolve(
      workspaceRoot,
      "github-history-export/output/2026-07-24-public-contributions-v2",
    ),
);
const outputRoot = resolve(siteRoot, "app/data/project-graphs");
const attributionPath = resolve(siteRoot, "app/data/agent-attribution.json");
const portfolioAccounts = new Set(["mh0pe", "awsmadi"]);
const maxCommitsPerEvidence = 6;
const maxFilesPerEvidence = 10;
const maxCommitDetailConcurrency = 5;
const maxGraphNodes = 100;
const maxGraphEdges = 180;
const graphSpecRank = new Map(
  [
    "automated-security-helper",
    "cloudformation-guard",
    "nix-windows",
    "portable-frameworks",
    "rules-js-pnp",
    "lightpanda-svg",
    "aws-labs-mcp",
    "cloud-runtime",
  ].map((id, index) => [id, index]),
);

const graphSpecs = [
  {
    id: "automated-security-helper",
    chapterId: "security",
    title: "Automated Security Helper",
    attributionRepositories: ["awslabs/automated-security-helper"],
    impact:
      "One workspace can be secured as a system while every project retains its own execution boundary, policy context, verdict, and traceable output.",
    evidences: [
      pr(
        "ash-workspace",
        "Workspace orchestration stack",
        "awslabs/automated-security-helper",
        456,
        "upstream",
      ),
      pr(
        "ash-mcp-confinement",
        "Operator-controlled MCP targets",
        "awslabs/automated-security-helper",
        477,
        "upstream",
      ),
      pr(
        "ash-distributed",
        "Distributed execution and deployable targets",
        "awslabs/automated-security-helper",
        494,
        "public-fork",
      ),
      pr(
        "ash-transpiler",
        "Fifteen-platform agent transpiler",
        "awslabs/automated-security-helper",
        331,
        "upstream",
      ),
    ],
  },
  {
    id: "cloudformation-guard",
    chapterId: "security",
    title: "CloudFormation Guard correctness",
    attributionRepositories: [
      "aws-cloudformation/cloudformation-guard",
      "awsmadi/cloudformation-guard",
      "aws-cloudformation/aws-guard-rules-registry",
      "awsmadi/aws-guard-rules-registry",
    ],
    impact:
      "Policy automation earns trust when each result traces to a rule that loaded, executed, and produced the intended decision.",
    evidences: [
      pr(
        "guard-enforcement",
        "Fail-open evaluator audit",
        "aws-cloudformation/cloudformation-guard",
        717,
        "upstream",
      ),
      pr(
        "guard-outcomes",
        "Four-valued outcome model",
        "aws-cloudformation/cloudformation-guard",
        720,
        "public-fork",
      ),
      pr(
        "guard-query-reporting",
        "Query, parser, and reporter integrity",
        "aws-cloudformation/cloudformation-guard",
        727,
        "public-fork",
      ),
      pr(
        "guard-registry-operands",
        "Explicit operand semantics",
        "aws-cloudformation/aws-guard-rules-registry",
        285,
        "public-fork",
      ),
      pr(
        "guard-registry-pack",
        "Assembled rule-pack assurance",
        "aws-cloudformation/aws-guard-rules-registry",
        287,
        "public-fork",
      ),
      pr(
        "guard-registry-tests",
        "Executable per-resource expectations",
        "aws-cloudformation/aws-guard-rules-registry",
        288,
        "public-fork",
      ),
    ],
  },
  {
    id: "nix-windows",
    chapterId: "durability",
    title: "Nix on Windows",
    attributionRepositories: [
      "NixOS/nix",
      "awsmadi/nix",
      "nix-windows/nix-windows-demo",
      "awsmadi/nix-windows-demo",
    ],
    impact:
      "Nix now has an upstream Windows derivation builder, broader Windows test compilation, and whole-project cross-build assurance.",
    evidences: [
      pr(
        "nix-builder",
        "Minimal Windows derivation builder",
        "NixOS/nix",
        16347,
        "upstream",
      ),
      pr(
        "nix-cert-startup",
        "Certificate-path startup handling",
        "NixOS/nix",
        16364,
        "upstream",
      ),
      pr(
        "nix-big-coff",
        "Large COFF objects for Windows targets",
        "NixOS/nix",
        16367,
        "upstream",
      ),
      pr(
        "nix-cross-build-ci",
        "Whole-project Windows cross-build",
        "NixOS/nix",
        16368,
        "upstream",
      ),
      pr(
        "nix-store-deletion",
        "Handle-relative Windows store deletion",
        "NixOS/nix",
        16359,
        "public-fork",
      ),
      pr(
        "nix-cert-config",
        "Post-startup certificate configuration",
        "NixOS/nix",
        16383,
        "public-fork",
      ),
      pr(
        "nix-validation-harness",
        "Independent Windows build-result checks",
        "nix-windows/nix-windows-demo",
        1,
        "public-fork",
      ),
    ],
  },
  {
    id: "rules-js-pnp",
    chapterId: "durability",
    title: "Integrity-bound Yarn PnP for Bazel",
    attributionRepositories: ["aspect-build/rules_js", "mh0pe/rules_js"],
    impact:
      "Bazel can consume Yarn 3 and 4 zero-install projects without running Yarn or synthesizing node_modules, while verifying the resolver graph and cached package material.",
    evidences: [
      pr(
        "rules-js-pnp",
        "Yarn PnP zero-install importer",
        "aspect-build/rules_js",
        2957,
        "public-fork",
      ),
    ],
  },
  {
    id: "lightpanda-svg",
    chapterId: "browser",
    title: "Lightpanda SVG DOM",
    attributionRepositories: ["lightpanda-io/browser", "mh0pe/browser"],
    impact:
      "Automation gains a typed SVG DOM whose dependency-ordered public stack is usable from prototype inheritance through text metrics.",
    evidences: [
      pr(
        "svg-prototypes",
        "Prototype chains",
        "lightpanda-io/browser",
        3012,
        "upstream",
      ),
      pr(
        "svg-scalars",
        "Live scalar values",
        "lightpanda-io/browser",
        3034,
        "upstream",
      ),
      pr(
        "svg-collections",
        "Transactional collections",
        "lightpanda-io/browser",
        3030,
        "upstream",
      ),
      pr(
        "svg-geometry",
        "Analytic geometry",
        "lightpanda-io/browser",
        3033,
        "upstream",
      ),
      pr(
        "svg-structure",
        "Structural SVG DOM",
        "lightpanda-io/browser",
        3031,
        "upstream",
      ),
      pr(
        "svg-resources",
        "Resource elements",
        "lightpanda-io/browser",
        3029,
        "upstream",
      ),
      pr(
        "svg-text",
        "Deterministic text DOM",
        "lightpanda-io/browser",
        3032,
        "upstream",
      ),
    ],
  },
  {
    id: "portable-frameworks",
    chapterId: "agents",
    title: "Portable agent frameworks",
    attributionRepositories: [
      "ChristopherKahler/base-v1",
      "ChristopherKahler/carl",
      "ChristopherKahler/paul",
      "ChristopherKahler/seed",
      "mh0pe/base-v1",
      "mh0pe/carl",
      "mh0pe/paul",
      "mh0pe/seed",
      "johnhuang316/code-index-mcp",
      "awsmadi/code-index-mcp",
    ],
    impact:
      "Reviewed experience becomes operating policy for later agent teams through portable decision memory, delegation, planning, and learning loops.",
    evidences: [
      pr(
        "portable-base",
        "BASE state and integration hardening",
        "mh0pe/base-v1",
        2,
        "public-fork",
      ),
      pr(
        "portable-carl-runtime",
        "CARL multi-CLI runtime",
        "mh0pe/carl",
        2,
        "public-fork",
      ),
      pr(
        "portable-paul",
        "PAUL integration",
        "mh0pe/paul",
        1,
        "public-fork",
      ),
      pr(
        "portable-seed",
        "SEED integration",
        "mh0pe/seed",
        1,
        "public-fork",
      ),
      pr(
        "code-index-skill",
        "Index-first agent skill",
        "johnhuang316/code-index-mcp",
        111,
        "public-fork",
      ),
    ],
  },
  {
    id: "aws-labs-mcp",
    chapterId: "agents",
    title: "AWS Labs MCP",
    attributionRepositories: ["awslabs/mcp", "awsmadi/mcp"],
    impact:
      "Agents can ingest richer documents and work through explicit transport and browser-session boundaries.",
    evidences: [
      pr(
        "mcp-doc-loader",
        "Slide images and size controls",
        "awslabs/mcp",
        2586,
        "upstream",
      ),
      pr(
        "mcp-transport",
        "Streamable HTTP and SSE",
        "awslabs/mcp",
        2645,
        "public-fork",
      ),
      pr(
        "mcp-assets",
        "Document asset extraction",
        "awslabs/mcp",
        2658,
        "public-fork",
      ),
      pr(
        "mcp-browser",
        "Isolated browser sessions",
        "awslabs/mcp",
        2740,
        "public-fork",
      ),
    ],
  },
  {
    id: "cloud-runtime",
    chapterId: "cloud",
    title: "AWS CDK and jsii",
    attributionRepositories: [
      "aws/aws-cdk-cli",
      "awsmadi/aws-cdk-cli",
      "aws/aws-cdk",
      "awsmadi/aws-cdk",
      "aws/jsii",
      "awsmadi/jsii",
    ],
    impact:
      "Cloud changes surface sooner while the cross-language runtime repeats less work and sheds completed state.",
    evidences: [
      pr(
        "cdk-foreach",
        "Visible Fn::ForEach changes",
        "aws/aws-cdk-cli",
        1063,
        "upstream",
      ),
      pr(
        "cdk-quicksight",
        "Shared CCAPI hotswap",
        "aws/aws-cdk-cli",
        1457,
        "upstream",
      ),
      pr(
        "cdk-doc-exports",
        "Executable documentation contract",
        "aws/aws-cdk",
        38675,
        "upstream",
      ),
      pr("jsii-promises", "Promise cleanup", "aws/jsii", 5054, "upstream"),
      pr("jsii-types", "Cached type lookup", "aws/jsii", 5055, "upstream"),
      pr("jsii-members", "Indexed member lookup", "aws/jsii", 5056, "upstream"),
      pr(
        "jsii-runtime",
        "Smaller runtime bundle",
        "aws/jsii",
        5057,
        "upstream",
      ),
    ],
  },
].sort((left, right) => {
  const leftRank = graphSpecRank.get(left.id);
  const rightRank = graphSpecRank.get(right.id);
  if (leftRank === undefined || rightRank === undefined) {
    throw new Error(`Missing contribution graph order for ${left.id} or ${right.id}.`);
  }
  return leftRank - rightRank;
});

function pr(id, label, repository, number, availability) {
  return {
    id,
    label,
    repository,
    number,
    availability,
    kind: "pull-request",
    href: `https://github.com/${repository}/pull/${number}`,
  };
}

async function readJsonLines(path) {
  const source = await readFile(path, "utf8");
  return source
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function ghJson(
  endpoint,
  { paged = false, flattenPages = true, cache = true } = {},
) {
  const args = ["api"];
  if (cache) {
    args.push("--cache", "1h");
  }
  if (paged) {
    args.push("--paginate", "--slurp");
  }
  args.push(endpoint);
  const { stdout } = await execFileAsync("gh", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);
  return paged && flattenPages ? parsed.flat() : parsed;
}

async function ghCommitDetail(repository, sha) {
  const pages = await ghJson(
    `repos/${repository}/commits/${sha}?per_page=100`,
    { paged: true, flattenPages: false, cache: false },
  );
  const firstPage = pages[0];
  if (!firstPage || typeof firstPage !== "object") {
    throw new Error(
      `GitHub returned no commit detail for ${repository}@${sha}.`,
    );
  }
  return {
    ...firstPage,
    files: pages.flatMap((page) =>
      Array.isArray(page.files) ? page.files : [],
    ),
  };
}

async function withRetry(operation, attempts = 3) {
  let latestError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      latestError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolvePromise) =>
          setTimeout(resolvePromise, 250 * 2 ** attempt),
        );
      }
    }
  }
  throw latestError;
}

async function mapLimit(values, limit, worker) {
  const results = new Array(values.length);
  let cursor = 0;

  async function consume() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, consume),
  );
  return results;
}

function sampleEvenly(values, limit) {
  if (values.length <= limit) {
    return values;
  }
  const picked = [];
  for (let index = 0; index < limit; index += 1) {
    picked.push(
      values[
        Math.round((index / Math.max(1, limit - 1)) * (values.length - 1))
      ],
    );
  }
  return [...new Map(picked.map((value) => [value.sha, value])).values()];
}

function commitDetailKey(repository, sha) {
  return `${repository}@${sha.toLowerCase()}`;
}

function exactCommitSummary(detail, expected) {
  if (
    typeof detail.sha !== "string" ||
    detail.sha.toLowerCase() !== expected.sha.toLowerCase()
  ) {
    throw new Error(
      `GitHub returned an unexpected commit while hydrating ${expected.repository}@${expected.sha}.`,
    );
  }

  return {
    sha: detail.sha,
    html_url: detail.html_url ?? expected.html_url,
    commit: detail.commit ?? expected.commit,
    exactFiles: Array.isArray(detail.files)
      ? detail.files
          .filter(
            (file) =>
              typeof file.filename === "string" &&
              typeof file.status === "string" &&
              Number.isSafeInteger(file.additions) &&
              file.additions >= 0 &&
              Number.isSafeInteger(file.deletions) &&
              file.deletions >= 0 &&
              Number.isSafeInteger(file.changes) &&
              file.changes >= 0,
          )
          .map((file) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
          }))
      : [],
  };
}

async function hydrateSampledCommitDetails(
  items,
  fetchCommitDetail = ({ repository, sha }) => ghCommitDetail(repository, sha),
) {
  const selections = items.map((item) =>
    sampleEvenly(item.evidence.commits, maxCommitsPerEvidence),
  );
  const detailsByKey = new Map();

  for (const item of items) {
    for (const detail of item.evidence.sampledCommits ?? []) {
      detailsByKey.set(
        commitDetailKey(item.evidence.repository, detail.sha),
        detail,
      );
    }
  }

  const requestsByKey = new Map();
  selections.forEach((commits, itemIndex) => {
    const { repository } = items[itemIndex].evidence;
    for (const entry of commits) {
      const key = commitDetailKey(repository, entry.sha);
      if (!detailsByKey.has(key) && !requestsByKey.has(key)) {
        requestsByKey.set(key, { key, repository, entry });
      }
    }
  });

  const fetched = await mapLimit(
    [...requestsByKey.values()],
    maxCommitDetailConcurrency,
    async ({ key, repository, entry }) => {
      let detail;
      try {
        detail = await withRetry(() =>
          fetchCommitDetail({
            repository,
            sha: entry.sha,
          }),
        );
      } catch {
        process.stderr.write(
          `[project-graphs] Exact commit detail unavailable for ${repository}@${entry.sha.slice(0, 12)}; retaining evidence-level file relationships.\n`,
        );
        return { key, detail: null };
      }
      return {
        key,
        detail: exactCommitSummary(detail, {
          ...entry,
          repository,
        }),
      };
    },
  );
  for (const { key, detail } of fetched) {
    if (detail) {
      detailsByKey.set(key, detail);
    }
  }

  return items.map((item, itemIndex) => {
    const selectedCommits = selections[itemIndex];
    const selectedKeys = selectedCommits.map((entry) =>
      commitDetailKey(item.evidence.repository, entry.sha),
    );
    const hydratedCount = selectedKeys.filter((key) =>
      detailsByKey.has(key),
    ).length;
    return {
      ...item,
      evidence: {
        ...item.evidence,
        exactCommitDetailCoverage: {
          requested: selectedKeys.length,
          resolved: hydratedCount,
          unavailable: selectedKeys.length - hydratedCount,
        },
        sampledCommits: selectedCommits.map((entry) => {
          const detail = detailsByKey.get(
            commitDetailKey(item.evidence.repository, entry.sha),
          );
          return detail ?? entry;
        }),
      },
    };
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function nodeRadius(node) {
  const base = {
    repository: 14,
    evidence: 10,
    commit: 5,
    directory: 7,
    file: 4,
  }[node.type];
  return base + Math.min(5, Math.log2(Math.max(1, node.weight ?? 1)));
}

function linkDistance(edge) {
  return {
    "contains-directory": 58,
    "contains-file": 34,
    "contains-subdirectory": 42,
    "documents-change": 82,
    "includes-commit": 28,
    "commit-touches-file": 44,
    "touches-file": 64,
  }[edge.kind];
}

function layoutGraph(graph) {
  const repositoryNodes = graph.nodes.filter(
    (node) => node.type === "repository",
  );
  const repositoryIndexById = new Map(
    repositoryNodes.map((node, index) => [node.id, index]),
  );
  const mutableNodes = graph.nodes.map((node, index) => {
    const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
    const repositoryIndex = repositoryIndexById.get(node.id);
    const repositoryAngle =
      ((repositoryIndex ?? 0) / Math.max(1, repositoryNodes.length)) *
        Math.PI *
        2 -
      Math.PI / 2;
    const repositoryRadius = repositoryNodes.length > 1 ? 38 : 0;
    const repositoryX = Math.cos(repositoryAngle) * repositoryRadius;
    const repositoryY = Math.sin(repositoryAngle) * repositoryRadius;
    const radius =
      node.type === "repository"
        ? 0
        : node.type === "evidence"
          ? 95
          : node.type === "directory"
            ? 145
            : node.type === "file"
              ? 205
              : 120;
    return {
      ...node,
      x: node.type === "repository" ? repositoryX : Math.cos(angle) * radius,
      y: node.type === "repository" ? repositoryY : Math.sin(angle) * radius,
      ...(node.type === "repository"
        ? { fx: repositoryX, fy: repositoryY }
        : {}),
    };
  });
  const mutableEdges = graph.edges.map((edge) => ({ ...edge }));
  const simulation = forceSimulation(mutableNodes)
    .randomSource(seededRandom(hashString(graph.id)))
    .force(
      "link",
      forceLink(mutableEdges)
        .id((node) => node.id)
        .distance(linkDistance)
        .strength((edge) => (edge.kind === "touches-file" ? 0.16 : 0.44))
        .iterations(2),
    )
    .force("charge", forceManyBody().strength(-46).distanceMax(320))
    .force("collision", forceCollide(nodeRadius).strength(0.88).iterations(2))
    .force("x", forceX(0).strength(0.026))
    .force("y", forceY(0).strength(0.032))
    .stop();

  simulation.tick(220);

  const movable = mutableNodes.filter((node) => node.type !== "repository");
  const maxX = Math.max(1, ...movable.map((node) => Math.abs(node.x ?? 0)));
  const maxY = Math.max(1, ...movable.map((node) => Math.abs(node.y ?? 0)));
  const semanticDepth = {
    repository: -0.9,
    directory: -0.45,
    file: 0.05,
    evidence: 0.55,
    commit: 0.95,
  };

  return {
    ...graph,
    nodes: mutableNodes.map((mutableNode) => {
      const node = Object.fromEntries(
        Object.entries(mutableNode).filter(
          ([key]) => !["fx", "fy", "vx", "vy", "index"].includes(key),
        ),
      );
      return {
        ...node,
        x: Number((((mutableNode.x ?? 0) / maxX) * 2.65).toFixed(4)),
        y: Number((((mutableNode.y ?? 0) / maxY) * 1.68).toFixed(4)),
        z: semanticDepth[mutableNode.type],
      };
    }),
  };
}

function shortCommitLabel(message) {
  return message
    .split(/\r?\n/, 1)[0]
    .replace(/^(feat|fix|chore|refactor|test|docs)(\([^)]+\))?:\s*/i, "");
}

function directoryChain(filename) {
  const parts = filename.split("/");
  if (parts.length === 1) {
    return [];
  }
  const directories = [];
  const depth = Math.min(2, parts.length - 1);
  for (let index = 1; index <= depth; index += 1) {
    directories.push(parts.slice(0, index).join("/"));
  }
  return directories;
}

function addNode(graph, node) {
  const existing = graph.nodeMap.get(node.id);
  if (existing) {
    if (node.evidenceIds?.length) {
      existing.evidenceIds = [
        ...new Set([...(existing.evidenceIds ?? []), ...node.evidenceIds]),
      ];
    }
    existing.weight = Math.max(existing.weight ?? 1, node.weight ?? 1);
    return existing;
  }
  graph.nodes.push(node);
  graph.nodeMap.set(node.id, node);
  return node;
}

function addEdge(graph, edge) {
  const id = `${edge.kind}:${edge.source}:${edge.target}:${edge.evidenceId ?? ""}`;
  if (graph.edgeIds.has(id)) {
    return;
  }
  graph.edgeIds.add(id);
  graph.edges.push({ id, ...edge });
}

function pullRequestIntegrationStatus(pullRequest) {
  if (pullRequest.merged_at || pullRequest.state === "merged") {
    return "merged";
  }
  return pullRequest.state === "open" ? "open" : "closed-unmerged";
}

function isAccountDirectedCopilotPullRequest(pullRequest, publicExportRecord) {
  const liveAuthor = (
    pullRequest?.user?.login ??
    pullRequest?.author ??
    ""
  ).toLowerCase();
  const exportedAuthor = (publicExportRecord?.author ?? "").toLowerCase();
  const attributedAccounts =
    publicExportRecord?.search_attributed_accounts ?? [];
  if (
    liveAuthor !== "copilot" ||
    exportedAuthor !== "copilot" ||
    attributedAccounts.length !== 1 ||
    !portfolioAccounts.has(attributedAccounts[0])
  ) {
    return false;
  }

  const attributedAccount = attributedAccounts[0];
  const searchDiscoveries = (publicExportRecord.discoveries ?? []).filter(
    (discovery) => discovery.kind === "search_author_query",
  );
  const relatedAccounts =
    publicExportRecord.classification?.related_accounts ?? [];
  const exportedHeadRepository = publicExportRecord.head?.repository;
  const liveHeadRepository =
    pullRequest.head?.repo?.full_name ?? pullRequest.head?.repository;

  return (
    searchDiscoveries.length === 1 &&
    searchDiscoveries[0].account === attributedAccount &&
    publicExportRecord.search_author_matches_detail === false &&
    publicExportRecord.classification?.authored_by_account === false &&
    publicExportRecord.classification?.head_repository_owned_by_account ===
      true &&
    relatedAccounts.length === 1 &&
    relatedAccounts[0] === attributedAccount &&
    exportedHeadRepository === liveHeadRepository &&
    exportedHeadRepository?.split("/")[0] === attributedAccount &&
    publicExportRecord.head?.repository_deleted === false &&
    publicExportRecord.head?.repository_unavailable === false
  );
}

function assertPortfolioPullRequest(evidence, pullRequest, publicExportRecord) {
  if (!pullRequest || !publicExportRecord) {
    throw new Error(`Missing public export record for ${evidence.href}.`);
  }
  const liveAuthor = pullRequest.user?.login ?? pullRequest.author;
  const humanAuthored = portfolioAccounts.has(liveAuthor);
  const copilotSubmittedOnBehalf = isAccountDirectedCopilotPullRequest(
    pullRequest,
    publicExportRecord,
  );
  if (!humanAuthored && !copilotSubmittedOnBehalf) {
    throw new Error(
      `${evidence.href} is not attributed to mh0pe or awsmadi in the public export.`,
    );
  }
}

function immutableDirectoryHref(repository, referenceSha, directory) {
  const encodedDirectory = directory
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://github.com/${repository}/tree/${referenceSha}/${encodedDirectory}`;
}

async function hydrateEvidence(evidence, prByUrl) {
  if (evidence.kind === "commit") {
    const detail = await ghCommitDetail(evidence.repository, evidence.sha);
    if (
      ![detail.author?.login, detail.committer?.login].some((account) =>
        portfolioAccounts.has(account),
      )
    ) {
      throw new Error(
        `${evidence.href} is not attributed to mh0pe or awsmadi by GitHub.`,
      );
    }
    const exactCommit = exactCommitSummary(detail, {
      repository: evidence.repository,
      sha: evidence.sha,
      html_url: evidence.href,
      commit: detail.commit,
    });
    return {
      ...evidence,
      commits: [
        {
          sha: exactCommit.sha,
          html_url: exactCommit.html_url,
          commit: exactCommit.commit,
        },
      ],
      sampledCommits: [exactCommit],
      files: detail.files ?? [],
      date:
        detail.commit?.author?.date ?? detail.commit?.committer?.date ?? null,
      integrationStatus: "direct-commit",
      referenceSha: detail.sha,
    };
  }

  const publicExportRecord = prByUrl.get(evidence.href);
  const [pullRequest, files, commits] = await Promise.all([
    ghJson(`repos/${evidence.repository}/pulls/${evidence.number}`, {
      cache: false,
    }),
    ghJson(
      `repos/${evidence.repository}/pulls/${evidence.number}/files?per_page=100`,
      { paged: true, cache: false },
    ),
    ghJson(
      `repos/${evidence.repository}/pulls/${evidence.number}/commits?per_page=100`,
      { paged: true, cache: false },
    ),
  ]);
  assertPortfolioPullRequest(evidence, pullRequest, publicExportRecord);
  const dates = commits
    .flatMap((entry) => [
      entry.commit?.author?.date,
      entry.commit?.committer?.date,
    ])
    .filter(Boolean)
    .sort();
  return {
    ...evidence,
    files,
    commits,
    date: dates.at(-1) ?? null,
    integrationStatus: pullRequestIntegrationStatus(pullRequest),
    referenceSha:
      pullRequest.head?.sha ?? commits.at(-1)?.sha ?? pullRequest.base?.sha,
  };
}

function changedFileWeight(file) {
  return file.changes ?? (file.additions ?? 0) + (file.deletions ?? 0);
}

function selectRepresentativeFiles(evidence, selectedCommits) {
  const aggregateByPath = new Map(
    evidence.files.map((file) => [file.filename, file]),
  );
  const exactWeights = new Map();
  for (const commitEntry of selectedCommits) {
    for (const file of commitEntry.exactFiles ?? []) {
      exactWeights.set(
        file.filename,
        Math.max(exactWeights.get(file.filename) ?? 0, changedFileWeight(file)),
      );
    }
  }
  const exactCandidates = [...exactWeights.entries()]
    .map(([filename, weight]) => ({
      file: aggregateByPath.get(filename),
      weight,
    }))
    .filter((entry) => entry.file)
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        left.file.filename.localeCompare(right.file.filename),
    )
    .slice(0, Math.min(6, maxFilesPerEvidence))
    .map((entry) => entry.file);
  const selectedByPath = new Map(
    exactCandidates.map((file) => [file.filename, file]),
  );
  const aggregateCandidates = [...evidence.files].sort(
    (left, right) =>
      changedFileWeight(right) - changedFileWeight(left) ||
      left.filename.localeCompare(right.filename),
  );
  for (const file of aggregateCandidates) {
    if (selectedByPath.size >= maxFilesPerEvidence) {
      break;
    }
    selectedByPath.set(file.filename, file);
  }
  return [...selectedByPath.values()];
}

function exactDetailCoverage(evidence) {
  if (evidence.exactCommitDetailCoverage) {
    return evidence.exactCommitDetailCoverage;
  }
  const sampledCommits =
    evidence.sampledCommits ??
    sampleEvenly(evidence.commits, maxCommitsPerEvidence);
  const resolved = sampledCommits.filter((entry) =>
    Array.isArray(entry.exactFiles),
  ).length;
  return {
    requested: sampledCommits.length,
    resolved,
    unavailable: sampledCommits.length - resolved,
  };
}

function buildGraph(spec, evidences, agentBySha, prByUrl, agents) {
  const orderedEvidences = [...evidences].sort(
    (left, right) =>
      (left.date ?? "").localeCompare(right.date ?? "") ||
      left.id.localeCompare(right.id),
  );
  const detailCoverage = orderedEvidences.map(exactDetailCoverage).reduce(
    (totals, coverage) => ({
      requested: totals.requested + coverage.requested,
      resolved: totals.resolved + coverage.resolved,
      unavailable: totals.unavailable + coverage.unavailable,
    }),
    { requested: 0, resolved: 0, unavailable: 0 },
  );
  const graph = {
    schemaVersion: CONTRIBUTION_GRAPH_SCHEMA_VERSION,
    id: spec.id,
    chapterId: spec.chapterId,
    title: spec.title,
    impact: spec.impact,
    publicOnly: true,
    caption:
      "Public code branching through repositories, commits, and files. Each beat shows up to six representative commits and ten highest-change files. Exact commit-to-file routes come only from sampled GitHub details; grouped routes preserve the reviewed pull-request shape. The composition is not a claim of literal Git ancestry.",
    sampling: {
      representative: true,
      maxCommitsPerEvidence,
      maxFilesPerEvidence,
      exactCommitDetails: detailCoverage,
    },
    agents,
    nodes: [],
    edges: [],
    beats: [],
    exactEdgesByEvidence: [],
    nodeMap: new Map(),
    edgeIds: new Set(),
  };
  const repositories = [
    ...new Set(orderedEvidences.map((item) => item.repository)),
  ];

  for (const repository of repositories) {
    addNode(graph, {
      id: `repository:${repository}`,
      type: "repository",
      label: repository,
      href: `https://github.com/${repository}`,
      repository,
      weight: 8,
      evidenceIds: [],
    });
  }

  for (const evidence of orderedEvidences) {
    if (!evidence.referenceSha) {
      throw new Error(`Missing immutable reference SHA for ${evidence.href}.`);
    }
    const prRecord = prByUrl.get(evidence.href);
    const evidenceNodeId = `evidence:${evidence.id}`;
    addNode(graph, {
      id: evidenceNodeId,
      type: "evidence",
      label: evidence.label,
      href: evidence.href,
      repository: evidence.repository,
      availability: evidence.availability,
      evidenceIds: [evidence.id],
      date: evidence.date,
      weight:
        prRecord?.reported_counts?.changed_files ?? evidence.files.length ?? 1,
    });
    addEdge(graph, {
      source: `repository:${evidence.repository}`,
      target: evidenceNodeId,
      kind: "documents-change",
      evidenceId: evidence.id,
    });

    const selectedCommits =
      evidence.sampledCommits ??
      sampleEvenly(evidence.commits, maxCommitsPerEvidence);
    const commitNodeIdBySha = new Map();
    for (const entry of selectedCommits) {
      const agentId = agentBySha.get(entry.sha) ?? null;
      const commitNodeId = `commit:${evidence.id}:${entry.sha}`;
      commitNodeIdBySha.set(entry.sha, commitNodeId);
      addNode(graph, {
        id: commitNodeId,
        type: "commit",
        label: shortCommitLabel(entry.commit?.message ?? entry.sha.slice(0, 7)),
        href: entry.html_url,
        repository: evidence.repository,
        evidenceIds: [evidence.id],
        date:
          entry.commit?.author?.date ??
          entry.commit?.committer?.date ??
          evidence.date,
        agentId,
        sha: entry.sha,
        weight: 2,
      });
      addEdge(graph, {
        source: evidenceNodeId,
        target: commitNodeId,
        kind: "includes-commit",
        evidenceId: evidence.id,
      });
    }

    const topFiles = selectRepresentativeFiles(evidence, selectedCommits);
    const fileNodeIdByPath = new Map();
    for (const file of topFiles) {
      const directories = directoryChain(file.filename);
      let parentId = `repository:${evidence.repository}`;
      for (const directory of directories) {
        const directoryId = `directory:${evidence.repository}:${directory}`;
        addNode(graph, {
          id: directoryId,
          type: "directory",
          label: directory,
          href: immutableDirectoryHref(
            evidence.repository,
            evidence.referenceSha,
            directory,
          ),
          repository: evidence.repository,
          evidenceIds: [evidence.id],
          weight: 2,
        });
        addEdge(graph, {
          source: parentId,
          target: directoryId,
          kind: parentId.startsWith("repository:")
            ? "contains-directory"
            : "contains-subdirectory",
        });
        parentId = directoryId;
      }

      const fileNodeId = `file:${evidence.repository}:${file.filename}`;
      fileNodeIdByPath.set(file.filename, fileNodeId);
      addNode(graph, {
        id: fileNodeId,
        type: "file",
        label: file.filename.split("/").at(-1),
        path: file.filename,
        href: file.blob_url,
        repository: evidence.repository,
        status: file.status,
        evidenceIds: [evidence.id],
        weight: Math.max(1, file.changes ?? file.additions + file.deletions),
      });
      addEdge(graph, {
        source: parentId,
        target: fileNodeId,
        kind: "contains-file",
      });
      addEdge(graph, {
        source: evidenceNodeId,
        target: fileNodeId,
        kind: "touches-file",
        evidenceId: evidence.id,
      });
    }

    const exactEdgesByCommit = [];
    for (const entry of selectedCommits) {
      const source = commitNodeIdBySha.get(entry.sha);
      if (!source || !Array.isArray(entry.exactFiles)) {
        continue;
      }
      const exactEdges = [];
      for (const file of entry.exactFiles) {
        const target = fileNodeIdByPath.get(file.filename);
        if (!target) {
          continue;
        }
        exactEdges.push({
          source,
          target,
          kind: "commit-touches-file",
          evidenceId: evidence.id,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        });
      }
      if (exactEdges.length > 0) {
        exactEdgesByCommit.push(exactEdges);
      }
    }
    graph.exactEdgesByEvidence.push(exactEdgesByCommit);
    const detailCoverageForEvidence = exactDetailCoverage(evidence);
    const displayableRelationCount = exactEdgesByCommit.reduce(
      (total, relations) => total + relations.length,
      0,
    );

    graph.beats.push({
      id: evidence.id,
      label: evidence.label,
      href: evidence.href,
      availability: evidence.availability,
      integrationStatus: evidence.integrationStatus,
      kind: evidence.kind,
      repository: evidence.repository,
      date: evidence.date,
      commitCount: evidence.commits.length,
      changedFileCount: evidence.files.length,
      displayedCommitCount: selectedCommits.length,
      displayedFileCount: topFiles.length,
      files: topFiles.map((file) => ({
        nodeId: fileNodeIdByPath.get(file.filename),
        label: file.filename.split("/").at(-1),
        path: file.filename,
        href: file.blob_url,
        repository: evidence.repository,
        status: file.status,
      })),
      exactCommitFileCoverage: {
        sampledCommitCount: selectedCommits.length,
        resolvedCommitCount: detailCoverageForEvidence.resolved,
        unavailableCommitCount: detailCoverageForEvidence.unavailable,
        displayableRelationCount,
        displayedRelationCount: 0,
      },
    });
  }

  const exactEdgeBudget = Math.max(0, maxGraphEdges - graph.edges.length);
  let exactEdgeCount = 0;
  const displayedRelationsByEvidence = new Map();
  for (
    let relationIndex = 0;
    exactEdgeCount < exactEdgeBudget;
    relationIndex += 1
  ) {
    let foundRelation = false;
    for (const relationsByCommit of graph.exactEdgesByEvidence) {
      for (const relations of relationsByCommit) {
        const relation = relations[relationIndex];
        if (!relation) {
          continue;
        }
        foundRelation = true;
        const edgeCountBefore = graph.edges.length;
        addEdge(graph, relation);
        if (graph.edges.length > edgeCountBefore) {
          exactEdgeCount += 1;
          displayedRelationsByEvidence.set(
            relation.evidenceId,
            (displayedRelationsByEvidence.get(relation.evidenceId) ?? 0) + 1,
          );
        }
        if (exactEdgeCount >= exactEdgeBudget) {
          break;
        }
      }
      if (exactEdgeCount >= exactEdgeBudget) {
        break;
      }
    }
    if (!foundRelation) {
      break;
    }
  }
  for (const beat of graph.beats) {
    beat.exactCommitFileCoverage.displayedRelationCount =
      displayedRelationsByEvidence.get(beat.id) ?? 0;
  }

  return layoutGraph({
    schemaVersion: graph.schemaVersion,
    id: graph.id,
    chapterId: graph.chapterId,
    title: graph.title,
    impact: graph.impact,
    publicOnly: graph.publicOnly,
    caption: graph.caption,
    sampling: graph.sampling,
    agents: graph.agents,
    nodes: graph.nodes,
    edges: graph.edges,
    beats: graph.beats,
  });
}

function buildAgentSummary(spec, attribution, agentCatalog) {
  const agentRepositories = new Set(spec.attributionRepositories);
  const buckets = new Map();
  for (const entry of attribution.commits) {
    if (
      !entry.repositories.some((repository) =>
        agentRepositories.has(repository),
      )
    ) {
      continue;
    }
    const current = buckets.get(entry.agentId) ?? {
      recordedCommitCount: 0,
      associatedCodeAdditions: 0,
    };
    buckets.set(entry.agentId, {
      recordedCommitCount: current.recordedCommitCount + 1,
      associatedCodeAdditions:
        current.associatedCodeAdditions + entry.additions.code,
    });
  }
  return [...buckets.entries()]
    .map(([agentId, totals]) => {
      const agent = agentCatalog.get(agentId);
      return {
        id: agent?.id,
        label: agent?.label,
        provider: agent?.provider,
        aliases: agent?.aliases,
        marker: agent?.marker,
        ...totals,
        attributionScope: "repository-family",
      };
    })
    .filter((agent) => agent.id)
    .sort(
      (left, right) =>
        right.associatedCodeAdditions - left.associatedCodeAdditions ||
        right.recordedCommitCount - left.recordedCommitCount,
    );
}

async function assertEvidenceRepositoriesArePublic(prByUrl) {
  const repositories = new Set();
  for (const spec of graphSpecs) {
    for (const evidence of spec.evidences) {
      repositories.add(evidence.repository);
      const pullRequest = prByUrl.get(evidence.href);
      if (pullRequest?.head?.repository) {
        repositories.add(pullRequest.head.repository);
      }
    }
  }
  const records = await mapLimit(
    [...repositories].sort(),
    5,
    async (repository) => ({
      repository,
      metadata: await ghJson(`repos/${repository}`, { cache: false }),
    }),
  );
  for (const { repository, metadata } of records) {
    if (metadata.private !== false || metadata.visibility !== "public") {
      throw new Error(
        `${repository} is not verified public; refusing to generate portfolio data.`,
      );
    }
  }
}

function assertPublicSafeGraph(graph) {
  assertContributionGraphV2(graph, graph.id);
  if (
    graph.nodes.length > maxGraphNodes ||
    graph.edges.length > maxGraphEdges
  ) {
    throw new Error(
      `${graph.id} exceeds the graph budget (${graph.nodes.length} nodes, ${graph.edges.length} edges).`,
    );
  }
  const forbiddenKey = /^(authorization|body|email|patch|token)$/i;
  const unsafeString =
    /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/Users\/|\/home\/|[A-Z]:\\|github_pat_|ghp_|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~-]+)/i;
  const visit = (value, path = graph.id) => {
    if (typeof value === "string" && unsafeString.test(value)) {
      throw new Error(`Unsafe string found at ${path}.`);
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (typeof value !== "object" || value === null) {
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (forbiddenKey.test(key)) {
        throw new Error(`Forbidden field ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  };
  visit(graph);

  for (const evidence of [...graph.nodes, ...graph.beats]) {
    if (
      typeof evidence.href === "string" &&
      !evidence.href.startsWith("https://github.com/")
    ) {
      throw new Error(
        `Non-GitHub evidence URL in ${graph.id}: ${evidence.href}`,
      );
    }
  }
}

async function main() {
  const [pullRequests, attribution, historyManifest] = await Promise.all([
    readJsonLines(resolve(historyRoot, "pull_requests.jsonl")),
    readFile(attributionPath, "utf8").then(JSON.parse),
    readFile(resolve(historyRoot, "manifest.json"), "utf8").then(JSON.parse),
  ]);
  if (
    historyManifest.public_only !== true ||
    historyManifest.status !== "complete" ||
    !Number.isFinite(Date.parse(historyManifest.completed_at))
  ) {
    throw new Error("Public history export is incomplete or invalid.");
  }
  if (attribution.snapshot?.publicOnly !== true) {
    throw new Error("Agent attribution input must be public-only.");
  }
  if (
    attribution.snapshot.sourceExportGeneratedAt !==
    historyManifest.completed_at
  ) {
    throw new Error(
      "Agent attribution does not match the selected public history export.",
    );
  }
  const agentBySha = new Map(
    attribution.commits.map((entry) => [entry.sha, entry.agentId]),
  );
  const agentCatalog = new Map(
    attribution.agents.map((agent) => [agent.id, agent]),
  );
  const prByUrl = new Map(
    pullRequests.map((pullRequest) => [pullRequest.html_url, pullRequest]),
  );
  await assertEvidenceRepositoriesArePublic(prByUrl);
  const flattened = graphSpecs.flatMap((spec) =>
    spec.evidences.map((evidence) => ({ graphId: spec.id, evidence })),
  );
  const aggregateHydrated = await mapLimit(flattened, 5, async (item) => ({
    graphId: item.graphId,
    evidence: await hydrateEvidence(item.evidence, prByUrl),
  }));
  const hydrated = await hydrateSampledCommitDetails(aggregateHydrated);
  const incompleteHydration = hydrated.filter(
    ({ evidence }) => evidence.exactCommitDetailCoverage.unavailable > 0,
  );
  if (incompleteHydration.length > 0) {
    throw new Error(
      `Exact commit hydration failed for ${incompleteHydration
        .map(
          ({ evidence }) =>
            `${evidence.repository}:${evidence.id} (${evidence.exactCommitDetailCoverage.unavailable})`,
        )
        .join(", ")}; refusing to write incomplete graph artifacts.`,
    );
  }
  const grouped = new Map();
  for (const item of hydrated) {
    const values = grouped.get(item.graphId) ?? [];
    values.push(item.evidence);
    grouped.set(item.graphId, values);
  }

  await mkdir(outputRoot, { recursive: true });
  const manifest = {
    schemaVersion: CONTRIBUTION_GRAPH_SCHEMA_VERSION,
    publicOnly: true,
    generatedAt: new Date().toISOString(),
    sourceExport: historyRoot.split("/").at(-1),
    sourceExportCompletedAt: historyManifest.completed_at,
    sourceExportRunId: historyManifest.run_id,
    graphIds: graphSpecs.map((spec) => spec.id),
  };
  const graphs = graphSpecs.map((spec) => {
    const graph = buildGraph(
      spec,
      grouped.get(spec.id) ?? [],
      agentBySha,
      prByUrl,
      buildAgentSummary(spec, attribution, agentCatalog),
    );
    assertPublicSafeGraph(graph);
    return graph;
  });
  const playerRecords = await writeProjectPlayerRecords({
    specs: graphSpecs,
    hydrated,
    agentBySha,
    sourceExport: historyRoot.split("/").at(-1),
    sourceExportCompletedAt: historyManifest.completed_at,
    sourceExportRunId: historyManifest.run_id,
  });
  await Promise.all([
    writeFile(
      resolve(outputRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
    ...graphs.map(async (graph) => {
      await writeFile(
        resolve(outputRoot, `${graph.id}.json`),
        `${JSON.stringify(graph)}\n`,
      );
    }),
    writeCompactGraphCatalog(graphs),
  ]);

  const totals = graphs.map((graph) => ({
    id: graph.id,
    beats: graph.beats.length,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  }));
  process.stdout.write(
    `${JSON.stringify({ manifest, totals, playerRecords }, null, 2)}\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}

export {
  buildGraph,
  hydrateSampledCommitDetails,
  isAccountDirectedCopilotPullRequest,
};
