import type { PublicUrl } from "./portfolio-v2";

export const blogTopics = [
  { id: "security", label: "Security", description: "Checks people can understand and act on." },
  { id: "ai-workflows", label: "AI workflows", description: "Useful tools, shared guidance, and work that survives a handoff." },
  { id: "developer-tools", label: "Developer tools", description: "Clearer feedback where people build and review software." },
  { id: "infrastructure", label: "Infrastructure", description: "Builds with explicit, verifiable inputs." },
  { id: "browser", label: "Browser engineering", description: "Platform capabilities built from the foundations up." },
] as const;

export type BlogTopic = (typeof blogTopics)[number]["id"];
export type DiagramKind = "workspace" | "fan" | "flow" | "layers" | "integrity" | "domains";

export interface ArticleDiagram {
  readonly kind: DiagramKind;
  readonly title: string;
  readonly steps: readonly { readonly label: string; readonly detail: string }[];
  readonly caption: string;
}

export interface ArticleSource {
  readonly id: string;
  readonly label: string;
  readonly href: PublicUrl;
  readonly note?: string;
}

export interface BlogArticle {
  readonly slug: string;
  readonly title: string;
  readonly deck: string;
  readonly topic: BlogTopic;
  readonly tags: readonly string[];
  readonly project: string;
  readonly overview: string;
  readonly intro: readonly string[];
  readonly diagram: ArticleDiagram;
  readonly sections: readonly {
    readonly id: string;
    readonly title: string;
    readonly paragraphs: readonly string[];
    readonly sources?: readonly string[];
    readonly detail?: { readonly title: string; readonly steps: readonly string[]; readonly caption: string };
  }[];
  readonly takeaway: string;
  readonly implementationNotes: readonly string[];
  readonly sources: readonly ArticleSource[];
  readonly relatedCase?: { readonly label: string; readonly href: string };
  readonly linkedinPost?: { readonly href: PublicUrl; readonly label: string };
}

const ashV4Commit = "bd1ce7de6f797548a603ca43d3bf6ab497d3fcee";
const ashV4Source = "https://github.com/awslabs/automated-security-helper/blob/" + ashV4Commit;

