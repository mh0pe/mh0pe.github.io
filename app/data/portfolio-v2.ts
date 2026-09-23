import publicHistory from "./public-history-summary.json";

export type PublicUrl = `https://${string}`;

export type SystemFamily =
  | "security"
  | "cloud"
  | "agents"
  | "browser"
  | "durability";

export type ProofKind =
  | "release"
  | "pull-request"
  | "commit"
  | "branch"
  | "repository"
  | "documentation"
  | "test"
  | "profile"
  | "snapshot";

export type ContributionVerb =
  | "Led"
  | "Designed"
  | "Implemented"
  | "Reviewed"
  | "Contributed"
  | "Evaluated";

export type DeliveryState =
  | "Released"
  | "Merged"
  | "Open"
  | "Prototype"
  | "Superseded";

export type StatusDimension = "availability" | "adoption" | "maturity";

export type PortfolioStatusId =
  | "available-upstream-release"
  | "available-upstream"
  | "available-public-branch"
  | "available-public-fork"
  | "available-portfolio-repository"
  | "released-upstream"
  | "merged-upstream"
  | "upstream-review-active"
  | "upstream-review-closed"
  | "merged-portfolio"
  | "public-prototype"
  | "validated-implementation";

export interface PublicSourceDefinition {
  readonly label: string;
  readonly kind: Exclude<ProofKind, "test">;
  readonly href: PublicUrl;
}

export const publicSources = {
  githubMh0pe: {
    label: "GitHub profile, mh0pe",
    kind: "profile",
    href: "https://github.com/mh0pe",
  },
  githubAwsmadi: {
    label: "GitHub profile, awsmadi",
    kind: "profile",
    href: "https://github.com/awsmadi",
  },
  linkedinMadison: {
    label: "LinkedIn profile",
    kind: "profile",
    href: "https://www.linkedin.com/in/madisonhsteiner",
  },
  ashRepository: {
    label: "Automated Security Helper source code",
    kind: "repository",
    href: "https://github.com/awslabs/automated-security-helper",
  },
  ashDocumentation: {
    label: "Automated Security Helper documentation",
    kind: "documentation",
    href: "https://awslabs.github.io/automated-security-helper/",
  },
  ashRelease370: {
    label: "Automated Security Helper v3.7.0",
    kind: "release",
    href: "https://github.com/awslabs/automated-security-helper/releases/tag/v3.7.0",
  },
  ashPr331: {
    label: "ASH #331, integrations for 15 agent platforms",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/331",
  },
  ashPr456: {
    label: "ASH #456, workspace mode foundation",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/456",
  },
  ashPr460: {
    label: "ASH #460, validated workspace execution plan",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/460",
  },
  ashPr462: {
    label: "ASH #462, per-project execution and aggregation",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/462",
  },
  ashPr465: {
    label: "ASH #465, project-aware reporters",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/465",
  },
  ashPr472: {
    label: "ASH #472, workspace policy",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/472",
  },
  ashPr478: {
    label: "ASH #478, reporters and workspace policy integration",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/478",
  },
  ashPr477: {
    label: "ASH #477, operator-controlled MCP targets",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/477",
  },
  ashPr493: {
    label: "ASH #493, workspace-aware agent tools",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/493",
  },
  ashPr534: {
    label: "ASH #534, installable agent skills",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/534",
  },
  ashPr494: {
    label: "ASH #494, distributed execution and deployable targets",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/494",
  },
  ashPr501: {
    label: "ASH #501, nested ignore and scan-path integrity",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/501",
  },
  ashPr502: {
    label: "ASH #502, stable detect-secrets scan roots",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/502",
  },
  ashPr508: {
    label: "ASH #508, pinned scanner environment",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/508",
  },
  ashPr514: {
    label: "ASH #514, cdk-nag 3.x and per-target failures",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/514",
  },
  ashPr515: {
    label: "ASH #515, dependency upgrades grouped by blast radius",
    kind: "pull-request",
    href: "https://github.com/awslabs/automated-security-helper/pull/515",
  },
  guardRepository: {
    label: "CloudFormation Guard source code",
    kind: "repository",
    href: "https://github.com/aws-cloudformation/cloudformation-guard",
  },
  guardFork: {
    label: "CloudFormation Guard public fork",
    kind: "repository",
    href: "https://github.com/awsmadi/cloudformation-guard",
  },
  guardRelease321: {
    label: "CloudFormation Guard 3.2.1",
    kind: "release",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/releases/tag/3.2.1",
  },
  guardPr717: {
    label: "CloudFormation Guard #717, verdict integrity correction",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/717",
  },
  guardPr720: {
    label: "CloudFormation Guard #720, four-valued outcomes",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/720",
  },
  guardPr727: {
    label: "CloudFormation Guard #727, query and reporter integrity",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/727",
  },
  guardPr747: {
    label: "Guard #747, range membership in policy lists",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/747",
  },
  guardPr748: {
    label: "Guard #748, consistent non-finite number comparisons",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/748",
  },
  guardPr749: {
    label: "Guard #749, preserve text around pattern replacements",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/749",
  },
  guardPr750: {
    label: "Guard #750, match tests to the intended policy file",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/cloudformation-guard/pull/750",
  },
  guardRulesPr287: {
    label: "Guard Rules Registry #287, assembled-pack assurance",
    kind: "pull-request",
    href: "https://github.com/aws-cloudformation/aws-guard-rules-registry/pull/287",
  },
  nixRepository: {
    label: "Nix source code",
    kind: "repository",
    href: "https://github.com/NixOS/nix",
  },
  nixFork: {
    label: "Nix public Windows fork",
    kind: "repository",
    href: "https://github.com/awsmadi/nix",
  },
  nixPr16347: {
    label: "Nix #16347, Windows derivation builder",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16347",
  },
  nixPr16368: {
    label: "Nix #16368, whole-project Windows cross-build",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16368",
  },
  nixPr16411: {
    label: "Nix #16411, Windows libstore gate and output semantics",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16411",
  },
  nixPr16414: {
    label: "Nix #16414, recursive Nix on Windows",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16414",
  },
  nixPr16449: {
    label: "Nix #16449, portable process handle inheritance",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16449",
  },
  nixPr16451: {
    label: "Nix #16451, lossless Windows filenames and network paths",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16451",
  },
  nixPr16453: {
    label: "Nix #16453, explicit Windows network-isolation contract",
    kind: "pull-request",
    href: "https://github.com/NixOS/nix/pull/16453",
  },
  rigPr2387: {
    label: "Rig #2387, AWS-signed Anthropic model requests",
    kind: "pull-request",
    href: "https://github.com/0xPlaygrounds/rig/pull/2387",
  },
  nixShutdownCommit: {
    label: "Nix, coordinated recursive-build shutdown",
    kind: "commit",
    href: "https://github.com/awsmadi/nix/commit/05b5212724336d8625adb91c471ea4ac221aca96",
  },
  nixSocketCommit: {
    label: "Nix, Windows socket conversion and inheritance",
    kind: "commit",
    href: "https://github.com/awsmadi/nix/commit/686a596fa8c9b71dfb4938005632bba553608b5a",
  },
  nixValidationPr1: {
    label: "Nix Windows validation harness #1",
    kind: "pull-request",
    href: "https://github.com/nix-windows/nix-windows-demo/pull/1",
  },
  lightpandaRepository: {
    label: "Lightpanda browser source code",
    kind: "repository",
    href: "https://github.com/lightpanda-io/browser",
  },
  lightpandaPr2157: {
    label: "Lightpanda #2157, broad SVG prototype",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/2157",
  },
  lightpandaPr3012: {
    label: "Lightpanda #3012, SVG prototype chains",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3012",
  },
  lightpandaPr3034: {
    label: "Lightpanda #3034, live SVG scalar values",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3034",
  },
  lightpandaPr3030: {
    label: "Lightpanda #3030, transactional SVG collections",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3030",
  },
  lightpandaPr3033: {
    label: "Lightpanda #3033, analytic SVG geometry",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3033",
  },
  lightpandaPr3031: {
    label: "Lightpanda #3031, structural SVG DOM",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3031",
  },
  lightpandaPr3029: {
    label: "Lightpanda #3029, typed SVG resources",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3029",
  },
  lightpandaPr3032: {
    label: "Lightpanda #3032, deterministic SVG text DOM",
    kind: "pull-request",
    href: "https://github.com/lightpanda-io/browser/pull/3032",
  },
  lightpandaCompleteBranch: {
    label: "Complete seven-layer SVG implementation",
    kind: "branch",
    href: "https://github.com/mh0pe/browser/tree/codex/svg-07-text",
  },
  baseRepository: {
    label: "BASE public source code",
    kind: "repository",
    href: "https://github.com/mh0pe/base-v1",
  },
  carlRepository: {
    label: "CARL public source code",
    kind: "repository",
    href: "https://github.com/mh0pe/carl",
  },
  paulRepository: {
    label: "PAUL public source code",
    kind: "repository",
    href: "https://github.com/mh0pe/paul",
  },
  seedRepository: {
    label: "SEED public source code",
    kind: "repository",
    href: "https://github.com/mh0pe/seed",
  },
  basePr2: {
    label: "BASE #2, state and integration hardening",
    kind: "pull-request",
    href: "https://github.com/mh0pe/base-v1/pull/2",
  },
  carlPr2: {
    label: "CARL #2, session configuration seeding",
    kind: "pull-request",
    href: "https://github.com/mh0pe/carl/pull/2",
  },
  carlPr3: {
    label: "CARL #3, schema validation compatibility",
    kind: "pull-request",
    href: "https://github.com/mh0pe/carl/pull/3",
  },
  paulPr1: {
    label: "PAUL #1, portable native-plugin integration",
    kind: "pull-request",
    href: "https://github.com/mh0pe/paul/pull/1",
  },
  seedPr1: {
    label: "SEED #1, portable workflow integration",
    kind: "pull-request",
    href: "https://github.com/mh0pe/seed/pull/1",
  },
  openaiPluginsRepository: {
    label: "OpenAI Plugins source code",
    kind: "repository",
    href: "https://github.com/openai/plugins",
  },
  pluginsFork: {
    label: "OpenAI Plugins public fork",
    kind: "repository",
    href: "https://github.com/mh0pe/plugins",
  },
  pluginsCommit4dd70c4: {
    label: "GitHub plugin 0.1.7, template-aware creation",
    kind: "commit",
    href: "https://github.com/mh0pe/plugins/commit/4dd70c45672d72aa5b4d4c7e2737a7cf32faa4e2",
  },
  rulesJsRepository: {
    label: "rules_js source code",
    kind: "repository",
    href: "https://github.com/aspect-build/rules_js",
  },
  rulesJsPr2957: {
    label: "rules_js #2957, Yarn PnP importer",
    kind: "pull-request",
    href: "https://github.com/aspect-build/rules_js/pull/2957",
  },
  rulesJsBranch: {
    label: "Exact public Yarn PnP implementation branch",
    kind: "branch",
    href: "https://github.com/mh0pe/rules_js/tree/codex/yarn-lock-repo-cache-v2.3.7",
  },
  awsLabsMcpRepository: {
    label: "AWS Labs MCP source code",
    kind: "repository",
    href: "https://github.com/awslabs/mcp",
  },
  awsLabsMcpFork: {
    label: "AWS Labs MCP public fork",
    kind: "repository",
    href: "https://github.com/awsmadi/mcp",
  },
  awsLabsMcpPr2586: {
    label: "AWS Labs MCP #2586, richer document loading",
    kind: "pull-request",
    href: "https://github.com/awslabs/mcp/pull/2586",
  },
  awsLabsMcpPr2645: {
    label: "AWS Labs MCP #2645, Streamable HTTP and SSE",
    kind: "pull-request",
    href: "https://github.com/awslabs/mcp/pull/2645",
  },
  awsLabsMcpPr2658: {
    label: "AWS Labs MCP #2658, document asset extraction",
    kind: "pull-request",
    href: "https://github.com/awslabs/mcp/pull/2658",
  },
  awsLabsMcpPr2740: {
    label: "AWS Labs MCP #2740, isolated browser sessions",
    kind: "pull-request",
    href: "https://github.com/awslabs/mcp/pull/2740",
  },
  awsCdkRepository: {
    label: "AWS CDK source code",
    kind: "repository",
    href: "https://github.com/aws/aws-cdk",
  },
  awsCdkCliRepository: {
    label: "AWS CDK CLI source code",
    kind: "repository",
    href: "https://github.com/aws/aws-cdk-cli",
  },
  jsiiRepository: {
    label: "jsii source code",
    kind: "repository",
    href: "https://github.com/aws/jsii",
  },
  awsCdkCliPr1063: {
    label: "AWS CDK CLI #1063, visible Fn::ForEach changes",
    kind: "pull-request",
    href: "https://github.com/aws/aws-cdk-cli/pull/1063",
  },
  awsCdkCliPr1457: {
    label: "AWS CDK CLI #1457, QuickSight hotswap",
    kind: "pull-request",
    href: "https://github.com/aws/aws-cdk-cli/pull/1457",
  },
  awsCdkPr36801: {
    label: "AWS CDK #36801, looped CloudFormation resources",
    kind: "pull-request",
    href: "https://github.com/aws/aws-cdk/pull/36801",
  },
  awsCdkPr38675: {
    label: "AWS CDK #38675, executable documentation contract",
    kind: "pull-request",
    href: "https://github.com/aws/aws-cdk/pull/38675",
  },
  jsiiPr5054: {
    label: "jsii #5054, promise cleanup",
    kind: "pull-request",
    href: "https://github.com/aws/jsii/pull/5054",
  },
  jsiiPr5055: {
    label: "jsii #5055, cached type lookup",
    kind: "pull-request",
    href: "https://github.com/aws/jsii/pull/5055",
  },
  jsiiPr5056: {
    label: "jsii #5056, indexed member lookup",
    kind: "pull-request",
    href: "https://github.com/aws/jsii/pull/5056",
  },
  jsiiPr5057: {
    label: "jsii #5057, smaller runtime bundle",
    kind: "pull-request",
    href: "https://github.com/aws/jsii/pull/5057",
  },
  publicHistorySnapshot: {
    label: "Public contribution summary",
    kind: "snapshot",
    href: "https://github.com/mh0pe/mh0pe.github.io/blob/main/app/data/public-history-summary.json",
  },
} as const satisfies Readonly<Record<string, PublicSourceDefinition>>;

