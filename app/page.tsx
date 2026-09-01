/* eslint-disable @next/next/no-img-element -- Employer marks are local, fixed-dimension brand assets. */

import type { Metadata } from "next";
import { ActiveNav } from "./components/ActiveNav";
import AttributionExplorer from "./components/AttributionExplorer";
import {
  attributionModels,
  modelIdsForCommit,
  readAgentAttributionData,
  type AgentAttributionData,
} from "./components/attribution-model";
import {
  ContributionConstellation,
  type LineageAgentCluster,
} from "./components/ContributionConstellation";
import { ContributionCardPlayer } from "./components/contribution-story/ContributionCardPlayer";
import {
  ProjectConstellationBackdrop,
  ProjectModelSpectrum,
} from "./components/contribution-story/ProjectConstellationBackdrop";
import { HeroSignalGraphic } from "./components/HeroSignalGraphic";
import agentAttribution from "./data/agent-attribution.json";
import history from "./data/public-history-summary.json";
import professionalHistory from "./data/professional-history.json";
import trust from "./data/project-trust.json";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const agentAttributionData = readAgentAttributionData(agentAttribution);

const lineageRepositories: Readonly<Record<string, readonly string[]>> = {
  security: [
    "awslabs/automated-security-helper",
    "awsmadi/automated-security-helper",
    "aws-cloudformation/cloudformation-guard",
    "awsmadi/cloudformation-guard",
    "aws-cloudformation/aws-guard-rules-registry",
    "awsmadi/aws-guard-rules-registry",
  ],
  cloud: [
    "aws/aws-cdk",
    "aws/aws-cdk-cli",
    "aws/jsii",
    "awsmadi/aws-cdk",
    "awsmadi/aws-cdk-cli",
    "awsmadi/jsii",
  ],
  agents: [
    "awslabs/mcp",
    "awsmadi/mcp",
    "ChristopherKahler/base-v1",
    "ChristopherKahler/carl",
    "ChristopherKahler/paul",
    "ChristopherKahler/seed",
    "mh0pe/base-v1",
    "mh0pe/carl",
    "mh0pe/forgemax",
    "mh0pe/osint-tools-mcp-server",
    "mh0pe/paul",
    "mh0pe/plugins",
    "mh0pe/seed",
    "postrv/forgemax",
    "frishtik/osint-tools-mcp-server",
  ],
  browser: ["lightpanda-io/browser", "mh0pe/browser"],
  durability: [
    "NixOS/nix",
    "awsmadi/nix",
    "nix-windows/nix-windows-demo",
    "awsmadi/nix-windows-demo",
    "aspect-build/rules_js",
    "mh0pe/rules_js",
    "nextcloud/server",
    "mh0pe/server",
    "esp-rs/esp-idf-hal",
    "esp-rs/esp-idf-svc",
    "esp-rs/esp-idf-sys",
    "mh0pe/esp-idf-hal",
    "mh0pe/esp-idf-svc",
    "mh0pe/esp-idf-sys",
    "tooooools/html-to-svg",
  ],
};

function buildLineageAgentClusters(
  data: AgentAttributionData,
): readonly LineageAgentCluster[] {
  const models = new Map(
    attributionModels(data).map((model) => [model.id, model]),
  );

  return Object.entries(lineageRepositories).map(
    ([chapterId, repositories]) => {
      const repositorySet = new Set(repositories);
      const buckets = new Map<
        string,
        { commitCount: number; codeAdditions: number }
      >();

      for (const commit of data.commits) {
        if (
          !commit.repositories.some((repository) =>
            repositorySet.has(repository),
          )
        ) {
          continue;
        }

        const modelIds = modelIdsForCommit(data, commit);
        const share = 1 / Math.max(1, modelIds.length);
        for (const modelId of modelIds) {
          const current = buckets.get(modelId) ?? {
            commitCount: 0,
            codeAdditions: 0,
          };
          buckets.set(modelId, {
            commitCount: current.commitCount + share,
            codeAdditions: current.codeAdditions + commit.additions.code * share,
          });
        }
      }

      const signals = [...buckets.entries()]
        .map(([modelId, totals]) => {
          const model = models.get(modelId);
          return model
            ? {
                id: model.id,
                label: model.label,
                provider: model.provider,
                marker: model.marker,
                tone: model.tone,
                ...totals,
              }
            : null;
        })
        .filter((signal) => signal !== null)
        .sort(
          (left, right) =>
            right.codeAdditions - left.codeAdditions ||
            right.commitCount - left.commitCount ||
            left.label.localeCompare(right.label),
        );

      return { chapterId, signals };
    },
  );
}

const lineageAgentClusters = buildLineageAgentClusters(agentAttributionData);

const profiles = [
  {
    label: "GitHub · mh0pe",
    display: "GitHub · mh0pe",
    ariaLabel: "Madison Hope Steiner on GitHub as mh0pe",
    href: "https://github.com/mh0pe",
  },
  {
    label: "GitHub · awsmadi",
    display: "GitHub · awsmadi",
    ariaLabel: "Madison Hope Steiner on GitHub as awsmadi",
    href: "https://github.com/awsmadi",
  },
  {
    label: "LinkedIn",
    display: "LinkedIn",
    ariaLabel: "Madison Hope Steiner on LinkedIn",
    href: professionalHistory.profile_url,
  },
] as const;