export const blogArticles: readonly BlogArticle[] = [
  {
    slug: "workspace-security",
    title: "A shared security view should keep the local context.",
    deck: "How I brought many projects into one ASH workflow without flattening the decisions each team owns.",
    topic: "security",
    tags: ["Project ownership", "Workspace orchestration", "Reporting"],
    project: "Automated Security Helper",
    overview: "Bring the results together. Keep the meaning of each result with the project that produced it.",
    intro: [
      "A team rarely works on just one piece of software. An application, a service, and the infrastructure around them may live in different places, use different checks, and have different owners. A shared security report is useful only if those distinctions survive the trip into it.",
      "My workspace work in Automated Security Helper starts from that idea. ASH can resolve the projects in a workspace, run them with their own context, and bring the results together. The architectural work is in preserving what each result means, not simply collecting more findings.",
    ],
    diagram: {
      kind: "workspace",
      title: "Together in the report. Distinct in the work.",
      steps: [
        { label: "Application", detail: "Its own directory and configuration." },
        { label: "Service", detail: "Its own checks and findings." },
        { label: "Infrastructure", detail: "Its own policy and result." },
        { label: "Shared report", detail: "Project identity travels with every finding." },
      ],
      caption: "An illustrative three-project workspace. The shared view combines results without making the projects one undifferentiated scan.",
    },
    sections: [
      {
        id: "plan-first", title: "Make the plan visible before the work starts.",
        paragraphs: [
          "A workspace definition is an instruction to examine a particular set of projects. I made that instruction inspectable before scanning: which folders resolve, which configurations apply, and which projects cannot be included. A dry run lets the person operating the tool check the scope before committing time or compute.",
          "That separation also gives an unresolved folder a clear meaning. It is a planning problem, not a clean scan. If someone deliberately allows missing projects, the plan records what was skipped and why. The report consumer should not need to reconstruct an important decision from terminal messages.",
        ],
        sources: ["ash-plan"],
        detail: { title: "The plan is a useful boundary.", steps: ["Resolve projects", "Inspect scope and configuration", "Start the scans"], caption: "Planning and execution are separate steps, so an operator can inspect the work before it runs." },
      },
      {
        id: "local-meaning", title: "Let each project remain itself.",
        paragraphs: [
          "The central execution contract is deliberately simple: a project's findings and verdict should match the result of scanning that project on its own, unless an explicit workspace policy changes the decision. I used a separate orchestrator, configuration, and output tree for each project rather than making every scanner understand a new global workspace.",
          "This matters beyond the scan engine. A project-relative path is meaningful inside that project. When it appears in a combined report, the reader also needs to know which project owns it. Keeping the project and its path together makes the result easier for both a person and another tool to act on.",
        ],
        sources: ["ash-execution"],
      },
      {
        id: "carry-ownership", title: "Aggregation is a product decision.",
        paragraphs: [
          "A report is where the internal architecture becomes somebody else's decision. Some formats can carry a project column. Others need a separate result per project to preserve the format's meaning. Treating every output format the same would make the implementation shorter, but the result less useful.",
          "I think of a good shared view as a map with its addresses still attached. It can show the overall picture while letting someone return to the exact project, configuration, and finding. That is the kind of coordination I want a platform to provide: a common view without taking away local ownership.",
        ],
        sources: ["ash-reporting"],
      },
    ],
    takeaway: "When combining work from many teams, preserve the smallest context that lets a person make the right next decision.",
    implementationNotes: [
      "Projects have stable keys separate from their display names, so folders with the same basename remain distinct.",
      "Per-project output retains the shape of a single-project scan, allowing existing consumers to adopt workspace mode incrementally.",
      "Workspace policy is an explicit layer. It is not inferred from an editor's unrelated settings block.",
    ],
    sources: [
      { id: "ash-plan", label: "ASH: inspectable workspace planning", href: "https://github.com/awslabs/automated-security-helper/pull/460" },
      { id: "ash-execution", label: "ASH: independently scoped project execution", href: "https://github.com/awslabs/automated-security-helper/pull/462" },
      { id: "ash-reporting", label: "ASH: project-aware reporting and workspace policy", href: "https://github.com/awslabs/automated-security-helper/pull/478", note: "The review records the reporting design and the sequencing of policy integration." },
    ],
    relatedCase: { label: "The full Automated Security Helper project story", href: "/work/automated-security-helper/" },
  },
  {
    slug: "one-definition-many-agent-tools",
    title: "One definition. Many ways to use it.",
    deck: "The design behind ASH's generated integrations for fifteen AI coding platforms.",
    topic: "ai-workflows",
    tags: ["Agent integration", "Shared contracts", "Portability"],
    project: "Automated Security Helper",
    overview: "Define the capability once, adapt its packaging, and check the result where it will actually be used.",
    intro: [
      "Different teams choose different AI coding tools. That should not require a security workflow to acquire a different meaning in every environment. The instructions, capabilities, and installation details need to fit each platform, while the underlying work remains recognizably the same.",
      "I built ASH's agent-integration transpiler around a single validated definition. It generates the platform-specific packages rather than asking maintainers to keep fifteen separate copies aligned by hand. The interesting design question is what belongs in the shared definition, and what must remain a platform-specific decision.",
    ],
    diagram: {
      kind: "fan", title: "A shared capability, in the shape each tool needs.",
      steps: [
        { label: "Define", detail: "One validated model for content and capabilities." },
        { label: "Adapt", detail: "A backend applies the platform's packaging rules." },
        { label: "Use", detail: "Native plugins, skills, and configuration for fifteen platforms." },
      ],
      caption: "One definition fans out into platform-native packages. The branches represent packaging choices, not different security engines.",
    },
    sections: [
      {
        id: "shared-contract", title: "Start with the meaning, not the file format.",
        paragraphs: [
          "A common template is not automatically a common contract. One platform may want a rules file, another a plugin manifest, and another a skill directory. If the shared layer is just a large string with substitutions, platform constraints tend to leak into the content and become harder to review.",
          "The transpiler uses a structured model for the shared content and metadata, then separates the output formats from the agent backends. That gives a maintainer two useful places to look: the definition that explains what the integration does, and the adapter that explains how a particular tool receives it.",
        ], sources: ["ash-integrations"],
        detail: { title: "Two decisions, kept separate.", steps: ["What the capability means", "How this platform receives it", "Whether the generated package is valid"], caption: "Content, packaging, and validation are related, but each has its own contract." },
      },
      {
        id: "validate-output", title: "Generation needs a check on the other side.",
        paragraphs: [
          "Generating a file proves that the generator ran. It does not prove that the target tool will accept the file. I gave the backends smoke-test coverage and connected validation to the platforms' own command-line tools and schemas, with versions pinned where the checks depend on them.",
          "That makes the maintenance loop more concrete. A shared change can be checked across the output families, while a platform-specific change stays in its adapter. The intent is not to erase differences between tools. It is to make those differences explicit and testable.",
        ], sources: ["ash-integrations"],
      },
      {
        id: "portability", title: "Portability is a maintenance property.",
        paragraphs: [
          "For the person installing an integration, portability means being able to use the workflow in the environment they already have. For the person maintaining it, portability means knowing where a change belongs and how to check every affected output. Both sides matter.",
          "I prefer this pattern when the capability is shared but the surrounding ecosystems are moving independently. Keep the common meaning small and deliberate. Let the adapters own the differences. Make a generated package something that can be reviewed and validated, rather than an opaque byproduct of a build.",
        ],
      },
    ],
    takeaway: "A shared definition earns its value when it makes change easier to review across every environment it serves.",
    implementationNotes: [
      "The implementation uses a Pydantic model, a backend class per agent, and a command-line build interface.",
      "Formats and agent backends are separate concerns, so a packaging format can be reused without making platforms identical.",
      "The integration packages call ASH. Installing an integration and installing the scanner itself are separate steps.",
    ],
    sources: [
      { id: "ash-integrations", label: "ASH: the fifteen-platform integration transpiler", href: "https://github.com/awslabs/automated-security-helper/pull/331" },
      { id: "ash-agent-guide", label: "ASH: agent integration source and installation guide", href: "https://github.com/awslabs/automated-security-helper/tree/main/ash-agent-plugins" },
    ],
    relatedCase: { label: "How this fits into Automated Security Helper", href: "/work/automated-security-helper/" },
  },
  {
    slug: "reproducible-security-checks",
    title: "The tools are part of the result.",
    deck: "Why I added a pinned scanner environment to ASH, and what reproducibility can and cannot tell you.",
    topic: "security",
    tags: ["Reproducibility", "Toolchains", "Operational clarity"],
    project: "Automated Security Helper",
    overview: "A useful report should tell you about the code and about the conditions under which it was checked.",
    intro: [
      "A security check depends on more than the source being checked. It also depends on the tools that were available, the versions they ran, and the data they used. Those inputs belong in the engineering design, even when they are not the first thing a report reader sees.",
      "My Nix-mode contribution to ASH supplies a hash-pinned scanner environment. It gives adopters another way to run the toolchain without first building a container image, while keeping the scan itself in ASH's existing execution model. The goal is a more explainable run, not a blanket promise that every input has stopped changing.",
    ],
    diagram: {
      kind: "flow", title: "Known tools. An ordinary scan. An explainable result.",
      steps: [
        { label: "Pinned environment", detail: "Tool versions and executable names are defined." },
        { label: "ASH execution", detail: "The scan runs with the supplied toolchain." },
        { label: "Result and coverage", detail: "Findings and participating checks are interpreted together." },
      ],
      caption: "The pinned environment supplies tools; ASH still owns the scan. Tool availability and finding counts are different parts of the result.",
    },
    sections: [
      {
        id: "pin-tools", title: "Make the environment an explicit input.",
        paragraphs: [
          "The implementation describes the scanner environment in a Nix flake and locks its inputs by hash. Entering that environment changes the executable search path, then ASH runs its usual local scan inside it. This avoids introducing a second scan engine just to provide a different installation experience.",
          "I kept the caller's arguments intact apart from the execution-mode change. Reconstructing an invocation from parsed options can quietly omit an argument that somebody depended on. Passing the invocation through preserves the existing contract and keeps the new mode focused on what it actually owns: supplying tools.",
        ], sources: ["ash-nix"],
        detail: { title: "Keep two inputs in view.", steps: ["Scanner executable and version", "Rules and changing external data", "Coverage alongside findings"], caption: "Pinning a binary does not pin a vulnerability database that is refreshed separately." },
      },
      {
        id: "boundaries", title: "Be precise about the boundary.",
        paragraphs: [
          "A pinned toolchain is useful, but it is not a claim that every scanner has identical inputs forever. A vulnerability database can change independently. A scanner managed by ASH's own Python environment is different from an external executable supplied by the flake. The implementation and its checks distinguish those cases.",
          "That precision helps adoption. If Nix is unavailable, the mode gives an actionable refusal instead of silently choosing a different environment. An operator who asked for a specific execution model should be able to tell whether that model was used.",
        ], sources: ["ash-nix"],
      },
      {
        id: "useful-result", title: "Reproducibility makes a result easier to discuss.",
        paragraphs: [
          "When a team asks why two runs differ, an explicit environment narrows the conversation. The code, rules, external data, and execution conditions can be examined separately. That is a more useful starting point than treating every difference as an unexplained property of the scanner.",
          "I see reproducibility as a way to reduce the number of hidden decisions in a system. It is valuable because it makes change inspectable. The next person can see what was fixed in place, what remains live, and where to look when the result changes.",
        ],
      },
    ],
    takeaway: "Treat the execution environment as part of the explanation, not as an invisible prerequisite.",
    implementationNotes: [
      "The flake defines Linux and macOS outputs for x86-64 and ARM. The contribution records which platforms were locally exercised and which belong to the CI matrix.",
      "The recorded end-to-end run had nine of ten scanners participating; the ASH-managed cdk-nag environment is a separate concern.",
      "The vulnerability database used by Grype is refreshed independently and is not frozen by the flake lock.",
    ],
    sources: [{ id: "ash-nix", label: "ASH: pinned Nix scanner mode and its validation", href: "https://github.com/awslabs/automated-security-helper/pull/508" }],
    relatedCase: { label: "The Automated Security Helper project story", href: "/work/automated-security-helper/" },
  },
  {
    slug: "security-feedback-where-you-work",
    title: "Put security feedback where the work happens.",
    deck: "A look at the native packaging and editor-integration designs in ASH's public capability branch.",
    topic: "developer-tools",
    tags: ["Developer experience", "Editor feedback", "Release engineering"],
    project: "Automated Security Helper",
    overview: "Make installation fit the platform, keep one scanning contract, and bring the findings back to the editor.",
    intro: [
      "A useful engineering capability needs a useful path into somebody's day. For security tooling, that path includes installation, execution, and the place a person reads the result. Improving one part while making another unfamiliar can move the friction rather than remove it.",
      "The native packaging and VS Code work in ASH's public capability branch connects those steps. Operating-system packages provide a familiar installation shape. The editor invokes the existing ASH command and reads the reports it produces. The integration is deliberately a bridge to the scanner, not another copy of it.",
    ],
    diagram: {
      kind: "flow", title: "A familiar way in. The same work underneath.",
      steps: [
        { label: "Install", detail: "A package shape that fits the operating system." },
        { label: "Run ASH", detail: "One command and scanning contract." },
        { label: "Read findings", detail: "Structured results preserve the scan's meaning." },
        { label: "Act in the editor", detail: "The finding appears beside the work it concerns." },
      ],
      caption: "The package and editor are entry points around the same scanner: familiar ways to install, run, and act on its findings.",
    },
    sections: [
      {
        id: "installation", title: "Make the package boundary easy to check.",
        paragraphs: [
          "The native package builders define a deliberately narrow payload: the project's own wheel, with dependencies resolved separately at installation. The package checks inspect the built artifact, rather than relying only on a review of the script that produced it.",
          "The design has format-specific details, but the important idea is consistent. A package should be able to explain what it carries, how the installed environment is created, and what happens during an upgrade or removal. Homebrew uses a different source-based shape, so its contract is documented separately rather than forced into the same rule.",
        ], sources: ["ash-packaging"],
        detail: { title: "A check belongs at the boundary it describes.", steps: ["Build the package", "Inspect its actual contents", "Exercise install and scan behavior"], caption: "Source-level intent and the contents of the artifact are separate things to validate." },
      },
      {
        id: "editor", title: "Let the editor consume the scanner's result.",
        paragraphs: [
          "The VS Code integration runs ASH over the open workspace and turns its SARIF report into entries in the Problems panel. It ships no copy of ASH, scanner, or rules. That keeps the integration's job understandable: find the configured executable, run it, and interpret the result.",
          "It also keeps different outcomes distinct. A scan with no findings, an incomplete scan, a cancelled run, and an unavailable report are not interchangeable editor states. The implementation preserves that distinction while letting a person cancel work and return to it later.",
        ], sources: ["ash-vscode"],
      },
      {
        id: "trust", title: "A good experience includes clear permission.",
        paragraphs: [
          "The editor does not run a scan in an untrusted workspace. Scanning can load the project's own configuration and plugin modules, so workspace trust is part of the execution decision, not just a cosmetic editor preference.",
          "I like integrations that make the main path straightforward and the boundaries visible. A person should not have to become a packaging expert to install a tool, or a report-format expert to read a finding. But the details should still be available when they need to understand what will run and what the result means.",
        ], sources: ["ash-vscode"],
      },
    ],
    takeaway: "Developer experience is strongest when a familiar interface preserves the meaning of the system underneath it.",
    implementationNotes: [
      "The package and editor source links identify the exact v4-capabilities implementation discussed here. Distribution through registries and marketplaces is a separate release step.",
      "Native builders cover multiple Linux and Windows package formats; the documentation identifies the verification and submission boundaries for each.",
      "The VS Code extension invokes the configured ASH executable and reads SARIF plus aggregated results. ASH installation remains a separate step.",
    ],
    sources: [
      { id: "ash-packaging", label: "ASH: native package design and artifact gates", href: (ashV4Source + "/packaging/README.md") as PublicUrl },
      { id: "ash-vscode", label: "ASH: VS Code integration and execution contract", href: (ashV4Source + "/editors/vscode/README.md") as PublicUrl },
      { id: "ash-capability-branch", label: "ASH: public v4 capability source", href: "https://github.com/awslabs/automated-security-helper/tree/v4-capabilities" },
    ],
    relatedCase: { label: "The broader Automated Security Helper work", href: "/work/automated-security-helper/" },
  },
  {
    slug: "handoffs-that-carry-the-work",
    title: "A handoff should carry more than the conversation.",
    deck: "What I want the next person or agent to inherit: decisions, current state, and a clear place to continue.",
    topic: "ai-workflows",
    tags: ["Agent teams", "Decision memory", "Reviewed learning"],
    project: "BASE, CARL, PAUL, and SEED",
    overview: "Give the next session the decisions it needs, not an obligation to rediscover the whole history.",
    intro: [
      "A handoff is successful when someone can continue the work without guessing what has already been decided. That sounds ordinary, but it becomes an architectural concern when sessions are short, several agents are involved, and the work crosses tools.",
      "My work across BASE, CARL, PAUL, and SEED explores that operating model. The pieces handle shared state, decision recall, planning, and the transition from an idea into managed delivery. I think of them as a way to make continuity deliberate rather than something a long conversation happens to provide.",
    ],
    diagram: {
      kind: "flow", title: "Carry the decision, the state, and the next step.",
      steps: [
        { label: "Learn", detail: "Capture what the work revealed." },
        { label: "Review", detail: "Decide which lessons should guide later work." },
        { label: "Recall", detail: "Bring back the decisions relevant to this task." },
        { label: "Continue", detail: "Resume from a clear state and next action." },
      ],
      caption: "A reviewed learning loop. Remembering an observation and approving an operating rule are different decisions.",
    },
    sections: [
      {
        id: "decisions", title: "Separate a useful decision from a long transcript.",
        paragraphs: [
          "A transcript can explain how a team arrived somewhere, but it is not always the best interface for the next task. The next session needs to know which decisions are still in force, why they matter, and which parts of the surrounding context are relevant now.",
          "That is the role I want decision memory to play. Recall should be selective enough to help the current work and explicit enough that a person can inspect the rule being applied. Storing more text is not a substitute for deciding what should influence a future action.",
        ], sources: ["carl-decisions"],
        detail: { title: "The handoff has three different contents.", steps: ["Decisions and their reasons", "Current working state", "A bounded next action"], caption: "A useful handoff distinguishes what is settled, what is true now, and what remains to do." },
      },
      {
        id: "state", title: "Make the current state something the tools agree on.",
        paragraphs: [
          "When several tools participate, a shared state format becomes a coordination contract. In BASE, I worked on keeping TOML-backed project and satellite state consistent, preserving the surrounding document semantics, and routing related changes through the same state-management paths.",
          "Installation is part of that contract too. A framework that behaves correctly only in the original checkout is not yet portable. Plugin startup, dependency recovery, and the discovery of project state need to agree with the way the capability is packaged and installed.",
        ], sources: ["base-state", "carl-startup"],
      },
      {
        id: "learning", title: "Let improvement remain a reviewable decision.",
        paragraphs: [
          "An agent team can notice a useful pattern without being authorized to turn it into permanent policy. I prefer a loop that captures an insight, stages a proposed rule, and leaves approval visible. The learning is valuable; the authority to change the operating model is a separate part of the system.",
          "For me, organizational self-improvement means making that loop easier to inspect and repeat. The next cycle should inherit something useful, while a human can still see what changed and choose whether it belongs. That is a practical foundation for collaboration across both people and agents.",
        ], sources: ["base-memory", "carl-decisions"],
      },
    ],
    takeaway: "Continuity is a design choice: preserve enough meaning that the next session can act, and enough history that a person can review the choice.",
    implementationNotes: [
      "State consistency, decision recall, planning, and ideation are separate responsibilities across the four frameworks.",
      "CARL's plugin startup creates missing project configuration without replacing an existing configuration found in the supported search scope.",
      "The public project documentation explains the reviewed insight-to-rule flow; it does not imply autonomous permission to change an organization's policy.",
    ],
    sources: [
      { id: "base-state", label: "BASE: consistent project state and portable installs", href: "https://github.com/mh0pe/base-v1/pull/2" },
      { id: "carl-startup", label: "CARL: project configuration in plugin mode", href: "https://github.com/mh0pe/carl/pull/2" },
      { id: "base-memory", label: "BASE: session memory and reviewed learning", href: "https://github.com/mh0pe/base-v1#per-session-meta-memory-psmm--session-intelligence" },
      { id: "carl-decisions", label: "CARL: decision recall", href: "https://github.com/mh0pe/carl#decisions" },
    ],
    relatedCase: { label: "The agent systems project story", href: "/work/agent-systems/" },
  },
  {
    slug: "integrity-bound-yarn-pnp-for-bazel",
    title: "Make the build prove what it loaded.",
    deck: "Bringing a project's own Yarn Plug'n'Play state into Bazel with an explicit integrity boundary.",
    topic: "infrastructure",
    tags: ["Build systems", "Supply-chain integrity", "Reproducibility"],
    project: "rules_js and Yarn Plug'n'Play",
    overview: "Use the project's existing dependency state, verify that the pieces agree, then allow code to load.",
    intro: [
      "A build system needs to know more than which dependency names a project declared. It needs to know which files those names resolve to, whether the resolver and dependency graph agree, and whether the files available at execution match the inputs the project intended.",
      "My rules_js contribution explores that boundary for Yarn Plug'n'Play, which resolves packages without a conventional node_modules tree. After maintainer feedback, I moved from an exporter design to a zero-install importer: Bazel consumes the project's own checked-in state rather than asking Yarn to recreate it during the build.",
    ],
    diagram: {
      kind: "integrity", title: "Verify the pieces before the resolver runs.",
      steps: [
        { label: "Project resolution", detail: "The lockfile, dependency graph, and resolver agree." },
        { label: "Exact files", detail: "Caches, unpacked files, types, and executable modes are bound." },
        { label: "Integrity check", detail: "Paths and contents are verified before code loads." },
        { label: "Bazel execution", detail: "The verified resolver serves the build or test." },
      ],
      caption: "Two kinds of input meet at a single boundary: dependency meaning and file integrity. Verification happens before loading the resolver.",
    },
    sections: [
      {
        id: "respect-state", title: "Respect the state the project already owns.",
        paragraphs: [
          "The importer does not run Yarn and does not construct a node_modules directory. Its caller supplies the lockfile, PnP graph, resolver, configuration, integrity manifest, and the cache or unpacked files those records reference. That makes the adoption boundary visible: these are the project's inputs, not a second dependency installation.",
          "The resolver and lockfile tell related but different stories. One describes what a dependency request resolves to; the other records the intended package relationships. Cross-checking those relationships is important because individually valid files can still disagree with each other.",
        ], sources: ["pnp-review"],
        detail: { title: "Validity includes the relationship.", steps: ["Read the lockfile and graph", "Cross-check their bindings", "Verify the referenced files"], caption: "Checking a file in isolation is different from checking that it belongs to the dependency state being executed." },
      },
      {
        id: "files", title: "Bind more than the bytes.",
        paragraphs: [
          "The integrity manifest includes file type and executable mode as well as content hashes. Those details affect what a build can do. An executable becoming ordinary data, or a path becoming a symlink, changes the execution contract even if a filename looks familiar.",
          "The verifier also checks canonical paths and exact tree membership before the resolver is loaded. This is a point where refusing an unexpected shape is more useful than guessing what the author meant. The implementation's tests exercise changed archives, mutated configuration, traversal, symlinks, and unpacked-file membership.",
        ], sources: ["pnp-review"],
      },
      {
        id: "adoption", title: "Keep the usable boundary specific.",
        paragraphs: [
          "This is an experimental public implementation with deliberate limits. The contribution records Yarn 4 runtime execution, Yarn 3 import and verification, and a CommonJS PnP boundary. Rules that require a linked node_modules layout are a different integration shape, not something this importer silently emulates.",
          "The design lesson I take from it is broader than the particular package manager. When two systems meet, decide which one owns the state. Then make the relationship between the inputs explicit enough to verify. That is often clearer than adding another conversion layer and hoping the resulting files remain equivalent.",
        ], sources: ["pnp-implementation"],
      },
    ],
    takeaway: "Integrity is about the agreement between inputs as well as the contents of each input.",
    implementationNotes: [
      "The public implementation includes pnp_js_binary, pnp_js_test, and pnp_verify_test wrappers.",
      "The final review distinguishes direct validation from earlier Bazel runs and does not claim the full final-head Yarn 4 Bazel gate passed.",
      "ESM PnP loaders and linked node_modules layouts are outside the documented support boundary.",
    ],
    sources: [
      { id: "pnp-review", label: "rules_js: the zero-install importer design and tests", href: "https://github.com/aspect-build/rules_js/pull/2957" },
      { id: "pnp-implementation", label: "The public integrity-bound PnP implementation", href: "https://github.com/mh0pe/rules_js/tree/codex/yarn-lock-repo-cache-v2.3.7" },
    ],
  },
  {
    slug: "typed-svg-dom",
    title: "Build a browser capability in layers.",
    deck: "How seven dependency-ordered contributions brought a typed SVG document model into Lightpanda.",
    topic: "browser",
    tags: ["SVG", "Platform contracts", "Incremental delivery"],
    project: "Lightpanda",
    overview: "A capability is easier to review when each layer establishes the contract the next one needs.",
    intro: [
      "A browser's graphics support is not just about whether an element exists on a page. Programs also need to identify its type, read and change its values, work with collections, ask geometry questions, and inspect text. Those behaviors form a platform contract that other software builds on.",
      "For Lightpanda, I reworked a broad SVG prototype into seven dependency-ordered contributions. The stack moves from prototype inheritance through live values, collections, geometry, structural elements, resources, and text. All seven layers were merged. The useful story is how those layers made a substantial capability reviewable.",
    ],
    diagram: {
      kind: "layers", title: "Seven layers, assembled into one capability.",
      steps: [
        { label: "Type foundations", detail: "Prototype inheritance and SVG identity." },
        { label: "Live values", detail: "Typed scalar values stay connected to attributes." },
        { label: "Collections", detail: "Lists preserve live and transactional behavior." },
        { label: "Geometry", detail: "Paths, lengths, points, and bounds." },
        { label: "Structure", detail: "The elements that organize the document." },
        { label: "Resources", detail: "Typed reusable graphics resources." },
        { label: "Text", detail: "Text elements and deterministic fallback metrics." },
      ],
      caption: "Read from the foundation upward. The layers build the SVG document model that programs interact with, rather than painting a page on screen.",
    },
    sections: [
      {
        id: "foundation", title: "Make the foundation extensible.",
        paragraphs: [
          "The first layer derives SVG prototype chains at compile time. That foundation gives graphics and geometry elements the expected inheritance path without building another fixed-depth factory for every new interface. Identity matters because programs use inherited methods and type checks to decide how to interact with an element.",
          "Live values and collections then build on that identity. Their behavior needs to remain connected to the element rather than becoming a detached copy of its current attributes. Treating those contracts as their own layers gave review and testing a smaller, more coherent unit of work.",
        ], sources: ["svg-types", "svg-values", "svg-collections"],
        detail: { title: "A layer establishes a contract for the next.", steps: ["Element identity", "Live attribute behavior", "Higher-level geometry and text"], caption: "The later APIs rely on the meaning established below them, not just on a shared file layout." },
      },
      {
        id: "geometry", title: "Keep geometry and text precise about what they provide.",
        paragraphs: [
          "The geometry work adds path parsing, length and point queries, and analytic fill bounds. Structural and resource elements extend the document model around that behavior. Each piece can be discussed in terms of a concrete API contract rather than a broad claim that graphics support is complete.",
          "The text layer provides typed elements and isolated deterministic fallback metrics without introducing a new font-shaping dependency. That boundary is deliberate. Fallback measurements are useful within their documented role; they are not interchangeable with a complete shaping and rendering stack.",
        ], sources: ["svg-geometry", "svg-structure", "svg-resources", "svg-text"],
      },
      {
        id: "review", title: "Use the delivery shape to improve the design.",
        paragraphs: [
          "Splitting a broad change is valuable when the split follows dependency meaning. A foundation can be reviewed and merged before the behavior that depends on it. Reviewers can ask whether a layer is internally sound and whether its contract is sufficient for the next layer, instead of holding the entire capability in their heads at once.",
          "I use that approach when a system change spans several kinds of reasoning. It does not make the underlying work small. It makes the path through the work legible, and it gives a team useful checkpoints where they can refine the design without losing the overall direction.",
        ],
      },
    ],
    takeaway: "The shape of a contribution can make a complex capability easier for other people to understand, review, and extend.",
    implementationNotes: [
      "The layers are logically ordered: prototypes, scalars, collections, geometry, structure, resources, and text.",
      "The geometry and text reviews document their repository and relevant Web Platform Test checks, including the scope of the fallback text backend.",
      "Typed DOM behavior and analytic measurements are different responsibilities from painting a complete page.",
    ],
    sources: [
      { id: "svg-types", label: "Lightpanda: SVG prototype foundations", href: "https://github.com/lightpanda-io/browser/pull/3012" },
      { id: "svg-values", label: "Lightpanda: live scalar values", href: "https://github.com/lightpanda-io/browser/pull/3034" },
      { id: "svg-collections", label: "Lightpanda: live collections", href: "https://github.com/lightpanda-io/browser/pull/3030" },
      { id: "svg-geometry", label: "Lightpanda: analytic geometry and paths", href: "https://github.com/lightpanda-io/browser/pull/3033" },
      { id: "svg-structure", label: "Lightpanda: structural elements", href: "https://github.com/lightpanda-io/browser/pull/3031" },
      { id: "svg-resources", label: "Lightpanda: resource elements", href: "https://github.com/lightpanda-io/browser/pull/3029" },
      { id: "svg-text", label: "Lightpanda: text DOM and fallback metrics", href: "https://github.com/lightpanda-io/browser/pull/3032" },
    ],
    linkedinPost: {
      href: "https://www.linkedin.com/posts/madisonhsteiner_webapi-derive-svg-prototype-chains-by-mh0pe-activity-7498223977895559168-vUST",
      label: "Join the conversation about SVG foundations on LinkedIn",
    },
  },
  {
    slug: "aws-labs-mcp",
    title: "Useful agent tools need clear boundaries.",
    deck: "Documents, images, transports, and browser sessions in my AWS Labs MCP contributions.",
    topic: "ai-workflows",
    tags: ["MCP", "Document tools", "Execution boundaries"],
    project: "AWS Labs MCP",
    overview: "Expand what an agent can do while keeping the inputs, execution, and session lifecycle understandable.",
    intro: [
      "The Model Context Protocol, or MCP, gives an AI application a standard way to call software tools. The useful question is what each tool actually makes possible and which decisions it leaves with the person operating it.",
      "My AWS Labs MCP work spans richer document ingestion, document-image extraction, network transport, and isolated browser sessions. These are separate capabilities, but they share a design concern: expose useful work without hiding the limits around the input, the environment, or the lifetime of the session.",
    ],
    diagram: {
      kind: "domains", title: "Four contribution areas, with distinct responsibilities.",
      steps: [
        { label: "Documents", detail: "Configurable size limits and slide images." },
        { label: "Document assets", detail: "Inspect and extract embedded images." },
        { label: "Transport", detail: "Connect tools through local or network interfaces." },
        { label: "Browser sessions", detail: "Create, observe, and close a temporary session." },
      ],
      caption: "These are independent contribution areas, not one execution pipeline. Each exposes a different part of an agent's working environment.",
    },
    sections: [
      {
        id: "documents", title: "Keep the useful parts of a document.",
        paragraphs: [
          "A presentation or report can communicate through layout, diagrams, and images as much as through text. The document-loader contribution adds slide and page extraction as images, along with a configurable file-size limit. That gives an application another way to work with the content while keeping the input limit an operator choice.",
          "The public asset-extraction implementation goes further by separating inspection from extraction. An application can first discover embedded images and their properties, then choose which assets to write. That two-step shape makes the work easier to inspect before creating output.",
        ], sources: ["mcp-documents", "mcp-assets"],
        detail: { title: "Inspect before extracting.", steps: ["Discover document assets", "Choose the useful images", "Write bounded output"], caption: "Discovery and output creation are distinct decisions in the asset-extraction implementation." },
      },
      {
        id: "transport", title: "Let the deployment shape be explicit.",
        paragraphs: [
          "A tool running beside an application and a tool reached over a network have different operational surroundings. My transport implementation adds a selectable interface and host and port controls while retaining the existing local default. The transport is a deployment decision, not a reason to change the tool's core meaning.",
          "The contribution records exceptions and the boundary of its transport support. I prefer that specificity to a broad claim that every server behaves identically. A platform is easier to adopt when a reader can see the supported path and the parts that need a different integration.",
        ], sources: ["mcp-transport"],
      },
      {
        id: "sessions", title: "Give a session a beginning and an end.",
        paragraphs: [
          "The AgentCore Browser MCP implementation provides session discovery, creation, inspection, live-view access, profile saving, and termination. It uses the normal AWS credential chain and leaves browser infrastructure creation and deletion to infrastructure tooling rather than placing those actions in the agent workflow.",
          "That separation keeps the lifecycle understandable. The agent can work with a session; the operator still decides which browser infrastructure exists and how it is configured. For me, a good tool surface makes useful actions easy to discover and keeps the boundaries around them equally visible.",
        ], sources: ["mcp-browser"],
      },
    ],
    takeaway: "A tool becomes easier to trust when its capability and its boundary are both easy to describe.",
    implementationNotes: [
      "Slide-image extraction is integrated in AWS Labs MCP. The document-asset, transport, and browser-session reviews describe the corresponding public implementations.",
      "The transport review records server-specific exceptions; it is not evidence of uniform remote support across every server.",
      "Browser-session operations are distinct from creating or deleting the underlying browser infrastructure.",
    ],
    sources: [
      { id: "mcp-documents", label: "AWS Labs MCP: configurable document loading and slide images", href: "https://github.com/awslabs/mcp/pull/2586" },
      { id: "mcp-assets", label: "The document-asset extraction implementation", href: "https://github.com/awslabs/mcp/pull/2658" },
      { id: "mcp-transport", label: "The selectable transport implementation", href: "https://github.com/awslabs/mcp/pull/2645" },
      { id: "mcp-browser", label: "The AgentCore Browser session implementation", href: "https://github.com/awslabs/mcp/pull/2740" },
    ],
  },
  {
    slug: "cloud-runtime",
    title: "Developer feedback is part of the platform.",
    deck: "Work across AWS CDK and jsii that makes change clearer, examples checkable, and runtime contracts deliberate.",
    topic: "developer-tools",
    tags: ["Cloud development", "Executable documentation", "Runtime contracts"],
    project: "AWS CDK and jsii",
    overview: "Support the developer's next decision at several points: previewing change, iterating, reading an example, and running the system.",
    intro: [
      "A developer platform communicates through more than its APIs. A change preview tells someone what they are about to do. An example shows them how to proceed. Runtime behavior determines whether those expectations survive execution.",
      "My contributions across AWS CDK and jsii work at several of those points: showing loop-based infrastructure changes in cdk diff, supporting QuickSight development hotswap through Cloud Control, checking documented package paths, and refining runtime cleanup and lookup behavior. The common thread is useful feedback with a clear contract.",
    ],
    diagram: {
      kind: "domains", title: "Better feedback at four points in the work.",
      steps: [
        { label: "Preview", detail: "Make loop-based infrastructure changes inspectable." },
        { label: "Iterate", detail: "Use the shared hotswap path for QuickSight development." },
        { label: "Learn", detail: "Check that documented package paths are exported." },
        { label: "Execute", detail: "Keep runtime cleanup and lookup behavior deliberate." },
      ],
      caption: "Each contribution supports a different moment in the developer's work. The blocks show those responsibilities, not the order in which they must happen.",
    },
    sections: [
      {
        id: "preview", title: "Show the change in the language of the author.",
        paragraphs: [
          "CloudFormation's Fn::ForEach lets a template describe a family of resources through a loop. My diff contribution makes those loop additions, removals, collections, and property changes visible in the CDK change preview. The preview remains about the template's intent rather than pretending it has already evaluated every deploy-time value.",
          "The QuickSight hotswap contribution follows another useful pattern: use the platform's shared infrastructure when it fits. It registers the supported QuickSight resource types with the existing Cloud Control handler instead of maintaining a separate set of service-specific update paths. Hotswap remains a development workflow, not a replacement for the full deployment contract.",
        ], sources: ["cdk-diff", "cdk-hotswap"],
        detail: { title: "Feedback supports a deliberate next step.", steps: ["Describe the intended change", "Inspect the preview", "Choose the appropriate deployment path"], caption: "A preview and a development shortcut have different jobs; neither is the completed deployment itself." },
      },
      {
        id: "examples", title: "Let an example make a checkable promise.",
        paragraphs: [
          "A package path in a documentation example is part of the interface a developer encounters. In CDK, I added a build check that compares package subpaths inside fenced examples with the package's actual exports. That covers plain strings in configuration as well as the paths a reader would normally recognize as imports.",
          "The contribution's validation checked 803 example specifiers. More important than the count is the shape of the check: it can identify a new invalid example, and it treats finding no specifiers as a problem rather than a successful empty run. The documentation and the package now have an executable relationship to examine.",
        ], sources: ["cdk-examples"],
      },
      {
        id: "runtime", title: "Improve the runtime without blurring its contract.",
        paragraphs: [
          "The jsii work includes cleaning up resolved promises, caching type information, replacing repeated member searches with map lookups, and compressing the runtime bundle while preserving names used in diagnostics. These are distinct changes, each with a specific behavior to preserve.",
          "Cleanup, caching, and packaging each have a behavior to preserve. A faster lookup still has to respect inheritance; a smaller bundle still has to explain an error. Efficiency is useful when the developer can continue to understand the system.",
        ], sources: ["jsii-cleanup", "jsii-types", "jsii-members", "jsii-bundle"],
      },
    ],
    takeaway: "The feedback a platform gives its users deserves the same care as the capability it executes.",
    implementationNotes: [
      "The diff formatter preserves dynamic collections as dynamic, rather than inventing a resource count.",
      "The documentation check is scoped to fenced code examples so repository paths and type names are not mistaken for package imports.",
      "The linked runtime changes cover separate mechanisms: promise lifetime, type resolution, member lookup, and bundle packaging.",
    ],
    sources: [
      { id: "cdk-diff", label: "AWS CDK: Fn::ForEach change previews", href: "https://github.com/aws/aws-cdk-cli/pull/1063" },
      { id: "cdk-hotswap", label: "AWS CDK: QuickSight development hotswap", href: "https://github.com/aws/aws-cdk-cli/pull/1457" },
      { id: "cdk-examples", label: "AWS CDK: documented package paths checked against exports", href: "https://github.com/aws/aws-cdk/pull/38675" },
      { id: "jsii-cleanup", label: "jsii: resolved-promise cleanup", href: "https://github.com/aws/jsii/pull/5054" },
      { id: "jsii-types", label: "jsii: type-resolution cache", href: "https://github.com/aws/jsii/pull/5055" },
      { id: "jsii-members", label: "jsii: member lookup", href: "https://github.com/aws/jsii/pull/5056" },
      { id: "jsii-bundle", label: "jsii: runtime bundle refinement", href: "https://github.com/aws/jsii/pull/5057" },
    ],
  },
];