export type PublicSourceId = keyof typeof publicSources;

export type PublicSourceUrlMap = {
  readonly [SourceId in PublicSourceId]: (typeof publicSources)[SourceId]["href"];
};

export const publicSourceUrls = Object.fromEntries(
  Object.entries(publicSources).map(([id, source]) => [id, source.href]),
) as PublicSourceUrlMap;

export interface ProofVocabularyEntry {
  readonly id: ProofKind;
  readonly label: string;
  readonly establishes: string;
  readonly doesNotEstablish: string;
}

export const proofVocabulary = [
  {
    id: "release",
    label: "Release",
    establishes:
      "A named version made the linked capability available in a published upstream release.",
    doesNotEstablish:
      "Production adoption, customer outcomes, or employer endorsement.",
  },
  {
    id: "pull-request",
    label: "Reviewed change (pull request)",
    establishes:
      "The implementation, review history, author record, and integration state visible on the linked pull request.",
    doesNotEstablish:
      "Upstream availability unless the pull request is merged, or release availability unless a release is linked.",
  },
  {
    id: "commit",
    label: "Code revision (commit)",
    establishes:
      "The exact code and files present at an immutable public revision.",
    doesNotEstablish:
      "Upstream integration, release, or use outside that codebase.",
  },
  {
    id: "branch",
    label: "Public implementation (branch)",
    establishes:
      "An inspectable capability at a named public implementation location.",
    doesNotEstablish:
      "Upstream adoption; branch contents can also move after the observation date.",
  },
  {
    id: "repository",
    label: "Project source code (repository)",
    establishes:
      "The public source location and surrounding project context.",
    doesNotEstablish:
      "Authorship of every file, upstream adoption, or production use.",
  },
  {
    id: "documentation",
    label: "Documentation",
    establishes:
      "The documented interface, intended behavior, or supported workflow.",
    doesNotEstablish:
      "Runtime behavior beyond what code, tests, or a release separately demonstrate.",
  },
  {
    id: "test",
    label: "Automated check (test)",
    establishes:
      "An executable expectation and the behavior that the public test covers.",
    doesNotEstablish:
      "Production use or behavior outside the tested conditions.",
  },
  {
    id: "profile",
    label: "Profile",
    establishes:
      "The linked public identity or professional context.",
    doesNotEstablish:
      "Authorship, adoption, or outcomes for a particular implementation.",
  },
  {
    id: "snapshot",
    label: "Contribution summary",
    establishes:
      "A reproducible count from the linked public contribution summary.",
    doesNotEstablish:
      "Activity outside the documented public collection scope.",
  },
] as const satisfies readonly ProofVocabularyEntry[];

export interface StatusVocabularyEntry {
  readonly id: PortfolioStatusId;
  readonly dimension: StatusDimension;
  readonly label: string;
  readonly definition: string;
}