const metrics = history.combined;
const snapshotDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${history.cutoff_date}T00:00:00Z`));

const featuredProjects = [
  {
    id: "automated-security-helper",
    graphId: "automated-security-helper",
    clusterId: "security",
    index: "01",
    title: "Automated Security Helper",
    repository: "awslabs / automated-security-helper",
    repositoryHref: "https://github.com/awslabs/automated-security-helper",
    period: "Contributor and public maintainer activity · 2024–2026",
    focus: "Workspace orchestration, MCP confinement, and deployable execution",
    status:
      "Workspace mode shipped in v3.7.0 · distributed public implementation available",
    context:
      "ASH coordinates source, dependency, infrastructure, and agent-workflow security across developer environments.",
    value:
      "Advanced ASH into workspace-scale security orchestration with inspectable plans, independently scoped project scans, project-aware reporting, workspace policy, and confined MCP access. A linked public implementation extends that model to distributed execution and deployable AWS targets.",
    contributions: [
      {
        evidenceId: "ash-workspace",
        text: "Shipped workspace planning and per-project execution, with aggregate results that retain project identity and workspace-level policy controls.",
      },
      {
        evidenceId: "ash-mcp-confinement",
        text: "Confined MCP scan targets to configured roots through canonical, symlink-aware containment and per-session isolation.",
      },
      {
        evidenceId: "ash-distributed",
        text: "Built a public execute-and-collect architecture with scanner sharding and deployable AgentCore, Fargate, Lambda, and CodePipeline targets.",
      },
      {
        evidenceId: "ash-assurance-python",
        text: "Strengthened measurement with broader Python package coverage and TypeScript gates whose denominator is pinned to the intended source set.",
      },
    ],
    links: [
      {
        kind: "Release",
        label: "ASH v3.7.0 · workspace mode shipped",
        href: "https://github.com/awslabs/automated-security-helper/releases/tag/v3.7.0",
        evidenceId: "ash-workspace",
      },
      {
        kind: "PR",
        label: "#456 · complete workspace stack · merged to main",
        href: "https://github.com/awslabs/automated-security-helper/pull/456",
        evidenceId: "ash-workspace",
      },
      {
        kind: "PR",
        label: "#462 · stacked project execution series",
        href: "https://github.com/awslabs/automated-security-helper/pull/462",
        evidenceId: "ash-workspace",
      },
      {
        kind: "PR",
        label: "#478 · stacked reporting and policy series",
        href: "https://github.com/awslabs/automated-security-helper/pull/478",
        evidenceId: "ash-workspace",
      },
      {
        kind: "PR",
        label: "#477 · confined MCP targets · merged",
        href: "https://github.com/awslabs/automated-security-helper/pull/477",
        evidenceId: "ash-mcp-confinement",
      },
      {
        kind: "Capability",
        label: "#493 · agent-driven workspace scans over MCP",
        href: "https://github.com/awslabs/automated-security-helper/pull/493",
      },
      {
        kind: "Prototype",
        label: "#494 · distributed execution and deployable targets",
        href: "https://github.com/awslabs/automated-security-helper/pull/494",
        evidenceId: "ash-distributed",
      },
      {
        kind: "Capability",
        label: "#499 · Python package coverage depth",
        href: "https://github.com/awslabs/automated-security-helper/pull/499",
      },
      {
        kind: "Capability",
        label: "#500 · TypeScript CI with pinned scope",
        href: "https://github.com/awslabs/automated-security-helper/pull/500",
      },
      {
        kind: "PR",
        label: "#331 · integrations for 15 agent platforms · merged",
        href: "https://github.com/awslabs/automated-security-helper/pull/331",
        evidenceId: "ash-transpiler",
      },
      {
        kind: "PR",
        label: "#440 · external scan assurance · merged",
        href: "https://github.com/awslabs/automated-security-helper/pull/440",
      },
      {
        kind: "Docs",
        label: "ASH documentation",
        href: "https://awslabs.github.io/automated-security-helper/",
      },
      {
        kind: "Repository",
        label: "Upstream source",
        href: "https://github.com/awslabs/automated-security-helper",
      },
    ],
  },
  {
    id: "cloudformation-guard",
    graphId: "cloudformation-guard",
    clusterId: "security",
    index: "02",
    title: "CloudFormation Guard correctness",
    repository: "aws-cloudformation / cloudformation-guard",
    repositoryHref:
      "https://github.com/aws-cloudformation/cloudformation-guard",
    period: "Contributor · 2026",
    focus: "Trustworthy evaluation, reporting, and published rule packs",
    status: "Core correction shipped in Guard 3.2.1 · rule-pack assurance available",
    context:
      "CloudFormation Guard evaluates infrastructure policy before deployment, where precise outcomes and trustworthy rule packs support confident decisions.",
    value:
      "Strengthened evaluator semantics and reporting, then extended the work into assembled-pack validation, executable rule tests, deterministic tooling, and publication gates tied to successful checks.",
    contributions: [
      {
        evidenceId: "guard-enforcement",
        text: "Made negation, empty references, scoping, mixed numeric comparisons, indexes, and reporter output preserve the intended policy result.",
      },
      {
        evidenceId: "guard-outcomes",
        text: "Designed a four-valued outcome model so unevaluatable and not-applicable states remain distinct instead of becoming false compliance.",
      },
      {
        evidenceId: "guard-query-reporting",
        text: "Extended the public implementation into query capture isolation, parser limits, reporter integrity, and tests that prove the intended rule path executed.",
      },
      {
        evidenceId: "guard-registry-pack",
        text: "Added assembled-pack validation across 50 distributions and paired orphaned tests with real per-resource rules while preserving published identifiers.",
      },
    ],
    links: [
      {
        kind: "PR",
        label: "#717 · verdict integrity correction · merged",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/717",
        evidenceId: "guard-enforcement",
      },
      {
        kind: "Release",
        label: "Guard 3.2.1 · shipped correction",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/releases/tag/3.2.1",
      },
      {
        kind: "PR",
        label: "#720 · outcome semantics",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/720",
        evidenceId: "guard-outcomes",
      },
      {
        kind: "PR",
        label: "#727 · query and reporter integrity",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/727",
        evidenceId: "guard-query-reporting",
      },
      {
        kind: "PR",
        label: "Rules registry #287 · assembled-pack assurance",
        href: "https://github.com/aws-cloudformation/aws-guard-rules-registry/pull/287",
        evidenceId: "guard-registry-pack",
      },
      {
        kind: "PR",
        label: "Rules registry #285 · explicit operand semantics",
        href: "https://github.com/aws-cloudformation/aws-guard-rules-registry/pull/285",
        evidenceId: "guard-registry-operands",
      },
      {
        kind: "PR",
        label: "Rules registry #288 · executable rule expectations",
        href: "https://github.com/aws-cloudformation/aws-guard-rules-registry/pull/288",
        evidenceId: "guard-registry-tests",
      },
      {
        kind: "Repository",
        label: "Working Guard fork",
        href: "https://github.com/awsmadi/cloudformation-guard",
      },
    ],
  },
  {
    id: "nix-windows",
    graphId: "nix-windows",
    clusterId: "durability",
    index: "03",
    title: "Nix on Windows",
    repository: "NixOS / nix + awsmadi / nix",
    repositoryHref: "https://github.com/NixOS/nix",
    period: "Contributor · 2026",
    focus: "Windows build execution, cross-build assurance, and lifecycle semantics",
    status: "Derivation builder and whole-project cross-build coverage merged",
    context:
      "Nix brings reproducible build and package semantics to a growing Windows implementation.",
    value:
      "Advanced the Windows build chain from its portability foundation to an upstream derivation builder, whole-project cross-build coverage, broader test compilation, and clearer platform-specific lifecycle semantics.",
    contributions: [
      {
        evidenceId: "nix-builder",
        text: "Introduced a deliberately scoped builder that executes supported derivations, registers valid store outputs, and reports build results under Wine.",
      },
      {
        evidenceId: "nix-cross-build-ci",
        text: "Enabled large COFF objects across Windows targets and expanded CI from a narrow utility suite to the complete MinGW cross-build graph.",
      },
      {
        evidenceId: "nix-cert-startup",
        text: "Improved certificate-path startup handling, with public-branch capabilities for handle-relative store cleanup and post-startup configuration loading.",
      },
    ],
    links: [
      {
        kind: "PR",
        label: "#16347 · Windows derivation builder · merged",
        href: "https://github.com/NixOS/nix/pull/16347",
        evidenceId: "nix-builder",
      },
      {
        kind: "PR",
        label: "#16367 · large COFF objects across Windows targets · merged",
        href: "https://github.com/NixOS/nix/pull/16367",
        evidenceId: "nix-big-coff",
      },
      {
        kind: "PR",
        label: "#16368 · cross-build every Windows component · merged",
        href: "https://github.com/NixOS/nix/pull/16368",
        evidenceId: "nix-cross-build-ci",
      },
      {
        kind: "PR",
        label: "#16364 · certificate-path startup handling · merged",
        href: "https://github.com/NixOS/nix/pull/16364",
        evidenceId: "nix-cert-startup",
      },
      {
        kind: "Capability",
        label: "#16359 · handle-relative Windows store deletion",
        href: "https://github.com/NixOS/nix/pull/16359",
        evidenceId: "nix-store-deletion",
      },
      {
        kind: "Capability",
        label: "#16383 · post-startup certificate configuration",
        href: "https://github.com/NixOS/nix/pull/16383",
        evidenceId: "nix-cert-config",
      },
      {
        kind: "Capability",
        label: "Working Windows implementation and branches",
        href: "https://github.com/awsmadi/nix",
      },
      {
        kind: "Capability",
        label: "Windows validation harness · independent result checks",
        href: "https://github.com/nix-windows/nix-windows-demo/pull/1",
        evidenceId: "nix-validation-harness",
      },
      {
        kind: "PR",
        label: "#16342 · Winsock initialization · merged",
        href: "https://github.com/NixOS/nix/pull/16342",
        evidenceId: "nix-winsock",
      },
      {
        kind: "PR",
        label: "#16343 · Windows store paths · merged",
        href: "https://github.com/NixOS/nix/pull/16343",
        evidenceId: "nix-aterm",
      },
      {
        kind: "PR",
        label: "#16345 · environment semantics · merged",
        href: "https://github.com/NixOS/nix/pull/16345",
        evidenceId: "nix-environment",
      },
      {
        kind: "PR",
        label: "#16354 · setEnv contract · merged",
        href: "https://github.com/NixOS/nix/pull/16354",
        evidenceId: "nix-setenv",
      },
      {
        kind: "PR",
        label: "#16355 · proxy variables · merged",
        href: "https://github.com/NixOS/nix/pull/16355",
        evidenceId: "nix-proxy",
      },
    ],
  },
  {
    id: "portable-frameworks",
    graphId: "portable-frameworks",
    clusterId: "agents",
    index: "04",
    title: "Organizational agent systems",
    repository: "mh0pe / base-v1 + carl + paul + seed",
    repositoryHref: "https://github.com/mh0pe/base-v1",
    period: "Builder and maintainer · 2026",
    focus: "Subagents, agent teams, decision memory, and recursive improvement",
    status: "Four portable frameworks · native plugins and multi-CLI runtimes",
    context:
      "BASE, CARL, PAUL, and SEED form an interoperable toolkit for organizing agent teams, retaining decisions, planning work, and improving the workflows that produce software.",
    value:
      "Helped pioneer the practical application of subagents, agent teams, durable decision memory, and organizational recursive self-improvement, then made that operating model portable across native plugins, skills directories, package runners, and multiple coding CLIs.",
    contributions: [
      {
        evidenceId: "portable-base",
        text: "Turned agent-team and improvement patterns into recoverable, TOML-backed state with explicit integration boundaries.",
      },
      {
        evidenceId: "portable-carl-runtime",
        text: "Made decision memory portable across plugin and multi-CLI runtimes, with session-start state and schema validation.",
      },
      {
        evidenceId: "portable-paul",
        text: "Packaged planning and workflow capabilities for native plugins, standalone skills directories, and project-root discovery.",
      },
      {
        evidenceId: "code-index-skill",
        text: "Extended the operating model with an installable code-index-first skill for staged reading, tool routing, and subagent guidance.",
      },
    ],
    links: [
      {
        kind: "PR",
        label: "BASE #2 · state and integration hardening",
        href: "https://github.com/mh0pe/base-v1/pull/2",
        evidenceId: "portable-base",
      },
      {
        kind: "PR",
        label: "CARL #2 · multi-CLI runtime · merged",
        href: "https://github.com/mh0pe/carl/pull/2",
        evidenceId: "portable-carl-runtime",
      },
      {
        kind: "PR",
        label: "CARL #3 · schema validation · merged",
        href: "https://github.com/mh0pe/carl/pull/3",
      },
      {
        kind: "Capability",
        label: "PAUL #1 · portable planning integration",
        href: "https://github.com/mh0pe/paul/pull/1",
        evidenceId: "portable-paul",
      },
      {
        kind: "Capability",
        label: "SEED #1 · portable workflow integration",
        href: "https://github.com/mh0pe/seed/pull/1",
        evidenceId: "portable-seed",
      },
      {
        kind: "Capability",
        label: "code-index-mcp #111 · index-first agent skill",
        href: "https://github.com/johnhuang316/code-index-mcp/pull/111",
        evidenceId: "code-index-skill",
      },
      {
        kind: "Docs",
        label: "BASE · session memory and reviewed insight-to-rule flow",
        href: "https://github.com/mh0pe/base-v1#per-session-meta-memory-psmm--session-intelligence",
      },
      {
        kind: "Docs",
        label: "CARL · selective decision recall",
        href: "https://github.com/mh0pe/carl#decisions",
      },
      {
        kind: "Docs",
        label: "PAUL · explicit subagent and reconciliation policy",
        href: "https://github.com/mh0pe/paul#in-session-context",
      },
      {
        kind: "Docs",
        label: "SEED · typed handoff into managed delivery",
        href: "https://github.com/mh0pe/seed#the-paul-connection--ideation-to-managed-build",
      },
    ],
  },
] as const;

const frontierWork = [
  {
    id: "rules-js-pnp",
    graphId: "rules-js-pnp",
    clusterId: "durability",
    index: "A",
    title: "Integrity-bound Yarn PnP for Bazel",
    repository: "aspect-build / rules_js + mh0pe / rules_js",
    period: "Contributor · 2026",
    status: "Available public implementation · upstream review active",
    text: "After maintainer feedback, I replaced an exporter design with a zero-install importer that never runs Yarn or constructs node_modules. It cross-validates Yarn 3 and 4 lock/PnP graphs, then integrity-binds the resolver, caches, unplugged files, file types, and executable modes before Bazel loads the project.",
    links: [
      {
        kind: "PR",
        label: "#2957 · Yarn PnP importer",
        href: "https://github.com/aspect-build/rules_js/pull/2957",
        evidenceId: "rules-js-pnp",
      },
      {
        kind: "Capability",
        label: "Exact public implementation branch",
        href: "https://github.com/mh0pe/rules_js/tree/codex/yarn-lock-repo-cache-v2.3.7",
        evidenceId: "rules-js-pnp",
      },
      {
        kind: "Repository",
        label: "rules_js source",
        href: "https://github.com/aspect-build/rules_js",
      },
    ],
  },
  {
    id: "lightpanda-svg",
    graphId: "lightpanda-svg",
    clusterId: "browser",
    index: "B",
    title: "A typed SVG DOM for an agent-native browser",
    repository: "lightpanda-io / browser + mh0pe / browser",
    period: "Contributor · 2026",
    status: "Seven capability layers merged upstream",
    text: "Lightpanda merged the complete dependency-ordered SVG stack: compile-time prototype chains, live scalar values, transactional collections, analytic path geometry and bounding boxes, stack-safe structural elements, typed resources, and deterministic UTF-8 text metrics.",
    links: [
      {
        kind: "PR",
        label: "#3012 · prototype chains · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3012",
        evidenceId: "svg-prototypes",
      },
      {
        kind: "PR",
        label: "#3034 · live scalar values · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3034",
        evidenceId: "svg-scalars",
      },
      {
        kind: "PR",
        label: "#3030 · transactional collections · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3030",
        evidenceId: "svg-collections",
      },
      {
        kind: "PR",
        label: "#3033 · analytic geometry and paths · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3033",
        evidenceId: "svg-geometry",
      },
      {
        kind: "PR",
        label: "#3031 · stack-safe structural DOM · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3031",
        evidenceId: "svg-structure",
      },
      {
        kind: "PR",
        label: "#3029 · typed resource DOM · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3029",
        evidenceId: "svg-resources",
      },
      {
        kind: "PR",
        label: "#3032 · dependency-free text DOM · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3032",
        evidenceId: "svg-text",
      },
      {
        kind: "Capability",
        label: "Complete seven-layer SVG stack",
        href: "https://github.com/mh0pe/browser/tree/codex/svg-07-text",
        evidenceId: "svg-text",
      },
      {
        kind: "Docs",
        label: "Lightpanda documentation",
        href: "https://lightpanda.io/docs/",
      },
    ],
  },
] as const;

const architectureDecisions = [
  {
    number: "01",
    status: "Guard 3.2.1 · merged and released · 2026",
    title: "Make negative tests prove the policy engine fails closed",
    text: "The Guard audit did not stop at adding expected failures. It traced places where negation, empty references, numeric coercion, scope, and reporting could erase a violation, then made the tests assert the rule path and diagnostic, not merely a nonzero exit.",
    links: [
      {
        kind: "PR",
        label: "Guard #717 · correctness audit",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/717",
      },
      {
        kind: "Release",
        label: "Guard 3.2.1 release",
        href: "https://github.com/aws-cloudformation/cloudformation-guard/releases/tag/3.2.1",
      },
    ],
  },
  {
    number: "02",
    status: "One contract · 15 agent platforms · 2026",
    title: "Generate integrations instead of maintaining fifteen copies",
    text: "The ASH transpiler makes one validated model the source of truth for packaging, capabilities, metadata, and installation across agent ecosystems. Backend smoke tests and external validators keep generated plugins honest.",
    links: [
      {
        kind: "PR",
        label: "ASH #331 · agentic-coding transpiler",
        href: "https://github.com/awslabs/automated-security-helper/pull/331",
      },
    ],
  },
  {
    number: "03",
    status: "Seven upstream merges · 2026",
    title: "Rebuild a broad browser change as a dependency-ordered stack",
    text: "Reauthored a broad SVG proof against Lightpanda’s current hierarchy as seven independently reviewable layers. Each merge established the dependency surface for the next, from prototype inheritance through text metrics.",
    links: [
      {
        kind: "PR",
        label: "#2157 · broad SVG prototype",
        href: "https://github.com/lightpanda-io/browser/pull/2157",
      },
      {
        kind: "PR",
        label: "#3012 · prototype foundation · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3012",
      },
      {
        kind: "PR",
        label: "#3034 · live scalar layer · merged",
        href: "https://github.com/lightpanda-io/browser/pull/3034",
      },
      {
        kind: "Capability",
        label: "Complete seven-layer branch",
        href: "https://github.com/mh0pe/browser/tree/codex/svg-07-text",
      },
    ],
  },
  {
    number: "04",
    status: "Maintainer feedback incorporated · open review · 2026",
    title: "Redesign around zero-install invariants, not an exporter",
    text: "The rules_js proposal changed direction after review. The resulting importer never executes Yarn or constructs node_modules; it reads the project’s own PnP state and rejects mismatched resolver, lock, cache, unplugged, type, or mode evidence before loading code.",
    links: [
      {
        kind: "PR",
        label: "rules_js #2957 · PnP importer",
        href: "https://github.com/aspect-build/rules_js/pull/2957",
      },
    ],
  },
  {
    number: "05",
    status: "Subagents · decision memory · reviewed learning · 2026",
    title: "Turn experience into policy for the next delivery cycle",
    text: "The agent operating model captures session insights, stages them as proposed rules, routes them through human review, and recalls only the decisions relevant to later work. The system does not merely remember what agents did; it turns reviewed experience into operating policy.",
    links: [
      {
        kind: "Docs",
        label: "BASE · session intelligence",
        href: "https://github.com/mh0pe/base-v1#per-session-meta-memory-psmm--session-intelligence",
      },
      {
        kind: "Docs",
        label: "CARL · decisions and staged rules",
        href: "https://github.com/mh0pe/carl#decisions",
      },
    ],
  },
] as const;

const supportingWork = [
  {
    id: "aws-labs-mcp",
    graphId: "aws-labs-mcp",
    clusterId: "agents",
    project: "AWS Labs MCP",
    status: "Document intelligence · transport · browser sessions",
    text: "Added richer document ingestion, document-asset extraction, Streamable HTTP/SSE transport, and an MCP server for isolated AgentCore browser sessions.",
    links: [
      {
        kind: "PR",
        label: "#2586 · document loader",
        href: "https://github.com/awslabs/mcp/pull/2586",
        evidenceId: "mcp-doc-loader",
      },
      {
        kind: "PR",
        label: "#2658 · document assets",
        href: "https://github.com/awslabs/mcp/pull/2658",
        evidenceId: "mcp-assets",
      },
      {
        kind: "PR",
        label: "#2645 · HTTP/SSE transport",
        href: "https://github.com/awslabs/mcp/pull/2645",
        evidenceId: "mcp-transport",
      },
      {
        kind: "PR",
        label: "#2740 · isolated browser sessions",
        href: "https://github.com/awslabs/mcp/pull/2740",
        evidenceId: "mcp-browser",
      },
    ],
  },
  {
    id: "cloud-runtime",
    graphId: "cloud-runtime",
    clusterId: "cloud",
    project: "AWS CDK and jsii",
    status: "Infrastructure semantics · executable documentation · runtime efficiency",
    text: "Made Fn::ForEach changes visible in cdk diff, added Cloud Control hotswap for QuickSight, kept 803 documented package paths aligned with shipped CDK exports, and improved jsii runtime efficiency.",
    links: [
      {
        kind: "PR",
        label: "CDK #1063 · Fn::ForEach diff",
        href: "https://github.com/aws/aws-cdk-cli/pull/1063",
        evidenceId: "cdk-foreach",
      },
      {
        kind: "PR",
        label: "CDK #1457 · QuickSight hotswap",
        href: "https://github.com/aws/aws-cdk-cli/pull/1457",
        evidenceId: "cdk-quicksight",
      },
      {
        kind: "PR",
        label: "CDK #38675 · executable documentation contract · merged",
        href: "https://github.com/aws/aws-cdk/pull/38675",
        evidenceId: "cdk-doc-exports",
      },
      {
        kind: "PR",
        label: "jsii #5054 · promise cleanup",
        href: "https://github.com/aws/jsii/pull/5054",
        evidenceId: "jsii-promises",
      },
      {
        kind: "PR",
        label: "jsii #5055 · type cache",
        href: "https://github.com/aws/jsii/pull/5055",
        evidenceId: "jsii-types",
      },
      {
        kind: "PR",
        label: "jsii #5056 · member lookup",
        href: "https://github.com/aws/jsii/pull/5056",
        evidenceId: "jsii-members",
      },
      {
        kind: "PR",
        label: "jsii #5057 · runtime bundle",
        href: "https://github.com/aws/jsii/pull/5057",
        evidenceId: "jsii-runtime",
      },
    ],
  },
] as const;

const morePublicWork = [
  {
    kind: "PR",
    label: "Rig #2387 · optional AWS SigV4 for Anthropic-compatible endpoints",
    href: "https://github.com/0xPlaygrounds/rig/pull/2387",
  },
  {
    kind: "PR",
    label: "code-index-mcp #111 · portable code-index-first agent skill",
    href: "https://github.com/johnhuang316/code-index-mcp/pull/111",
  },
  {
    kind: "PR",
    label: "opentype.js #861 · contextual GSUB shaping",
    href: "https://github.com/opentypejs/opentype.js/pull/861",
  },
  {
    kind: "PR",
    label: "Nextcloud #62429 · logical-time preservation",
    href: "https://github.com/nextcloud/server/pull/62429",
  },
  {
    kind: "PR",
    label: "esp-idf-sys #409 · ESP-IDF 6.0 support",
    href: "https://github.com/esp-rs/esp-idf-sys/pull/409",
  },
  {
    kind: "Capability",
    label: "OpenAI Plugins fork · template-aware GitHub creation",
    href: "https://github.com/mh0pe/plugins/commit/4dd70c45672d72aa5b4d4c7e2737a7cf32faa4e2",
  },
  {
    kind: "PR",
    label: "Claude Code Usage Monitor #236 · model and pricing correctness",
    href: "https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor/pull/236",
  },
] as const;

type Employer = (typeof professionalHistory.employers)[number];
type ResourceLink = {
  readonly kind: string;
  readonly label: string;
  readonly href: string;
  readonly evidenceId?: string;
};

const leadOrganization =
  professionalHistory.employers.find(
    (employer) => employer.relationship === "Current employer",
  ) ?? professionalHistory.employers[0];
const otherOrganizations = professionalHistory.employers.filter(
  (employer) => employer.relationship !== "Current employer",
);

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function EmployerMark({
  employer,
  className,
}: {
  employer: Employer;
  className: string;
}) {
  const logoKey =
    employer.logo
      ?.split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "ft-industries";

  return (
    <span className={`${className} ${className}--${logoKey}`}>
      {employer.logo ? (
        <img
          src={employer.logo}
          alt=""
          width={employer.width ?? undefined}
          height={employer.height ?? undefined}
          loading="eager"
          fetchPriority="low"
          decoding="async"
        />
      ) : (
        <span className="career-wordmark" aria-hidden="true">
          F.T.
        </span>
      )}
    </span>
  );
}

function ResourceLinks({
  links,
  label,
  collapseAfter,
}: {
  links: readonly ResourceLink[];
  label: string;
  collapseAfter?: number;
}) {
  const visibleLinks =
    collapseAfter === undefined ? links : links.slice(0, collapseAfter);
  const additionalLinks =
    collapseAfter === undefined ? [] : links.slice(collapseAfter);
  const renderLinks = (items: readonly ResourceLink[]) =>
    items.map((link) => (
      <li key={link.href}>
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          data-evidence-id={link.evidenceId}
        >
          <span className="resource-kind">{link.kind}</span>
          <span className="resource-title">
            {link.label}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </span>
          <Arrow />
        </a>
      </li>
    ));

  return (
    <>
      <ul className="resource-links" aria-label={label}>
        {renderLinks(visibleLinks)}
      </ul>
      {additionalLinks.length > 0 ? (
        <details className="resource-more">
          <summary>
            <span>Additional sources · {additionalLinks.length}</span>
            <Arrow />
          </summary>
          <ul className="resource-links" aria-label={`${label}, additional`}>
            {renderLinks(additionalLinks)}
          </ul>
        </details>
      ) : null}
    </>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to portfolio
      </a>

      <header className="site-header">
        <div className="shell site-header-inner">
          <a
            className="brand"
            href="#top"
            aria-label={`${trust.profile.name}, Principal AI Architect, back to top`}
          >
            <strong>{trust.profile.name}</strong>
            <span>Principal AI Architect</span>
          </a>
          <ActiveNav
            className="primary-nav"
            aria-label="Primary navigation"
            items={[
              {
                href: "#work",
                label: "Work",
                sectionIds: [
                  "work",
                  "contribution-lineage",
                  "agent-collaboration",
                ],
              },
              { href: "#frontier", label: "Extensions" },
              { href: "#range", label: "Decisions" },
              { href: "#trust", label: "Career" },
            ]}
          />
          <a
            className="header-link"
            href="https://github.com/mh0pe"
            target="_blank"
            rel="noreferrer"
          >
            GitHub · mh0pe <Arrow />
          </a>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero" id="top">
          <HeroSignalGraphic />
          <div className="shell hero-inner">
            <p className="eyebrow">
              Distributed systems · AI infrastructure · Security engineering
            </p>
            <h1>
              Bringing Hope to distributed systems
              <span>at enterprise scale.</span>
            </h1>
            <div className="hero-deck">
              <p className="hero-lede">
                I&apos;m Madison Hope Steiner, a Principal AI Architect. I turn
                complex cloud, AI, and security infrastructure into dependable
                systems that teams can operate at enterprise scale.
              </p>
              <div className="hero-proof">
                <p>
                  Start with the outcome, then inspect the code, reviews,
                  commits, and documentation across my GitHub profiles. Each
                  story separates plain-language impact from technical depth.
                </p>
                <nav
                  className="profile-links"
                  aria-label="Professional profiles"
                >
                  {profiles.map((profile) => (
                    <a
                      key={profile.label}
                      aria-label={profile.ariaLabel}
                      href={profile.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profile.display} <Arrow />
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <dl
              className="evidence-rail"
              aria-label="Public contribution record"
            >
              <div>
                <dt>Multi-project security orchestration</dt>
                <dd>v3.7</dd>
              </div>
              <div>
                <dt>Agent platforms from one contract</dt>
                <dd>15</dd>
              </div>
              <div>
                <dt>SVG capability layers merged</dt>
                <dd>7</dd>
              </div>
              <div>
                <dt>Public contributions merged</dt>
                <dd>{metrics.merged_attributed_contribution_pull_requests}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="section work-section" id="work">
          <div className="shell">
            <div className="section-heading">
              <p className="section-code">01 / Selected work</p>
              <div>
                <h2>Systems that changed what teams can do.</h2>
                <p>
                  Each project starts with the operating result. Direct sources
                  and an optional source map reveal the repositories, changes,
                  commits, and files behind it. The constellation represents
                  contribution relationships, not literal Git ancestry.
                </p>
              </div>
            </div>

            <div className="project-story">
              <div className="project-list">
                {featuredProjects.map((project) => (
                  <article
                    className="project"
                    id={`post-${project.id}`}
                    key={project.id}
                    aria-labelledby={`post-${project.id}-title`}
                    data-evolution-project={project.id}
                    data-constellation-cluster={project.clusterId}
                    data-evolution-active={
                      project.index === "01" ? "true" : "false"
                    }
                  >
                    <ProjectConstellationBackdrop
                      project={{
                        id: project.id,
                        title: project.title,
                        graphId: project.graphId,
                        clusterId: project.clusterId,
                      }}
                    />
                    <div className="project-body">
                      <h3 id={`post-${project.id}-title`}>{project.title}</h3>
                      <h4 className="project-copy-label">What this system does</h4>
                      <p className="project-context">{project.context}</p>
                      <h4 className="project-copy-label">Why it matters</h4>
                      <p className="project-value">{project.value}</p>
                      <ul className="contribution-list">
                        {project.contributions.map((contribution) => (
                          <li
                            data-evidence-id={contribution.evidenceId}
                            key={`${contribution.evidenceId}-${contribution.text}`}
                          >
                            {contribution.text}
                          </li>
                        ))}
                      </ul>
                      <ResourceLinks
                        links={project.links}
                        label={`${project.title} public resources`}
                        collapseAfter={4}
                      />
                    </div>
                    <div className="project-rail">
                      <span className="project-index">
                        Project {project.index}
                      </span>
                      <p className="project-focus">Contribution focus</p>
                      <strong>{project.focus}</strong>
                      <span className="project-period">{project.period}</span>
                      <a
                        className="repository"
                        href={project.repositoryHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {project.repository}
                        <span className="visually-hidden">
                          {" "}
                          repository (opens in a new tab)
                        </span>
                        <Arrow />
                      </a>
                      <span className="delivery">{project.status}</span>
                    </div>
                    <ProjectModelSpectrum
                      project={{
                        id: project.id,
                        title: project.title,
                        graphId: project.graphId,
                        clusterId: project.clusterId,
                      }}
                    />
                    <ContributionCardPlayer
                      project={{
                        id: project.id,
                        title: project.title,
                        graphId: project.graphId,
                        clusterId: project.clusterId,
                      }}
                    />
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ContributionConstellation agentClusters={lineageAgentClusters} />

        <AttributionExplorer />

        <section className="section frontier-section" id="frontier">
          <div className="shell">
            <div className="section-heading section-heading-compact">
              <p className="section-code">04 / Active extensions</p>
              <div>
                <h2>Capabilities available beyond current upstream releases.</h2>
                <p>
                  Each implementation is usable from its linked branch. Source
                  labels keep upstream integration status visible.
                </p>
              </div>
            </div>

            <div className="frontier-story">
              <div className="frontier-list">
                {frontierWork.map((item) => (
                  <article
                    id={`post-${item.id}`}
                    key={item.id}
                    aria-labelledby={`post-${item.id}-title`}
                    data-evolution-project={item.id}
                    data-constellation-cluster={item.clusterId}
                    data-evolution-active={
                      item.index === "A" ? "true" : "false"
                    }
                  >
                    <ProjectConstellationBackdrop
                      project={{
                        id: item.id,
                        title: item.title,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                    <div className="frontier-meta">
                      <span>{item.index}</span>
                      <strong>{item.status}</strong>
                      <small>{item.period}</small>
                    </div>
                    <div>
                      <h3 id={`post-${item.id}-title`}>{item.title}</h3>
                      <span className="repository">{item.repository}</span>
                      <p>{item.text}</p>
                      <ResourceLinks
                        links={item.links}
                        label={`${item.title} public resources`}
                        collapseAfter={3}
                      />
                    </div>
                    <ProjectModelSpectrum
                      project={{
                        id: item.id,
                        title: item.title,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                    <ContributionCardPlayer
                      project={{
                        id: item.id,
                        title: item.title,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="section range-section"
          id="range"
          data-constellation-cluster="cloud"
        >
          <div className="shell">
            <div className="section-heading section-heading-compact">
              <p className="section-code">05 / Architecture choices</p>
              <div>
                <h2>
                  Architecture choices, with the trade-offs visible in code.
                </h2>
              </div>
            </div>
            <div className="decision-list">
              {architectureDecisions.map((item) => (
                <article key={item.number}>
                  <span>{item.number}</span>
                  <div>
                    <p>{item.status}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <div>
                    <p>{item.text}</p>
                    <ResourceLinks
                      links={item.links}
                      label={`${item.title} public resources`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="trusted-section"
          id="trust"
          aria-labelledby="trusted-heading"
        >
          <div className="shell">
            <div className="trusted-heading">
              <div>
                <p className="section-code">Organizational impact</p>
                <p className="trusted-kicker">Contexted impact</p>
              </div>
              <div>
                <h2 id="trusted-heading">
                  Systems shaped where scale, trust, and product reach matter.
                </h2>
                <p>
                  Work spanning cloud platforms, security, financial
                  infrastructure, mobility data, media, and consumer products.
                </p>
                <p className="trust-qualification">
                  Organization marks identify places where this work took
                  shape. They do not imply endorsement.
                </p>
                <a
                  className="trusted-source"
                  href={professionalHistory.profile_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Professional context on LinkedIn <Arrow />
                </a>
              </div>
            </div>

            <div className="career-ledger">
              <article
                className="career-current"
                aria-labelledby="lead-organization-heading"
              >
                <header>
                  <div>
                    <h3 id="lead-organization-heading">
                      Cloud and developer systems
                    </h3>
                    <small>{leadOrganization.scope}</small>
                  </div>
                  <span aria-hidden="true">01</span>
                </header>
                <EmployerMark
                  employer={leadOrganization}
                  className="career-current-mark"
                />
                <strong>{leadOrganization.name}</strong>
              </article>

              <section
                className="career-history"
                aria-labelledby="organization-contexts-heading"
              >
                <header className="career-history-header">
                  <div>
                    <h3 id="organization-contexts-heading">
                      Product and platform contexts
                    </h3>
                    <span>
                      Organizations connected by the systems, audiences, and
                      operating constraints that shaped the work.
                    </span>
                  </div>
                  <strong aria-hidden="true">
                    {String(otherOrganizations.length).padStart(2, "0")}
                  </strong>
                </header>
                <ul className="career-history-grid">
                  {otherOrganizations.map((employer) => (
                    <li key={employer.name}>
                      <EmployerMark
                        employer={employer}
                        className="career-logo"
                      />
                      <span className="career-org-copy">
                        <strong className="career-org-name">
                          {employer.name}
                        </strong>
                        <small>{employer.scope}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="impact-context">
              <div>
                <p className="section-code">Systems in context</p>
                <h3>Impact shaped by the environment around it.</h3>
                <p>
                  Selected work across payments, banking, mobility data, and
                  governed cloud foundations.
                </p>
              </div>
              <ul>
                {professionalHistory.organization_contexts.map(
                  (context, index) => (
                    <li key={context.label}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{context.label}</strong>
                        <p>{context.text}</p>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="section record-section" id="record">
          <div className="shell">
            <div className="section-heading section-heading-compact">
              <p className="section-code">06 / Established systems</p>
              <div>
                <h2>More systems across cloud and agent infrastructure.</h2>
              </div>
            </div>
            <div className="support-story">
              <div className="support-list">
                {supportingWork.map((item) => (
                  <article
                    id={`post-${item.id}`}
                    key={item.id}
                    aria-labelledby={`post-${item.id}-title`}
                    data-evolution-project={item.id}
                    data-constellation-cluster={item.clusterId}
                    data-evolution-active={
                      item.id === "aws-labs-mcp" ? "true" : "false"
                    }
                  >
                    <ProjectConstellationBackdrop
                      project={{
                        id: item.id,
                        title: item.project,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                    <div className="support-title">
                      <h3 id={`post-${item.id}-title`}>{item.project}</h3>
                    </div>
                    <p className="support-status">{item.status}</p>
                    <p>{item.text}</p>
                    <ResourceLinks
                      links={item.links}
                      label={`${item.project} public resources`}
                      collapseAfter={3}
                    />
                    <ProjectModelSpectrum
                      project={{
                        id: item.id,
                        title: item.project,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                    <ContributionCardPlayer
                      project={{
                        id: item.id,
                        title: item.project,
                        graphId: item.graphId,
                        clusterId: item.clusterId,
                      }}
                    />
                  </article>
                ))}
              </div>
            </div>
            <div className="record-links">
              <div>
                <p className="section-code">More public work</p>
                <h3>Focused extensions across AI, storage, fonts, and embedded systems.</h3>
              </div>
              <ResourceLinks
                links={morePublicWork}
                label="Additional public implementations and reviews"
              />
            </div>
          </div>
        </section>

        <section className="evidence-note">
          <div className="shell evidence-note-inner">
            <div>
              <p className="section-code">Source trail</p>
              <h2>Follow the work across mh0pe and awsmadi.</h2>
            </div>
            <div>
              <p>
                Each capability opens to the pull request, commit, release, or
                branch where the work lives. Explore the systems from initial
                proposal through review, integration, and continued evolution
                in public source.
              </p>
              <small>
                Public GitHub record since {trust.profile.public_since}.
                Contribution snapshot {snapshotDate}. Career timeline on
                LinkedIn.
              </small>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell site-footer-inner">
          <div className="site-footer-copy">
            <p className="site-footer-title">
              <strong>{trust.profile.name}</strong>
              <span>Principal AI Architect</span>
            </p>
            <p className="site-disclosure">
              This is a personal portfolio. All views are my own; nothing on
              this site is a statement made on behalf of any current or former
              employer.
            </p>
          </div>
          <nav aria-label="Footer professional profiles">
            {profiles.map((profile) => (
              <a
                key={profile.label}
                aria-label={profile.ariaLabel}
                href={profile.href}
                target="_blank"
                rel="noreferrer"
              >
                {profile.label} <Arrow />
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