export const legacyEntryPoints = [
  { id: "automated-security-helper", href: "/work/automated-security-helper/", kind: "case" },
  { id: "cloudformation-guard", href: "/work/cloudformation-guard/", kind: "case" },
  { id: "nix-windows", href: "/work/nix-windows/", kind: "case" },
  { id: "portable-frameworks", href: "/work/agent-systems/", kind: "case" },
  { id: "rules-js-pnp", href: "/blog/integrity-bound-yarn-pnp-for-bazel/", kind: "article" },
  { id: "lightpanda-svg", href: "/blog/typed-svg-dom/", kind: "article" },
  { id: "aws-labs-mcp", href: "/blog/aws-labs-mcp/", kind: "article" },
  { id: "cloud-runtime", href: "/blog/cloud-runtime/", kind: "article" },
] as const;

export function articleBySlug(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function articlePath(article: BlogArticle) {
  return "/blog/" + article.slug + "/";
}

export function topicFor(article: BlogArticle) {
  return blogTopics.find((topic) => topic.id === article.topic)!;
}

export function relatedArticles(article: BlogArticle) {
  const others = blogArticles.filter((candidate) => candidate.slug !== article.slug);
  return [...others.filter((candidate) => candidate.topic === article.topic), ...others.filter((candidate) => candidate.topic !== article.topic)].slice(0, 2);
}