export const statusVocabulary = [
  {
    id: "available-upstream-release",
    dimension: "availability",
    label: "Available in an original project release",
    definition:
      "The capability is present in a linked, published release from the original project.",
  },
  {
    id: "available-upstream",
    dimension: "availability",
    label: "Available in the original project",
    definition:
      "The capability is integrated into the original project's public code, whether or not a separate release is linked.",
  },
  {
    id: "available-public-branch",
    dimension: "availability",
    label: "Available in public code",
    definition:
      "The implementation can be inspected at the linked working version or reviewed change.",
  },
  {
    id: "available-public-fork",
    dimension: "availability",
    label: "Available in an independent public version",
    definition:
      "The capability remains usable in public code while adoption by the original project is still open or has concluded.",
  },
  {
    id: "available-portfolio-repository",
    dimension: "availability",
    label: "Available in the portfolio's public code",
    definition:
      "The capability is maintained in linked public code for this body of work.",
  },
  {
    id: "released-upstream",
    dimension: "adoption",
    label: "Released by the original project",
    definition:
      "The original project's maintainers integrated the work and included it in a named release.",
  },
  {
    id: "merged-upstream",
    dimension: "adoption",
    label: "Integrated by the original project",
    definition: "The original project integrated the linked reviewed change.",
  },
  {
    id: "upstream-review-active",
    dimension: "adoption",
    label: "Under review by the original project",
    definition:
      "A public implementation is available while the original project's review remains open.",
  },
  {
    id: "upstream-review-closed",
    dimension: "adoption",
    label: "Original project review concluded",
    definition:
      "The original project's review concluded, while the linked public implementation remains available and usable.",
  },
  {
    id: "merged-portfolio",
    dimension: "adoption",
    label: "Integrated in the portfolio's public code",
    definition:
      "The change is integrated and usable in the linked public code.",
  },
  {
    id: "public-prototype",
    dimension: "maturity",
    label: "Public prototype",
    definition:
      "The implementation demonstrates the architecture in public source and is presented as exploratory work.",
  },
  {
    id: "validated-implementation",
    dimension: "maturity",
    label: "Validated implementation",
    definition:
      "The public change includes executable checks or review evidence for the stated behavior.",
  },
] as const satisfies readonly StatusVocabularyEntry[];

export interface ProfileLink {
  readonly id: "mh0pe" | "awsmadi" | "linkedin";
  readonly label: string;
  readonly display: string;
  readonly ariaLabel: string;
  readonly sourceId: PublicSourceId;
  readonly href: PublicUrl;
}

export const profileLinks = [
  {
    id: "mh0pe",
    label: "GitHub, mh0pe",
    display: "GitHub · mh0pe",
    ariaLabel: "Madison Hope Steiner on GitHub as mh0pe",
    sourceId: "githubMh0pe",
    href: publicSources.githubMh0pe.href,
  },
  {
    id: "awsmadi",
    label: "GitHub, awsmadi",
    display: "GitHub · awsmadi",
    ariaLabel: "Madison Hope Steiner on GitHub as awsmadi",
    sourceId: "githubAwsmadi",
    href: publicSources.githubAwsmadi.href,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    display: "LinkedIn",
    ariaLabel: "Madison Hope Steiner on LinkedIn",
    sourceId: "linkedinMadison",
    href: publicSources.linkedinMadison.href,
  },
] as const satisfies readonly ProfileLink[];

export interface PortfolioIdentity {
  readonly name: string;
  readonly role: string;
  readonly roleSourceId: PublicSourceId;
  readonly roleBasis: string;
  readonly eyebrow: string;
  readonly brandLine: string;
  readonly headline: string;
  readonly introduction: string;
  readonly awsContext: string;
  readonly proofStandard: string;
  readonly independenceNote: string;
}

export const portfolioIdentity = {
  name: "Madison Hope Steiner",
  role: "Principal AI Architect",
  roleSourceId: "linkedinMadison",
  roleBasis: "As a Principal AI Architect, I work across AI systems, cloud platforms, security, and organizational design.",
  eyebrow: "Principal AI Architect",
  brandLine: "Bringing Hope to distributed systems at enterprise scale.",
  headline: "I help teams build and run AI, security, and cloud systems.",
  introduction:
    "My work spans architecture and hands-on implementation. These projects show what changed and how it works.",
  awsContext:
    "Open-source work across AWS security and developer tooling builds on strong upstream foundations and reflects public collaboration with project maintainers.",
  proofStandard:
    "The public record establishes implementation and integration state. It does not by itself imply production adoption, customer outcomes, or employer endorsement.",
  independenceNote:
    "Personal portfolio. The work and views here are my own, not statements made on behalf of any current or former employer.",
} as const satisfies PortfolioIdentity;

export interface OrganizationContext {
  readonly id: string;
  readonly label: string;
  readonly scope: string;
  readonly careerContextSourceId: "linkedinMadison";
  readonly observedAt: "2026-07-23";
  readonly basis: "self-reported-scope-with-public-profile-context";
}

export const organizationContexts = [
  {
    id: "payments-network",
    label: "Global payments network",
    scope:
      "A tokenized payments platform designed around enterprise trust, security, and governance.",
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  },
  {
    id: "financial-institution",
    label: "Major U.S. financial institution",
    scope:
      "Platform integration and security engineering during a large acquisition in a regulated banking environment.",
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  },
  {
    id: "mobility-manufacturer",
    label: "Global automotive and mobility manufacturer",
    scope:
      "Shared data foundations for operational reporting across mobility and manufacturing.",
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  },
  {
    id: "vehicle-manufacturer",
    label: "International vehicle manufacturer",
    scope: "Shared data foundations for large-scale operational reporting and analysis.",
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  },
  {
    id: "investment-manager",
    label: "Global investment manager",
    scope:
      "A faster, governed path for teams to receive secure AWS accounts at enterprise scale.",
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  },
] as const satisfies readonly OrganizationContext[];

export const organizationContextNote =
  "These are my descriptions of the scope I supported. The linked public profile provides career context rather than independent verification of individual outcomes.";

export const employerIdentityNote =
  "Employer identification only. All trademarks remain the property of their respective owners and do not imply endorsement.";

export interface PublicRecordSnapshot {
  readonly publicOnly: true;
  readonly observedAt: string;
  readonly publicSince: number;
  readonly authoredMergedPullRequests: number;
  readonly attributedMergedPullRequests: number;
  readonly mergedPullRequestTargetRepositories: number;
  readonly allSubmittedPullRequestTargetRepositories: number;
  readonly basis: string;
}

export const publicRecordSnapshot = {
  publicOnly: true,
  observedAt: publicHistory.cutoff_date,
  publicSince: 2014,
  authoredMergedPullRequests: publicHistory.combined.merged_authored_pull_requests,
  attributedMergedPullRequests: publicHistory.combined.merged_attributed_contribution_pull_requests,
  mergedPullRequestTargetRepositories: publicHistory.presentation.merged_authored_pr_target_repositories,
  allSubmittedPullRequestTargetRepositories: publicHistory.combined.distinct_pr_target_repositories,
  basis:
    "Generated from the public-only mh0pe and awsmadi GitHub history using the authorship, attribution, and repository-scope rules in public-history-summary.json.",
} as const satisfies PublicRecordSnapshot;

export interface OutcomeSummary {
  readonly id:
    | "workspace-orchestration"
    | "agent-integration-contract"
    | "reviewable-svg-stack"
    | "public-contribution-record";
  readonly value: string;
  readonly label: string;
  readonly title: string;
  readonly summary: string;
  readonly sourceIds: readonly PublicSourceId[];
  readonly proofKind: ProofKind;
  readonly proofHref?: `/${string}`;
  readonly evidenceNote?: string;
}

export type FourOutcomeSummaries = readonly [
  OutcomeSummary,
  OutcomeSummary,
  OutcomeSummary,
  OutcomeSummary,
];

export const outcomeSummaries = [
  {
    id: "workspace-orchestration",
    value: "One",
    label: "governed workspace across many projects",
    title: "Coordinate security across projects without losing ownership.",
    summary:
      "One workspace plan keeps each project's policy, boundaries, and failure state visible.",
    sourceIds: [
      "ashRelease370",
      "ashPr456",
      "ashPr460",
      "ashPr462",
      "ashPr465",
      "ashPr472",
      "ashPr478",
    ],
    proofKind: "release",
    proofHref: "/work/automated-security-helper/#source",
  },
  {
    id: "agent-integration-contract",
    value: "15",
    label: "Agent platforms from one contract",
    title: "Ship fifteen agent integrations from one contract.",
    summary:
      "One tested source keeps packaging, installation, and behavior aligned without maintaining fifteen separate copies.",
    sourceIds: ["ashPr331"],
    proofKind: "pull-request",
  },
  {
    id: "reviewable-svg-stack",
    value: "7",
    label: "SVG capability layers merged upstream",
    title: "Ship a broad browser capability in seven reviewable layers.",
    summary:
      "Lightpanda merged all seven ordered layers, so each capability could be tested and reviewed independently.",
    sourceIds: [
      "lightpandaPr3012",
      "lightpandaPr3034",
      "lightpandaPr3030",
      "lightpandaPr3033",
      "lightpandaPr3031",
      "lightpandaPr3029",
      "lightpandaPr3032",
    ],
    proofKind: "pull-request",
    proofHref: "/capabilities/#capability-lightpanda-svg",
  },
  {
    id: "public-contribution-record",
    value: String(publicRecordSnapshot.authoredMergedPullRequests),
    label: "Authored public pull requests merged",
    title: "Contribute across systems other teams depend on.",
    summary:
      `The public record connects ${publicRecordSnapshot.authoredMergedPullRequests} merged pull requests authored as mh0pe or awsmadi to the systems, reviews, and code behind them.`,
    sourceIds: ["publicHistorySnapshot"],
    proofKind: "snapshot",
    evidenceNote:
      "Account-directed contributions are retained separately and are not presented as GitHub-authored work.",
  },
] as const satisfies FourOutcomeSummaries;

