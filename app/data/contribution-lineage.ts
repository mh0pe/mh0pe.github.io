export type LineageTone = "coral" | "cyan" | "lime" | "violet" | "gold";

export type LineageAvailability = "upstream" | "public-fork";

export interface LineageEvidenceLink {
  readonly label: string;
  readonly href: string;
}

export interface LineageEvent {
  readonly id: string;
  readonly date: string;
  readonly label: string;
  readonly repository: string;
  readonly detail: string;
  readonly availability: LineageAvailability;
  readonly evidenceKind: "PR" | "Commit" | "Capability";
  readonly links: readonly LineageEvidenceLink[];
}

export interface LineageChapter {
  readonly id: string;
  readonly index: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly repositories: string;
  readonly range: string;
  readonly tone: LineageTone;
  readonly representedLineageEvents: number;
  readonly summary: string;
  readonly events: readonly LineageEvent[];
}

export const contributionLineageSnapshot = {
  publicOnly: true,
  observedAt: "2026-08-31",
  observedPullRequests: 206,
  observedRepositoryFamilies: 44,
  representedLineageEvents: 34,
  accounts: ["mh0pe", "awsmadi"],
} as const;

export const contributionLineageChapters: readonly LineageChapter[] = [
  {
    id: "security",
    index: "01",
    eyebrow: "Security systems",
    title:
      "I advanced workspace security orchestration and trustworthy infrastructure policy evaluation.",
    repositories:
      "awslabs / automated-security-helper · aws-cloudformation / cloudformation-guard · aws-guard-rules-registry",
    range: "2026",
    tone: "coral",
    representedLineageEvents: 7,
    summary:
      "ASH now plans and executes project-aware workspace scans with confined MCP targets, while a public implementation extends the model into distributed execution. CloudFormation Guard work follows policy decisions from evaluator semantics through diagnostics, tests, and published rule packs.",
    events: [
      {
        id: "ash-workspace",
        date: "2026-08",
        label: "Workspace orchestration stack",
        repository: "awslabs/automated-security-helper",
        detail:
          "Plans validated workspaces, runs isolated project scans, and preserves project identity and policy context through aggregation.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#456 · merged to main",
            href: "https://github.com/awslabs/automated-security-helper/pull/456",
          },
        ],
      },
      {
        id: "ash-mcp-confinement",
        date: "2026-08",
        label: "Operator-controlled MCP targets",
        repository: "awslabs/automated-security-helper",
        detail:
          "Confines MCP scans to canonical operator-approved roots and refuses symlink escapes across isolated sessions.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#477 · merged",
            href: "https://github.com/awslabs/automated-security-helper/pull/477",
          },
        ],
      },
      {
        id: "ash-distributed",
        date: "2026-08",
        label: "Distributed security execution",
        repository: "awslabs/automated-security-helper",
        detail:
          "Adds scanner-axis sharding, result collection, and deployable AWS targets as an active public implementation.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#494 · public prototype",
            href: "https://github.com/awslabs/automated-security-helper/pull/494",
          },
        ],
      },
      {
        id: "guard-enforcement",
        date: "2026-08",
        label: "Verdict integrity",
        repository: "aws-cloudformation/cloudformation-guard",
        detail:
          "Corrected evaluator and reporter paths so policy results preserve the intended rule semantics and diagnostics.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#717 · merged",
            href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/717",
          },
        ],
      },
      {
        id: "guard-outcomes",
        date: "2026-08",
        label: "Four-valued outcome model",
        repository: "aws-cloudformation/cloudformation-guard",
        detail:
          "Preserves the difference between failure and having nothing comparable, including empty-collection cases that previously passed incorrectly.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#720 · open",
            href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/720",
          },
        ],
      },
      {
        id: "guard-query-reporting",
        date: "2026-08",
        label: "Query, parser, and reporter integrity",
        repository: "aws-cloudformation/cloudformation-guard",
        detail:
          "Repairs filter and capture handling, reporter aborts, and four parser boundaries exposed by the evaluator audit.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#727 · open",
            href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/727",
          },
        ],
      },
      {
        id: "guard-registry-pack",
        date: "2026-08",
        label: "Published rule-pack assurance",
        repository: "aws-cloudformation/aws-guard-rules-registry",
        detail:
          "Validates all assembled rule packs, preserves published identifiers, and ties publication to successful checks.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#287 · public implementation",
            href: "https://github.com/aws-cloudformation/aws-guard-rules-registry/pull/287",
          },
        ],
      },
    ],
  },
  {
    id: "cloud",
    index: "02",
    eyebrow: "Cloud delivery",
    title:
      "I made cloud changes easier to see, documentation executable, and the runtime beneath them leaner.",
    repositories: "aws / aws-cdk-cli · aws / aws-cdk · aws / jsii",
    range: "2026",
    tone: "cyan",
    representedLineageEvents: 7,
    summary:
      "CDK surfaces Fn::ForEach changes, hotswaps QuickSight through CCAPI, and checks documented package paths against shipped exports. jsii clears completed promises, caches lookups, and ships a smaller embedded runtime.",
    events: [
      {
        id: "cdk-foreach",
        date: "2026-03",
        label: "Fn::ForEach diff semantics",
        repository: "aws/aws-cdk-cli",
        detail:
          "Made deploy-time CloudFormation loops visible in CDK diff instead of hiding their resource-level changes.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#1063 · merged",
            href: "https://github.com/aws/aws-cdk-cli/pull/1063",
          },
        ],
      },
      {
        id: "cdk-quicksight",
        date: "2026-04",
        label: "QuickSight hotswap via CCAPI",
        repository: "aws/aws-cdk-cli",
        detail:
          "Reworked a large service-specific proposal into a compact Cloud Control API integration for faster development deployments.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#1457 · merged",
            href: "https://github.com/aws/aws-cdk-cli/pull/1457",
          },
        ],
      },
      {
        id: "cdk-doc-exports",
        date: "2026-08",
        label: "Executable documentation contract",
        repository: "aws/aws-cdk",
        detail:
          "Checks 803 documented aws-cdk-lib package paths against the exports that ship, keeping examples aligned with the product surface.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#38675 · merged",
            href: "https://github.com/aws/aws-cdk/pull/38675",
          },
        ],
      },
      {
        id: "jsii-promises",
        date: "2026-04",
        label: "Promise lifecycle cleanup",
        repository: "aws/jsii",
        detail:
          "Removed resolved promises from the kernel registry so completed work no longer accumulated in memory.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#5054 · merged",
            href: "https://github.com/aws/jsii/pull/5054",
          },
        ],
      },
      {
        id: "jsii-types",
        date: "2026-04",
        label: "Cached type resolution",
        repository: "aws/jsii",
        detail:
          "Cached fully qualified type lookups in the kernel’s cross-language runtime.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#5055 · merged",
            href: "https://github.com/aws/jsii/pull/5055",
          },
        ],
      },
      {
        id: "jsii-members",
        date: "2026-04",
        label: "Constant-time member lookup",
        repository: "aws/jsii",
        detail:
          "Replaced repeated linear method and property searches with indexed lookup.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#5056 · merged",
            href: "https://github.com/aws/jsii/pull/5056",
          },
        ],
      },
      {
        id: "jsii-runtime",
        date: "2026-04",
        label: "Smaller embedded runtime",
        repository: "aws/jsii",
        detail:
          "Enabled compression and mangling for the JavaScript runtime embedded across jsii language targets.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#5057 · merged",
            href: "https://github.com/aws/jsii/pull/5057",
          },
        ],
      },
    ],
  },
  {
    id: "agents",
    index: "03",
    eyebrow: "Agent infrastructure",
    title:
      "I helped turn emerging agent frameworks into portable, learning operating systems.",
    repositories:
      "awslabs / mcp · mh0pe / base-v1 · carl · paul · seed · johnhuang316 / code-index-mcp",
    range: "2026",
    tone: "violet",
    representedLineageEvents: 7,
    summary:
      "The work combines richer agent inputs and isolated browser sessions with portable agent teams, decision memory, verified delivery, and a human-reviewed loop that turns experience into policy for later sessions.",
    events: [
      {
        id: "mcp-doc-loader",
        date: "2026-03",
        label: "Richer document ingestion",
        repository: "awslabs/mcp",
        detail:
          "Added configurable file-size controls and LibreOffice-backed slide-image extraction to the document loader.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#2586 · merged",
            href: "https://github.com/awslabs/mcp/pull/2586",
          },
        ],
      },
      {
        id: "mcp-browser",
        date: "2026-03",
        label: "Ephemeral browser sessions",
        repository: "awslabs/mcp",
        detail:
          "Built an MCP server for isolated AgentCore browser sessions with explicit lifecycle boundaries.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#2740 · closed upstream",
            href: "https://github.com/awslabs/mcp/pull/2740",
          },
        ],
      },
      {
        id: "portable-base",
        date: "2026-08",
        label: "BASE state and integration hardening",
        repository: "mh0pe/base-v1",
        detail:
          "Synchronizes TOML-backed state and hardens the integration boundary around CARL hygiene.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#2 · open draft",
            href: "https://github.com/mh0pe/base-v1/pull/2",
          },
        ],
      },
      {
        id: "portable-carl-runtime",
        date: "2026-08",
        label: "CARL multi-CLI runtime",
        repository: "mh0pe/carl",
        detail:
          "Seeds project-local decision state at session start and validates it across older and current schema resolvers.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#2 · merged",
            href: "https://github.com/mh0pe/carl/pull/2",
          },
        ],
      },
      {
        id: "portable-paul",
        date: "2026-06",
        label: "PAUL integration",
        repository: "mh0pe/paul",
        detail:
          "Packaged PAUL for native-plugin and standalone skills-directory installation surfaces.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#1 · public implementation",
            href: "https://github.com/mh0pe/paul/pull/1",
          },
        ],
      },
      {
        id: "portable-seed",
        date: "2026-06",
        label: "SEED integration",
        repository: "mh0pe/seed",
        detail:
          "Packaged SEED across native-plugin, skills-directory, and package-runner documentation surfaces.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#1 · public implementation",
            href: "https://github.com/mh0pe/seed/pull/1",
          },
        ],
      },
      {
        id: "code-index-skill",
        date: "2026-08",
        label: "Index-first agent context",
        repository: "johnhuang316/code-index-mcp",
        detail:
          "Packages staged code discovery, tool routing, and subagent guidance as an installable agent skill.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#111 · public implementation",
            href: "https://github.com/johnhuang316/code-index-mcp/pull/111",
          },
        ],
      },
    ],
  },
  {
    id: "browser",
    index: "04",
    eyebrow: "Browser systems",
    title: "I shipped a seven-layer SVG DOM into an agent-native browser.",
    repositories: "lightpanda-io / browser",
    range: "2026",
    tone: "lime",
    representedLineageEvents: 7,
    summary:
      "The merged stack spans prototype inheritance, live scalar values, transactional collections, analytic geometry, structural and resource DOMs, and deterministic text metrics.",
    events: [
      {
        id: "svg-prototypes",
        date: "2026-07",
        label: "Prototype chains",
        repository: "lightpanda-io/browser",
        detail:
          "Replaced fixed-depth factories with compile-time-derived SVG inheritance while preserving namespace and casing behavior.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3012 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3012",
          },
        ],
      },
      {
        id: "svg-scalars",
        date: "2026-07",
        label: "Live scalar values",
        repository: "lightpanda-io/browser",
        detail:
          "Added live lengths, angles, transforms, aspect-ratio values, contextual units, and stable read-only animated views.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3034 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3034",
          },
        ],
      },
      {
        id: "svg-collections",
        date: "2026-07",
        label: "Transactional collections",
        repository: "lightpanda-io/browser",
        detail:
          "Built live point, transform, and string collections with stable identity, attribute synchronization, and safe detach behavior.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3030 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3030",
          },
        ],
      },
      {
        id: "svg-geometry",
        date: "2026-07",
        label: "Analytic geometry",
        repository: "lightpanda-io/browser",
        detail:
          "Implemented SVG path parsing, analytic curve and arc bounds, transformed boxes, total length, and point-at-length queries.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3033 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3033",
          },
        ],
      },
      {
        id: "svg-structure",
        date: "2026-07",
        label: "Structural SVG DOM",
        repository: "lightpanda-io/browser",
        detail:
          "Added typed structural elements and an explicit cursor stack for deep group traversal.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3031 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3031",
          },
        ],
      },
      {
        id: "svg-resources",
        date: "2026-07",
        label: "Resource elements",
        repository: "lightpanda-io/browser",
        detail:
          "Added typed gradients, masks, markers, patterns, live defaults, fallbacks, and wrapper identity.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3029 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3029",
          },
        ],
      },
      {
        id: "svg-text",
        date: "2026-07",
        label: "Deterministic text DOM",
        repository: "lightpanda-io/browser",
        detail:
          "Added typed text elements and dependency-free UTF-8 DOM metrics without overstating font shaping.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#3032 · merged",
            href: "https://github.com/lightpanda-io/browser/pull/3032",
          },
        ],
      },
    ],
  },
  {
    id: "durability",
    index: "05",
    eyebrow: "Durable platform semantics",
    title:
      "I carried reproducible build semantics across Windows and zero-install JavaScript projects.",
    repositories:
      "NixOS / nix · nix-windows / nix-windows-demo · aspect-build / rules_js",
    range: "2026",
    tone: "gold",
    representedLineageEvents: 6,
    summary:
      "Nix now has an upstream Windows derivation builder, whole-project cross-build coverage, broader test compilation, and clearer lifecycle semantics. Public branches extend store cleanup and validation, while the Yarn PnP importer brings the same integrity focus to Bazel.",
    events: [
      {
        id: "nix-builder",
        date: "2026-08",
        label: "Windows derivation builder",
        repository: "NixOS/nix",
        detail:
          "Executes supported derivations, registers valid store outputs, and reports build results through a deliberately scoped path validated under Wine.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#16347 · merged",
            href: "https://github.com/NixOS/nix/pull/16347",
          },
        ],
      },
      {
        id: "nix-cross-build-ci",
        date: "2026-08",
        label: "Whole-project Windows build assurance",
        repository: "NixOS/nix",
        detail:
          "Enables large COFF objects across Windows targets and expands CI to cross-build every Windows component.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#16367 · merged",
            href: "https://github.com/NixOS/nix/pull/16367",
          },
          {
            label: "#16368 · merged",
            href: "https://github.com/NixOS/nix/pull/16368",
          },
        ],
      },
      {
        id: "nix-cert-startup",
        date: "2026-08",
        label: "Reportable certificate configuration",
        repository: "NixOS/nix",
        detail:
          "Makes invalid certificate-path configuration reportable at startup, with a public branch moving the complete read into normal configuration loading.",
        availability: "upstream",
        evidenceKind: "PR",
        links: [
          {
            label: "#16364 · merged",
            href: "https://github.com/NixOS/nix/pull/16364",
          },
          {
            label: "#16383 · public implementation",
            href: "https://github.com/NixOS/nix/pull/16383",
          },
        ],
      },
      {
        id: "nix-store-deletion",
        date: "2026-08",
        label: "Handle-relative store cleanup",
        repository: "NixOS/nix",
        detail:
          "Removes read-only Windows store trees through directory handles while preserving symlink targets and bytes-freed accounting.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#16359 · public implementation",
            href: "https://github.com/NixOS/nix/pull/16359",
          },
        ],
      },
      {
        id: "nix-validation-harness",
        date: "2026-08",
        label: "Independent build-result checks",
        repository: "nix-windows/nix-windows-demo",
        detail:
          "Verifies build status, emitted store path, and produced content independently, with bounded diagnostics and reliable virtual-machine cleanup.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#1 · public implementation",
            href: "https://github.com/nix-windows/nix-windows-demo/pull/1",
          },
        ],
      },
      {
        id: "rules-js-pnp",
        date: "2026-08",
        label: "Yarn PnP zero-install importer",
        repository: "aspect-build/rules_js",
        detail:
          "Lets Bazel consume Yarn 3 and 4 zero-install projects without running Yarn or synthesizing node_modules, while verifying the resolver graph and cached packages.",
        availability: "public-fork",
        evidenceKind: "PR",
        links: [
          {
            label: "#2957 · open",
            href: "https://github.com/aspect-build/rules_js/pull/2957",
          },
        ],
      },
    ],
  },
] as const;