export const flagshipStageNames = [
  "Pressure",
  "Constraint",
  "Decision",
  "Implementation",
  "State",
  "Proof",
] as const;

export type FlagshipStageName = (typeof flagshipStageNames)[number];

export interface FlagshipStage<
  Name extends FlagshipStageName = FlagshipStageName,
> {
  readonly name: Name;
  readonly index: string;
  readonly title: string;
  readonly body: string;
  readonly points?: readonly string[];
  readonly sourceIds: readonly PublicSourceId[];
  readonly claimIds?: readonly string[];
}

export type AuditableLoadPathStages = readonly [
  FlagshipStage<"Pressure">,
  FlagshipStage<"Constraint">,
  FlagshipStage<"Decision">,
  FlagshipStage<"Implementation">,
  FlagshipStage<"State">,
  FlagshipStage<"Proof">,
];

export type CaseStudyId =
  | "automated-security-helper"
  | "cloudformation-guard"
  | "nix-windows"
  | "agent-systems";

export interface EvidenceClaim {
  readonly id: string;
  readonly outcome: string;
  readonly contribution: ContributionVerb;
  readonly state: DeliveryState;
  readonly availability: string;
  readonly adoption: string;
  readonly maturity: string;
  readonly sourceIds: readonly PublicSourceId[];
  readonly observedAt: string;
  readonly publicOnly: true;
}

export interface CaseStudy {
  readonly id: CaseStudyId;
  readonly family: SystemFamily;
  readonly eyebrow: string;
  readonly title: string;
  readonly repository: string;
  readonly repositorySourceId: PublicSourceId;
  readonly period: string;
  readonly cardHeadline: string;
  readonly plainResult: string;
  readonly audience: string;
  readonly proofState: string;
  readonly operatingResult: string;
  readonly responsibility: string;
  readonly summary: string;
  readonly claims: readonly EvidenceClaim[];
  readonly stages: AuditableLoadPathStages;
}

export const automatedSecurityHelperFlagship = {
  id: "automated-security-helper",
  family: "security",
  eyebrow: "Security across many projects",
  title: "Automated Security Helper",
  repository: "awslabs/automated-security-helper",
  repositorySourceId: "ashRepository",
  period: "Public contribution activity · 2024 to 2026",
  cardHeadline: "Security at scale, with ownership intact.",
  plainResult:
    "Teams can coordinate security across many projects without losing control of ownership, boundaries, or failures.",
  audience:
    "Platform and security teams responsible for many projects, tools, and agent-driven workflows.",
  proofState:
    "Workspace orchestration is available in ASH v3.7.0. Distributed scanning and workspace-aware agent tools are now integrated upstream.",
  operatingResult:
    "Teams can plan, scan, and report on a multi-project workspace as one governed system without losing project identity, target boundaries, failure state, or source traceability.",
  responsibility:
    "I led the architecture and implementation of workspace orchestration and agent integrations, then strengthened execution boundaries, repeatability, result integrity, and distributed operation.",
  summary:
    "One governed workflow helps teams plan, run, and trace security checks across many projects.",
  claims: [
    {
      id: "ash-workspace-release",
      outcome: "Multi-project workspace orchestration is available in ASH v3.7.0.",
      contribution: "Implemented",
      state: "Released",
      availability: "Available in the linked upstream release.",
      adoption: "Merged upstream and included in ASH v3.7.0.",
      maturity: "Release-backed implementation with public review history.",
      sourceIds: [
        "ashRelease370",
        "ashPr456",
        "ashPr460",
        "ashPr462",
        "ashPr465",
        "ashPr472",
        "ashPr478",
      ],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "ash-agent-integrations",
      outcome: "One validated contract produces integrations for fifteen agent platforms.",
      contribution: "Implemented",
      state: "Merged",
      availability: "Available in the upstream ASH project.",
      adoption: "Merged upstream in ASH #331.",
      maturity: "Validated by generated-package smoke tests and external schemas.",
      sourceIds: ["ashPr331"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "ash-distributed-execution",
      outcome: "Teams can split security scanners across AWS execution targets and combine their results without losing per-target failures.",
      contribution: "Implemented",
      state: "Merged",
      availability: "Available in the upstream ASH project.",
      adoption:
        "Merged upstream in ASH #494 and #514.",
      maturity: "Validated implementation with explicit target-failure coverage.",
      sourceIds: ["ashPr494", "ashPr514"],
      observedAt: "2026-09-19",
      publicOnly: true,
    },
    {
      id: "ash-workspace-agent-tools",
      outcome: "Coding agents can discover a workspace, scan its projects, and return results with project identity intact.",
      contribution: "Implemented",
      state: "Merged",
      availability: "Available in upstream ASH for local workspace scans.",
      adoption: "Merged upstream in ASH #493; installable agent skills followed in #534.",
      maturity: "Validated workspace tools with project-level progress and generated-integration checks.",
      sourceIds: ["ashPr493", "ashPr534"],
      observedAt: "2026-09-19",
      publicOnly: true,
    },
  ],
  stages: [
    {
      name: "Pressure",
      index: "01",
      title: "Security work now spans the whole workspace.",
      body:
        "ASH already provided a strong foundation for source, dependency, and infrastructure scanning. The next step was to coordinate multiple projects and agent-triggered workflows without losing ownership, policy context, or confidence in the result.",
      sourceIds: ["ashRepository", "ashDocumentation"],
      claimIds: ["ash-workspace-release"],
    },
    {
      name: "Constraint",
      index: "02",
      title: "Workspace scale still needs exact boundaries.",
      body:
        "Workspace support had to preserve project identity, confine agent-selected paths to operator-approved roots, remain portable across operating systems, and distinguish scanner failure from a genuinely clean result.",
      points: [
        "Keep each project execution isolated while retaining workspace policy.",
        "Resolve paths canonically and reject symlink escapes.",
        "Make scanner supply reproducible without requiring a custom container image.",
        "Report incomplete execution as an error, not an empty success.",
      ],
      sourceIds: [
        "ashPr456",
        "ashPr460",
        "ashPr462",
        "ashPr472",
        "ashPr477",
        "ashPr508",
        "ashPr514",
      ],
      claimIds: ["ash-workspace-release", "ash-distributed-execution"],
    },
    {
      name: "Decision",
      index: "03",
      title: "Model the workspace before any tool runs.",
      body:
        "The architecture resolves workspace definitions before execution, gives each project a scoped run, and aggregates typed results afterward. The same control-plane approach uses one validated contract for agent integrations and explicit boundaries for tools, scanners, and failures.",
      sourceIds: ["ashPr460", "ashPr462", "ashPr331", "ashPr477"],
      claimIds: ["ash-workspace-release", "ash-agent-integrations"],
    },
    {
      name: "Implementation",
      index: "04",
      title: "One control plane connects planning, execution, and results.",
      body:
        "The implementation connects workspace planning, per-project execution, agent tooling, reproducible scanner supply, file-selection semantics, and result integrity instead of treating them as separate features.",
      points: [
        "Plan validated workspaces and retain project identity through aggregate reports.",
        "Generate integrations for fifteen agent platforms and provide installable skills from one source of truth.",
        "Let agents resolve and scan local workspaces while preserving project-level progress and result identity.",
        "Confine MCP targets to configured roots with session-aware isolation.",
        "Pin all ten scanner binaries across Linux and macOS, x86-64 and ARM, with nine participating end to end through Nix mode.",
        "Apply nested ignore rules to the correct subtree and stabilize finding paths across Windows drives.",
        "Split scanners across AgentCore, ECS Fargate, Lambda, or CodePipeline targets and combine their results.",
      ],
      sourceIds: [
        "ashPr456",
        "ashPr460",
        "ashPr462",
        "ashPr465",
        "ashPr472",
        "ashPr478",
        "ashPr331",
        "ashPr477",
        "ashPr493",
        "ashPr534",
        "ashPr508",
        "ashPr501",
        "ashPr502",
        "ashPr494",
      ],
      claimIds: [
        "ash-workspace-release",
        "ash-agent-integrations",
        "ash-distributed-execution",
        "ash-workspace-agent-tools",
      ],
    },
    {
      name: "State",
      index: "05",
      title: "The capability runs from workspace setup through distributed execution.",
      body:
        "ASH v3.7.0 introduced governed multi-project workspaces. Subsequent upstream contributions let agents operate on those workspaces and distribute scanners across AWS targets. Results retain project identity and explicit failure states, while pinned scanner environments support repeatable runs on Linux and macOS.",
      sourceIds: [
        "ashRelease370",
        "ashPr456",
        "ashPr460",
        "ashPr462",
        "ashPr465",
        "ashPr472",
        "ashPr478",
        "ashPr331",
        "ashPr477",
        "ashPr493",
        "ashPr534",
        "ashPr501",
        "ashPr502",
        "ashPr508",
        "ashPr515",
        "ashPr494",
        "ashPr514",
      ],
      claimIds: [
        "ash-workspace-release",
        "ash-agent-integrations",
        "ash-distributed-execution",
        "ash-workspace-agent-tools",
      ],
    },
    {
      name: "Proof",
      index: "06",
      title: "Follow the system from release to source.",
      body:
        "The release shows where workspace mode can be used today. The linked pull requests explain how planning, isolation, scanner supply, reporting, and distributed execution fit together. The project and its documentation place those choices in the broader operating model.",
      sourceIds: [
        "ashRelease370",
        "ashPr456",
        "ashPr460",
        "ashPr462",
        "ashPr465",
        "ashPr472",
        "ashPr478",
        "ashPr331",
        "ashPr477",
        "ashPr493",
        "ashPr534",
        "ashPr501",
        "ashPr502",
        "ashPr508",
        "ashPr494",
        "ashPr514",
        "ashRepository",
        "ashDocumentation",
      ],
      claimIds: [
        "ash-workspace-release",
        "ash-agent-integrations",
        "ash-distributed-execution",
        "ash-workspace-agent-tools",
      ],
    },
  ],
} as const satisfies CaseStudy;

export const cloudFormationGuardCaseStudy = {
  id: "cloudformation-guard",
  family: "security",
  eyebrow: "Policy decisions teams can trust",
  title: "CloudFormation Guard",
  repository: "aws-cloudformation/cloudformation-guard",
  repositorySourceId: "guardRepository",
  period: "Public contribution activity · 2026",
  cardHeadline: "Policy results that preserve intent.",
  plainResult:
    "Teams can trust that a policy verdict keeps the meaning its author intended, from evaluation through the result an operator sees.",
  audience:
    "Cloud platform and security teams that rely on policy checks to make safe infrastructure decisions.",
  proofState:
    "The core verdict correction is available in Guard 3.2.1. Wider integrity checks are available in the linked public branches.",
  operatingResult:
    "Policy verdicts keep their intended meaning from evaluation through reporting, testing, and published rule packs.",
  responsibility:
    "I traced policy errors across evaluation and reporting, corrected the semantics, and added regression coverage for the full verdict path.",
  summary:
    "A correctness program for the full path between a policy author’s intent and the verdict an operator receives.",
  claims: [
    {
      id: "guard-verdict-release",
      outcome: "A verdict-integrity correction is available in CloudFormation Guard 3.2.1.",
      contribution: "Implemented",
      state: "Released",
      availability: "Available in the linked upstream release.",
      adoption: "Merged upstream in Guard #717 and included in 3.2.1.",
      maturity: "Release-backed regression coverage for evaluator and reporter defects.",
      sourceIds: ["guardPr717", "guardRelease321"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "guard-semantic-audit",
      outcome: "Policy authors can express ranges, preserve text during replacements, and connect each test to the intended rule.",
      contribution: "Implemented",
      state: "Open",
      availability: "Available in linked public pull-request branches.",
      adoption:
        "Public implementations extend Guard #720 and #727 with focused changes in #747 through #750, alongside Rules Registry #287.",
      maturity: "Executable implementations with targeted fixtures and regression tests.",
      sourceIds: ["guardPr720", "guardPr727", "guardPr747", "guardPr748", "guardPr749", "guardPr750", "guardRulesPr287"],
      observedAt: "2026-09-19",
      publicOnly: true,
    },
  ],
  stages: [
    {
      name: "Pressure",
      index: "01",
      title: "A policy verdict must carry its meaning end to end.",
      body:
        "Infrastructure policy depends on more than avoiding a crash. A rule can report compliance for input it should reject, a negative test can pass for the wrong reason, or a published pack can differ from the source checked in isolation. Operators need the verdict to preserve the policy author’s intent.",
      sourceIds: ["guardRepository", "guardPr717"],
      claimIds: ["guard-verdict-release"],
    },
    {
      name: "Constraint",
      index: "02",
      title: "Correctness crosses every evaluator boundary.",
      body:
        "Parser boundaries, empty collections, missing values, filters, captures, coercion, negation, reporting, test harnesses, and assembled rule packs all influence the final result. A superficial fix at the last symptom would leave neighboring false-confidence paths intact and make future regressions harder to localize.",
      points: [
        "Distinguish missing data from true, false, and error outcomes.",
        "Preserve the rule path and diagnostic that produced a negative result.",
        "Test the assembled pack that users consume, not only isolated source files.",
      ],
      sourceIds: ["guardPr717", "guardPr720", "guardPr727", "guardRulesPr287"],
    },
    {
      name: "Decision",
      index: "03",
      title: "Trace meaning, not just the process exit.",
      body:
        "The work treats correctness as a pipeline contract. Each change identifies the first semantic divergence, repairs it at the responsible layer, and then asserts both the outcome and the explanatory path. Negative tests must demonstrate that the intended rule failed, rather than accepting any nonzero process exit as proof.",
      sourceIds: ["guardPr717", "guardPr720", "guardPr727"],
      claimIds: ["guard-verdict-release", "guard-semantic-audit"],
    },
    {
      name: "Implementation",
      index: "04",
      title: "Strengthen the full verdict path.",
      body:
        "The released correction restores verdict and diagnostic integrity where evaluator and reporter behavior could hide a rejection. The wider implementation adds an explicit value for nothing-to-compare cases, hardens filter and capture behavior, keeps reporter failures from obscuring results, and checks duplicate rules in the assembled registry artifact.",
      points: [
        "Repair wrong-pass and missing-diagnostic behavior at the root semantic layer.",
        "Add four-valued outcomes for empty and absent comparisons.",
        "Exercise published rule packs after assembly to catch duplicate declarations.",
        "Treat ranges inside lists as range membership and keep non-finite number comparisons consistent.",
        "Preserve unmatched text during replacements and pair each test with the most specific policy filename.",
      ],
      sourceIds: ["guardPr717", "guardPr720", "guardPr727", "guardPr747", "guardPr748", "guardPr749", "guardPr750", "guardRulesPr287"],
    },
    {
      name: "State",
      index: "05",
      title: "The work spans a released fix and a broader integrity path.",
      body:
        "Guard 3.2.1 includes the evaluator and reporter correction. The public implementation now also covers range membership, number comparisons, text replacement, and precise test-to-rule matching. These focused changes sit alongside the broader work on evaluation outcomes and assembled rule packs.",
      sourceIds: ["guardRelease321", "guardPr717", "guardPr720", "guardPr727", "guardRulesPr287"],
      claimIds: ["guard-verdict-release", "guard-semantic-audit"],
    },
    {
      name: "Proof",
      index: "06",
      title: "Trace the verdict through code, fixtures, and release notes.",
      body:
        "Guard 3.2.1 contains the released correction. The linked pull requests connect the wider semantic work to exact files, fixtures, and technical discussion, so readers can follow each result from policy input to operator-facing verdict.",
      sourceIds: ["guardRelease321", "guardPr717", "guardPr720", "guardPr727", "guardRulesPr287"],
      claimIds: ["guard-verdict-release", "guard-semantic-audit"],
    },
  ],
} as const satisfies CaseStudy;

export const nixWindowsCaseStudy = {
  id: "nix-windows",
  family: "durability",
  eyebrow: "Reproducible builds on Windows",
  title: "Nix on Windows",
  repository: "NixOS/nix",
  repositorySourceId: "nixRepository",
  period: "Public contribution activity · 2026",
  cardHeadline: "Windows support in testable steps.",
  plainResult:
    "A team can advance Windows support in independent, testable steps instead of betting the entire port on one large change.",
  audience:
    "Infrastructure and developer-platform teams bringing reproducible builds across operating-system boundaries.",
  proofState:
    "The Windows builder foundation is integrated upstream. The wider runtime is available in the linked public fork and branches.",
  operatingResult:
    "The upstream foundation can execute a minimal Windows builder and cross-build the complete project. Public implementations extend that path through recursive builds, lossless filenames, network paths, and explicit process boundaries.",
  responsibility:
    "I built and validated the Windows execution path in independently testable stages, from the first builder through project-wide cross-builds and recursive operation.",
  summary:
    "A staged path for bringing reproducible Nix builds to Windows while keeping each layer independently testable.",
  claims: [
    {
      id: "nix-builder-merged",
      outcome: "A minimal Windows derivation builder and whole-project cross-build coverage are available upstream.",
      contribution: "Implemented",
      state: "Merged",
      availability: "Available in the upstream Nix project.",
      adoption: "Merged upstream in Nix #16347 and #16368.",
      maturity: "Build-path implementation backed by project-wide cross-build coverage.",
      sourceIds: ["nixPr16347", "nixPr16368"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "nix-runtime-open",
      outcome: "The Windows runtime extends through libstore assurance, content-addressed outputs, and recursive Nix.",
      contribution: "Implemented",
      state: "Open",
      availability: "Available in the public fork and linked pull-request branches.",
      adoption:
        "Implemented in Nix #16411 and #16414 and available from the linked public fork.",
      maturity: "Validated through a separate Windows checking path.",
      sourceIds: ["nixPr16411", "nixPr16414", "nixValidationPr1", "nixFork"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "nix-portable-boundaries",
      outcome: "Windows filenames survive conversion intact, child processes receive explicit handles, and recursive build connections have coordinated shutdown.",
      contribution: "Implemented",
      state: "Open",
      availability: "Available in the linked public implementation branches.",
      adoption: "Implemented in Nix #16449 and #16451; #16453 defines the network-isolation settings contract.",
      maturity: "Focused path and process tests. Network-isolation settings reject unsupported backends; they do not implement a Windows sandbox.",
      sourceIds: ["nixPr16449", "nixPr16451", "nixPr16453", "nixShutdownCommit", "nixSocketCommit"],
      observedAt: "2026-09-19",
      publicOnly: true,
    },
  ],
  stages: [
    {
      name: "Pressure",
      index: "01",
      title: "A new platform exposes every hidden assumption.",
      body:
        "Nix’s model depends on stable store paths, isolated builders, deterministic references, and explicit process boundaries. Bringing those semantics across the Windows portability boundary means more than making the code compile. The useful result is a build path whose outputs and failure modes remain understandable under a different process, filesystem, and toolchain model.",
      sourceIds: ["nixRepository", "nixPr16347"],
      claimIds: ["nix-builder-merged"],
    },
    {
      name: "Constraint",
      index: "02",
      title: "Windows support must preserve Nix semantics.",
      body:
        "The Windows implementation sits inside a large, portable C++ system. Process creation, handle inheritance, path behavior, executable discovery, daemon communication, store semantics, content-addressed outputs, and cross-compilation all meet at boundaries already relied on by other platforms. Each step needs a narrow seam and a result that can be checked independently.",
      points: [
        "Keep platform hooks narrow and preserve common builder logic.",
        "Cross-build every Windows component so unvisited code cannot silently drift.",
        "Validate produced results separately from the build that created them.",
      ],
      sourceIds: ["nixPr16347", "nixPr16368", "nixValidationPr1"],
    },
    {
      name: "Decision",
      index: "03",
      title: "Advance through narrow portability seams.",
      body:
        "The implementation separates a minimal derivation builder, project-wide cross-build coverage, libstore and output semantics, and recursive operation. Each layer can move independently without making the complete capability wait on one large integration step. A separate public validation project checks build results instead of allowing the implementation to grade its own output.",
      sourceIds: ["nixPr16347", "nixPr16368", "nixPr16411", "nixPr16414", "nixValidationPr1"],
      claimIds: ["nix-builder-merged", "nix-runtime-open"],
    },
    {
      name: "Implementation",
      index: "04",
      title: "Extend the path from derivation execution to recursive Nix.",
      body:
        "The Windows path adds a minimal derivation builder and brings every project component into the cross-build graph. It turns libstore tests into a meaningful gate, enables content-addressed and fixed-output derivations, restores evaluator startup in the validation environment, and lifts recursive Nix into the shared builder with focused platform hooks.",
      points: [
        "Execute derivations through the shared builder contract.",
        "Bring complete Windows components into the cross-build graph.",
        "Exercise libstore and recursive operation with independent output checks.",
        "Preserve Windows filenames and network-share roots without losing characters during conversion.",
        "Make process-handle inheritance portable and reject network-isolation options that have no implemented backend.",
        "Coordinate recursive-build shutdown across listening sockets, connected clients, and worker threads.",
      ],
      sourceIds: ["nixPr16347", "nixPr16368", "nixPr16411", "nixPr16414", "nixPr16449", "nixPr16451", "nixPr16453", "nixShutdownCommit", "nixSocketCommit", "nixValidationPr1"],
      claimIds: ["nix-builder-merged", "nix-runtime-open", "nix-portable-boundaries"],
    },
    {
      name: "State",
      index: "05",
      title: "Windows now has an upstream foundation and a usable wider runtime.",
      body:
        "The Windows derivation builder and complete cross-build coverage are integrated upstream. Public branches extend that foundation with libstore checks, richer output semantics, recursive operation, lossless filenames, and explicit process-handle inheritance. An independent validation harness checks the resulting build path.",
      sourceIds: ["nixPr16347", "nixPr16368", "nixPr16411", "nixPr16414", "nixPr16449", "nixPr16451", "nixFork"],
      claimIds: ["nix-builder-merged", "nix-runtime-open", "nix-portable-boundaries"],
    },
    {
      name: "Proof",
      index: "06",
      title: "Inspect the builder, runtime, and independent result checks.",
      body:
        "The linked pull requests connect each Windows capability to its implementation and tests. The public fork brings the full runtime path together, while the separate validation harness checks the build results through an independent code path.",
      sourceIds: ["nixPr16347", "nixPr16368", "nixPr16411", "nixPr16414", "nixPr16449", "nixPr16451", "nixShutdownCommit", "nixSocketCommit", "nixValidationPr1", "nixFork"],
      claimIds: ["nix-builder-merged", "nix-runtime-open", "nix-portable-boundaries"],
    },
  ],
} as const satisfies CaseStudy;

export const agentSystemsCaseStudy = {
  id: "agent-systems",
  family: "agents",
  eyebrow: "Agent teamwork with durable memory",
  title: "BASE, CARL, PAUL, and SEED",
  repository: "BASE public fork",
  repositorySourceId: "baseRepository",
  period: "Public contribution activity · 2026",
  cardHeadline: "Agent teams that carry context forward.",
  plainResult:
    "Agent teams can remember reviewed decisions, recover interrupted work, and hand delivery across tools without losing context.",
  audience:
    "Engineering organizations building durable workflows around coding agents and coordinated agent teams.",
  proofState:
    "The connected systems are available as working implementations across the linked public projects.",
  operatingResult:
    "Agent teams can retain reviewed decisions, recover delivery state, coordinate plans, and hand work across coding tools without losing context.",
  responsibility:
    "I have helped pioneer practical patterns for subagents, coordinated agent teams, and organizations that improve their own operating playbooks. In BASE, CARL, PAUL, and SEED, those ideas become recoverable state, reviewed decisions, portable configuration, and reliable cross-tool handoff.",
  summary:
    "A portable operating layer that helps agent teams remember decisions, coordinate work, and improve their own methods.",
  claims: [
    {
      id: "agent-portability-merged",
      outcome: "Session seeding, schema compatibility, and portable integrations connect the CARL, PAUL, and SEED public lineages.",
      contribution: "Implemented",
      state: "Merged",
      availability: "Available in the linked mh0pe public forks.",
      adoption: "Integrated in the CARL, PAUL, and SEED public fork lineages.",
      maturity: "Integrated deltas with schema and plugin compatibility checks.",
      sourceIds: ["carlPr2", "carlPr3", "paulPr1", "seedPr1"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
    {
      id: "agent-state-hardening-open",
      outcome: "BASE adds recoverable state and integration hardening to the same operating model.",
      contribution: "Implemented",
      state: "Open",
      availability: "Available from the linked public pull-request branch.",
      adoption: "Implemented in BASE #2 and available from the mh0pe public fork.",
      maturity: "Working public implementation with state and integration checks.",
      sourceIds: ["basePr2", "baseRepository"],
      observedAt: "2026-09-03",
      publicOnly: true,
    },
  ],
  stages: [
    {
      name: "Pressure",
      index: "01",
      title: "Parallel agents need an operating model.",
      body:
        "Subagents and agent teams can parallelize investigation and implementation, but the organization still needs to know which decisions matter, which work is owned, what evidence survived, and what should improve the next run. Without a durable operating model, useful context remains trapped in transcripts and teams repeat the same coordination failures.",
      sourceIds: ["baseRepository", "carlRepository", "paulRepository", "seedRepository"],
      claimIds: ["agent-portability-merged", "agent-state-hardening-open"],
    },
    {
      name: "Constraint",
      index: "02",
      title: "Useful memory must stay selective and reversible.",
      body:
        "An agent operating system cannot treat every observation as permanent policy. It needs explicit ownership, human review, typed state, and a way to recall only the decisions relevant to the current task. It must also cross CLI, plugin, package-runner, and skills-directory boundaries without depending on one vendor’s runtime conventions.",
      points: [
        "Separate observed experience from approved operating policy.",
        "Persist enough state to resume safely without replaying an entire transcript.",
        "Keep planning and handoff contracts legible across different agent tools.",
      ],
      sourceIds: ["basePr2", "carlPr2", "paulPr1", "seedPr1"],
    },
    {
      name: "Decision",
      index: "03",
      title: "Give memory, policy, planning, and delivery separate contracts.",
      body:
        "BASE handles session memory and reviewed learning. CARL recalls relevant decisions and operating rules. PAUL manages planning and subagent policy. SEED carries typed handoff into delivery. The components interoperate, but their separation keeps memory, policy, planning, and execution from collapsing into one opaque agent loop.",
      sourceIds: ["baseRepository", "carlRepository", "paulRepository", "seedRepository"],
      claimIds: ["agent-portability-merged", "agent-state-hardening-open"],
    },
    {
      name: "Implementation",
      index: "04",
      title: "Turn the operating model into portable software.",
      body:
        "The public changes seed runtime state when plugin sessions start, keep schemas compatible with older resolvers, adopt native-plugin and skills-directory capabilities, and expose package-runner integration where a workflow needs it. The BASE work adds synchronized TOML state and CARL hygiene so a recovered session can reconnect decisions and execution safely. The GitHub plugin adds a template preflight that resolves each project's active contribution rules and fork targets before creating an issue or pull request.",
      points: [
        "Seed recoverable state at the integration boundary.",
        "Validate schemas across real resolver behavior.",
        "Package planning and delivery contracts for multiple coding CLIs.",
        "Preserve project templates and exact base and head semantics when creating issues and pull requests.",
      ],
      sourceIds: ["basePr2", "carlPr2", "carlPr3", "paulPr1", "seedPr1", "pluginsCommit4dd70c4", "pluginsFork"],
    },
    {
      name: "State",
      index: "05",
      title: "The system spans recoverable state and cross-tool integration.",
      body:
        "CARL seeds and recalls session state, PAUL carries planning policy across coding tools, and SEED turns those plans into typed delivery handoffs. BASE extends the same system with synchronized state and hygiene controls. The complete set is available across the linked public fork lineages.",
      sourceIds: ["basePr2", "carlPr2", "carlPr3", "paulPr1", "seedPr1"],
      claimIds: ["agent-portability-merged", "agent-state-hardening-open"],
    },
    {
      name: "Proof",
      index: "06",
      title: "Trace each capability through its public lineage.",
      body:
        "The pull requests show each focused change and its technical discussion. The GitHub plugin commit shows how project templates and fork targets are preserved at creation time. Project links reconnect those changes to the larger agent-system lineage and the capabilities teams can use today.",
      sourceIds: ["basePr2", "carlPr2", "carlPr3", "paulPr1", "seedPr1", "pluginsCommit4dd70c4", "baseRepository", "carlRepository", "paulRepository", "seedRepository", "pluginsFork"],
      claimIds: ["agent-portability-merged", "agent-state-hardening-open"],
    },
  ],
} as const satisfies CaseStudy;

export const caseStudies = [
  automatedSecurityHelperFlagship,
  cloudFormationGuardCaseStudy,
  nixWindowsCaseStudy,
  agentSystemsCaseStudy,
] as const satisfies readonly CaseStudy[];

export interface ArchitectureDecision {
  readonly id:
    | "guard-fail-closed"
    | "generate-agent-integrations"
    | "reviewable-svg-stack";
  readonly number: string;
  readonly family: SystemFamily;
  readonly question: string;
  readonly decision: string;
  readonly consequence: string;
  readonly tradeoff: string;
  readonly sourceIds: readonly PublicSourceId[];
  readonly statusIds: readonly PortfolioStatusId[];
}

export type ThreeArchitectureDecisions = readonly [
  ArchitectureDecision,
  ArchitectureDecision,
  ArchitectureDecision,
];

export const architectureDecisions = [
  {
    id: "guard-fail-closed",
    number: "01",
    family: "security",
    question:
      "How do you prove that a policy test failed for the intended rule, rather than for an unrelated error?",
    decision:
      "Trace evaluator, scope, coercion, negation, and reporter semantics, then assert the rule path and diagnostic rather than accepting any nonzero exit.",
    consequence:
      "The verdict-integrity correction merged upstream and shipped in CloudFormation Guard 3.2.1.",
    tradeoff:
      "The broader semantic audit and more exact fixtures cost more than a superficial regression test, but they protect the meaning of the policy result.",
    sourceIds: ["guardPr717", "guardRelease321"],
    statusIds: [
      "available-upstream-release",
      "released-upstream",
      "validated-implementation",
    ],
  },
  {
    id: "generate-agent-integrations",
    number: "02",
    family: "agents",
    question:
      "How can fifteen agent integrations stay aligned without maintaining fifteen independent copies?",
    decision:
      "Make one validated model the source of truth, then generate platform-specific packages through explicit backends and verify them with smoke tests and external schema validators.",
    consequence:
      "One contract now produces integrations for fifteen agent platforms in the upstream ASH project.",
    tradeoff:
      "The generator, schema cache, and backend validators become infrastructure that must be maintained, while cross-platform drift becomes visible and correctable in one place.",
    sourceIds: ["ashPr331"],
    statusIds: [
      "available-upstream",
      "merged-upstream",
      "validated-implementation",
    ],
  },
  {
    id: "reviewable-svg-stack",
    number: "03",
    family: "browser",
    question:
      "How can a broad SVG DOM proposal become reviewable within a fast-moving browser architecture?",
    decision:
      "Rebuild the feature as seven dependency-ordered layers, with each pull request establishing the interface needed by the next.",
    consequence:
      "Lightpanda merged the complete stack from prototype inheritance through deterministic text metrics.",
    tradeoff:
      "The layered path requires more integration sequencing, but each capability is independently testable, reviewable, and reusable.",
    sourceIds: [
      "lightpandaPr2157",
      "lightpandaPr3012",
      "lightpandaPr3034",
      "lightpandaPr3030",
      "lightpandaPr3033",
      "lightpandaPr3031",
      "lightpandaPr3029",
      "lightpandaPr3032",
      "lightpandaCompleteBranch",
    ],
    statusIds: [
      "available-upstream",
      "merged-upstream",
      "validated-implementation",
    ],
  },
] as const satisfies ThreeArchitectureDecisions;

export interface CapabilityIndexRow {
  readonly id:
    | "cloudformation-guard"
    | "nix-windows"
    | "agent-operating-systems"
    | "github-template-preflight"
    | "rules-js-pnp"
    | "lightpanda-svg"
    | "aws-labs-mcp"
    | "aws-cloud-runtime"
    | "rig-bedrock";
  readonly family: SystemFamily;
  readonly system: string;
  readonly contribution: string;
  readonly capability: string;
  readonly availability: string;
  readonly adoption: string;
  readonly statusIds: readonly PortfolioStatusId[];
  readonly sourceIds: readonly PublicSourceId[];
}

export const capabilityIndexRows = [
  {
    id: "cloudformation-guard",
    family: "security",
    system: "CloudFormation Guard and Guard Rules Registry",
    contribution:
      "Policy verdicts, range comparisons, text transformations, and exact test-to-rule matching, backed by focused regression tests.",
    capability:
      "Policy checks that keep an author's intended result intact through evaluation, reporting, tests, and published rules.",
    availability:
      "Guard 3.2.1 includes the verdict correction. Public implementations extend that path through evaluator semantics, query integrity, diagnostics, and assembled rule packs.",
    adoption:
      "The released correction and the broader public integrity work together cover evaluation, diagnostics, and assembled rule packs.",
    statusIds: [
      "available-upstream-release",
      "available-public-fork",
      "released-upstream",
      "upstream-review-active",
      "validated-implementation",
    ],
    sourceIds: [
      "guardRelease321",
      "guardPr717",
      "guardPr720",
      "guardPr727",
      "guardPr747",
      "guardPr748",
      "guardPr749",
      "guardPr750",
      "guardRulesPr287",
      "guardFork",
    ],
  },
  {
    id: "nix-windows",
    family: "durability",
    system: "Nix on Windows",
    contribution:
      "Windows build execution, recursive operation, lossless filename handling, and portable process boundaries.",
    capability:
      "A staged Windows build path with results checked independently at each layer.",
    availability:
      "The public implementation spans derivation execution, whole-project cross-build coverage, libstore assurance, output semantics, and recursive operation.",
    adoption:
      "The upstream builder and cross-build foundation connect to a public implementation of the wider Windows runtime.",
    statusIds: [
      "available-upstream",
      "available-public-fork",
      "merged-upstream",
      "upstream-review-active",
      "validated-implementation",
    ],
    sourceIds: [
      "nixPr16347",
      "nixPr16368",
      "nixPr16411",
      "nixPr16414",
      "nixPr16449",
      "nixPr16451",
      "nixPr16453",
      "nixValidationPr1",
      "nixFork",
    ],
  },
  {
    id: "agent-operating-systems",
    family: "agents",
    system: "BASE, CARL, PAUL, and SEED",
    contribution:
      "Contributed recoverable state, session configuration seeding, schema compatibility, package-runner installation, and portable plugin and skills-directory integration across public forks.",
    capability:
      "Public implementation work that makes agent-team state and integrations more recoverable, compatible, and portable.",
    availability:
      "Recoverable state and cross-tool integrations are available across the linked public fork lineages.",
    adoption:
      "CARL, PAUL, and SEED integrate the operating model, with BASE hardening available alongside them.",
    statusIds: [
      "available-public-fork",
      "merged-portfolio",
      "upstream-review-active",
      "validated-implementation",
    ],
    sourceIds: [
      "baseRepository",
      "carlRepository",
      "paulRepository",
      "seedRepository",
      "basePr2",
      "carlPr2",
      "carlPr3",
      "paulPr1",
      "seedPr1",
    ],
  },
  {
    id: "github-template-preflight",
    family: "agents",
    system: "Template-aware GitHub creation workflows",
    contribution:
      "Added issue and pull-request template discovery using each project's active contribution rules, inherited policy handling, fork-aware target resolution, and structure-preserving creation rules to the GitHub plugin.",
    capability:
      "Creation workflows read a project's templates and contribution targets before opening an issue or reviewed change.",
    availability:
      "Available in the GitHub plugin on the linked public fork and immutable commit.",
    adoption:
      "Integrated on the public fork's default branch as GitHub plugin version 0.1.7.",
    statusIds: ["available-public-fork", "merged-portfolio"],
    sourceIds: [
      "pluginsCommit4dd70c4",
      "pluginsFork",
      "openaiPluginsRepository",
    ],
  },
  {
    id: "rules-js-pnp",
    family: "durability",
    system: "Integrity-bound Yarn PnP for Bazel",
    contribution:
      "A zero-install importer that cross-validates Yarn 3 and 4 lock and PnP graphs before Bazel loads the project.",
    capability:
      "Resolver, cache, unplugged file, type, and executable-mode evidence is integrity-bound without running Yarn or constructing node_modules.",
    availability:
      "The complete implementation is available in the linked public fork branch.",
    adoption:
      "The complete public implementation incorporates maintainer feedback and is available from the linked branch.",
    statusIds: [
      "available-public-fork",
      "upstream-review-active",
      "validated-implementation",
    ],
    sourceIds: ["rulesJsPr2957", "rulesJsBranch", "rulesJsRepository"],
  },
  {
    id: "lightpanda-svg",
    family: "browser",
    system: "Typed SVG DOM for Lightpanda",
    contribution:
      "Seven dependency-ordered capability layers from prototype chains and live values through geometry, resources, and text.",
    capability:
      "An SVG foundation delivered in seven independently testable and reviewable layers.",
    availability: "All seven capability layers are available upstream.",
    adoption: "Seven linked pull requests merged upstream.",
    statusIds: [
      "available-upstream",
      "merged-upstream",
      "validated-implementation",
    ],
    sourceIds: [
      "lightpandaPr3012",
      "lightpandaPr3034",
      "lightpandaPr3030",
      "lightpandaPr3033",
      "lightpandaPr3031",
      "lightpandaPr3029",
      "lightpandaPr3032",
      "lightpandaCompleteBranch",
    ],
  },
  {
    id: "aws-labs-mcp",
    family: "agents",
    system: "AWS Labs MCP",
    contribution:
      "Richer document loading, document asset extraction, Streamable HTTP and SSE, and isolated AgentCore browser sessions.",
    capability:
      "Document and browser tool surfaces that give agents richer inputs and isolated execution contexts.",
    availability:
      "Richer document loading is available upstream. The transport, asset, and browser-session implementations remain available in the public fork.",
    adoption:
      "Document loading is integrated upstream. The other three capabilities remain complete public implementations in the fork.",
    statusIds: [
      "available-upstream",
      "available-public-fork",
      "merged-upstream",
      "upstream-review-closed",
      "validated-implementation",
    ],
    sourceIds: [
      "awsLabsMcpPr2586",
      "awsLabsMcpPr2645",
      "awsLabsMcpPr2658",
      "awsLabsMcpPr2740",
      "awsLabsMcpFork",
      "awsLabsMcpRepository",
    ],
  },
  {
    id: "rig-bedrock",
    family: "agents",
    system: "Rig model integrations",
    contribution:
      "AWS request signing for Anthropic-compatible model calls, with credential caching and completion and streaming tests.",
    capability:
      "Agent applications can use AWS-authenticated model endpoints without adding AWS dependencies to Rig's core library.",
    availability: "Available in the public implementation linked from Rig #2387.",
    adoption: "The integration lives in rig-bedrock and is proposed upstream in #2387.",
    statusIds: ["available-public-branch", "upstream-review-active"],
    sourceIds: ["rigPr2387"],
  },
  {
    id: "aws-cloud-runtime",
    family: "cloud",
    system: "AWS CDK, AWS CDK CLI, and jsii",
    contribution:
      "Visible infrastructure changes, shared Cloud Control API hotswap, leaner jsii runtime paths, and a public extension for looped resources in CDK.",
    capability:
      "Cloud changes become easier to inspect and faster to iterate while documentation and language-runtime contracts stay aligned with shipped code.",
    availability: "The inspection, hotswap, documentation, and runtime changes are available upstream. Looped-resource construction is available in the linked public implementation.",
    adoption: "The existing CDK, CDK CLI, and jsii changes merged upstream. CDK #36801 extends that work with Fn::ForEach constructs and references.",
    statusIds: [
      "available-upstream",
      "available-public-branch",
      "merged-upstream",
      "upstream-review-active",
      "validated-implementation",
    ],
    sourceIds: [
      "awsCdkCliPr1063",
      "awsCdkCliPr1457",
      "awsCdkPr36801",
      "awsCdkPr38675",
      "jsiiPr5054",
      "jsiiPr5055",
      "jsiiPr5056",
      "jsiiPr5057",
      "awsCdkRepository",
      "awsCdkCliRepository",
      "jsiiRepository",
    ],
  },
] as const satisfies readonly CapabilityIndexRow[];

export const homepageCapabilityIds = [
  "cloudformation-guard",
  "nix-windows",
  "agent-operating-systems",
  "rules-js-pnp",
  "lightpanda-svg",
  "aws-labs-mcp",
] as const satisfies readonly CapabilityIndexRow["id"][];

export interface PortfolioV2Content {
  readonly schemaVersion: 1;
  readonly designName: "Auditable Load Path";
  readonly identity: PortfolioIdentity;
  readonly publicRecord: PublicRecordSnapshot;
  readonly profiles: readonly ProfileLink[];
  readonly outcomes: FourOutcomeSummaries;
  readonly flagship: CaseStudy;
  readonly cases: readonly CaseStudy[];
  readonly decisions: ThreeArchitectureDecisions;
  readonly capabilityIndex: readonly CapabilityIndexRow[];
  readonly homepageCapabilityIds: readonly CapabilityIndexRow["id"][];
  readonly organizationContexts: readonly OrganizationContext[];
  readonly vocabulary: {
    readonly proof: readonly ProofVocabularyEntry[];
    readonly status: readonly StatusVocabularyEntry[];
  };
  readonly sources: typeof publicSources;
  readonly sourceUrls: PublicSourceUrlMap;
}

export const portfolioV2 = {
  schemaVersion: 1,
  designName: "Auditable Load Path",
  identity: portfolioIdentity,
  publicRecord: publicRecordSnapshot,
  profiles: profileLinks,
  outcomes: outcomeSummaries,
  flagship: automatedSecurityHelperFlagship,
  cases: caseStudies,
  decisions: architectureDecisions,
  capabilityIndex: capabilityIndexRows,
  homepageCapabilityIds,
  organizationContexts,
  vocabulary: {
    proof: proofVocabulary,
    status: statusVocabulary,
  },
  sources: publicSources,
  sourceUrls: publicSourceUrls,
} as const satisfies PortfolioV2Content;

export default portfolioV2;
