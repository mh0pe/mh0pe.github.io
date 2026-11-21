export const motionStorySlugs = [
  "workspace-security", "one-definition-many-agent-tools", "reproducible-security-checks",
  "security-feedback-where-you-work", "handoffs-that-carry-the-work",
  "integrity-bound-yarn-pnp-for-bazel", "typed-svg-dom", "aws-labs-mcp", "cloud-runtime",
] as const;
export type MotionStory = typeof motionStorySlugs[number];
export type StoryMoment = "opening" | "middle" | "later" | "ending";
export const storyFrames = { opening: 70, middle: 430, ending: 820 } as const;
export const storyDuration = 901;
export const storyFps = 30;

export type StoryChapter = {
  moment: StoryMoment; section: string; sourceIds: readonly string[];
  frame: number; start: number; end: number; reverseFloor?: number;
  title: string; caption: string; description: string;
};
// Earlier poses are opt-in: they must retain this chapter's meaning, while the
// authored frame remains the arrival pose and the origin of forward pacing.
export function validatedReverseFloor(chapter: StoryChapter): number | undefined {
  const { start, reverseFloor, frame, end } = chapter;
  return [start, reverseFloor, frame, end].every(Number.isInteger)
    && start >= 0 && reverseFloor! >= start && reverseFloor! < frame && frame < end && end < storyDuration
    ? reverseFloor : undefined;
}
function beat(moment: StoryMoment, section: string, sourceIds: readonly string[], timing?: readonly [number, number, number]) {
  const [frame, start, end] = timing ?? (moment === "opening" ? [70, 0, 250] : moment === "middle" ? [430, 300, 600] : [820, 650, 900]);
  return { moment, section, sourceIds, frame, start, end };
}

export const motionStories: Record<MotionStory, {
  name: string; ink: string; paper: string; material: string; accent: string;
  chapters: readonly StoryChapter[];
}> = {
  "workspace-security": {
    name: "Projects, scope and ownership", ink: "#153e38", paper: "#edf3dc", material: "#b9e6d4", accent: "#ef9569",
    chapters: [
      { ...beat("opening", "plan-first", ["ash-plan"]), reverseFloor: 0, title: "A shared view. Distinct projects.", caption: "Application, service and infrastructure keep their own boundaries inside the wider workspace.", description: "Three project territories sit apart. One amber application finding carries its project and src/api.py address." },
      { ...beat("middle", "local-meaning", ["ash-execution"]), reverseFloor: 300, title: "Scope before action.", caption: "A selected scope does not erase the project a finding belongs to.", description: "A scope frame gathers separate project territories. The amber finding stays attached to Application and src/api.py." },
      { ...beat("ending", "carry-ownership", ["ash-reporting"]), reverseFloor: 750, title: "The address travels with the finding.", caption: "A combined report keeps findings connected to their project and project-relative path.", description: "The same amber finding arrives in the combined report with Application and src/api.py intact. Service and Infrastructure remain separate." },
    ],
  },
  "one-definition-many-agent-tools": {
    name: "One definition, fifteen integrations", ink: "#382654", paper: "#efe8f7", material: "#d8c4f1", accent: "#edc15c",
    chapters: [
      { ...beat("opening", "shared-contract", ["ash-integrations"]), reverseFloor: 0, title: "One meaning. Fifteen native forms.", caption: "A shared definition becomes fifteen platform integrations, each with its own packaging.", description: "One large diamond-shaped definition is surrounded by fifteen folded editions. Each carries the same diamond mark." },
      { ...beat("middle", "shared-contract", ["ash-agent-guide"]), reverseFloor: 360, title: "Change the wrapper, not the meaning.", caption: "Documents, folders and plugins can carry the same guidance in different forms.", description: "Three editions open into different document, folder and plugin silhouettes. Their central meaning stays visibly unchanged." },
      { ...beat("ending", "validate-output", ["ash-integrations"]), reverseFloor: 650, title: "Generation is not acceptance.", caption: "Each generated form still needs a check against the tool that receives it.", description: "The editions settle beside three different receiving apertures. Generation and validation are visibly separate steps." },
    ],
  },
  "reproducible-security-checks": {
    name: "Known tools, independent inputs", ink: "#164c61", paper: "#e9f4f1", material: "#9fdee1", accent: "#ebbb59",
    chapters: [
      { ...beat("opening", "pin-tools", ["ash-nix"]), reverseFloor: 0, title: "Give the tools a fixed reference.", caption: "A pinned environment makes the executable tools an explicit part of the scan.", description: "A stationary indexed tool plate sits beneath separate Code, Rules and External data inputs." },
      { ...beat("middle", "boundaries", ["ash-nix"]), reverseFloor: 300, title: "Different inputs. Different boundaries.", caption: "Code, rules and external data remain separate from the pinned tool environment.", description: "Code, Rules and External data move independently while the tool plate stays in the same position." },
      { ...beat("ending", "useful-result", ["ash-nix"]), reverseFloor: 650, title: "Be precise about what is fixed.", caption: "Pinning tools does not pin every changing input or guarantee identical results.", description: "The tool plate remains fixed. Three input tracks preserve their separate positions; no identical-result claim is shown." },
    ],
  },
  "security-feedback-where-you-work": {
    name: "Security feedback beside the work", ink: "#603821", paper: "#f7ecda", material: "#b4cbdc", accent: "#efba7d",
    chapters: [
      { ...beat("opening", "installation", ["ash-packaging"]), reverseFloor: 0, title: "A clear package boundary.", caption: "The installed artifact and its surrounding dependencies are different things to inspect.", description: "A solid package card shows the installed ASH wheel and its contents. A separate dashed box shows the external dependencies." },
      { ...beat("middle", "editor", ["ash-vscode"]), reverseFloor: 360, title: "Bring the finding to the work.", caption: "The same finding docks beside its source line. This is an illustration, not an editor screenshot.", description: "An amber finding moves into the margin beside a marked source line, retaining its file and line address." },
      { ...beat("ending", "outcomes", ["ash-vscode"]), reverseFloor: 650, title: "Preserve the result's meaning.", caption: "Complete, no findings, incomplete, cancelled and unavailable are alternatives, not steps toward success.", description: "Five neutral outcome cards form two rows with no arrows between them. Complete can still have findings; no findings, incomplete, cancelled and unavailable are separate outcomes." },
    ],
  },
  "handoffs-that-carry-the-work": {
    name: "Decisions that survive a handoff", ink: "#482c58", paper: "#f1e7ec", material: "#d3b5d8", accent: "#9ed1be",
    chapters: [
      { ...beat("opening", "decisions", ["carl-decisions"]), reverseFloor: 0, title: "Carry the reason, the state, the next step.", caption: "Why, Now and Next make a handoff useful beyond the conversation that produced it.", description: "A folded packet carries Why, Now and Next across a visible session boundary, with a decision and its reason attached." },
      { ...beat("middle", "state", ["base-state", "carl-startup"]), reverseFloor: 300, title: "Recall what lets the work continue.", caption: "A selected decision keeps its reason attached, without carrying the entire transcript.", description: "The packet folds to bring the current state into view. The decision and its reason remain attached." },
      { ...beat("ending", "learning", ["base-memory"]), reverseFloor: 650, title: "Learning still needs a decision.", caption: "A proposed lesson remains outside the approved guidance until a person reviews it.", description: "The packet unfolds across the session break without losing Why, Now or Next. A proposed lesson stays outside approved guidance." },
    ],
  },
  "integrity-bound-yarn-pnp-for-bazel": {
    name: "Verify inputs before loading", ink: "#3f302f", paper: "#f3e9de", material: "#c8d3cb", accent: "#ecae89",
    chapters: [
      { ...beat("opening", "respect-state", ["pnp-review"]), reverseFloor: 0, title: "Relationships meet exact inputs.", caption: "The dependency map and the files it describes approach the same verification boundary.", description: "One file specimen is attached to five numbered checks: content, type, mode, path and membership." },
      { ...beat("middle", "files", ["pnp-review"]), reverseFloor: 300, title: "Identity is more than a filename.", caption: "Content, type, mode, canonical path and membership all belong in the check.", description: "The five numbered inspection rings spread into a cutaway around the same file specimen before loading." },
      { ...beat("ending", "adoption", ["pnp-implementation"]), reverseFloor: 650, title: "Match before loading.", caption: "An illustrative matching input passes; a changed input remains outside. The article links the actual implementation and its limits.", description: "The five numbered checks align around the matching specimen. A changed specimen remains outside the verification boundary." },
    ],
  },
  "typed-svg-dom": {
    name: "Seven layers of the SVG model", ink: "#243956", paper: "#e9eff5", material: "#b5d9e8", accent: "#edbc85",
    chapters: [
      { ...beat("opening", "foundation", ["svg-types", "svg-values", "svg-collections"]), reverseFloor: 0, title: "Build beneath the picture.", caption: "Seven layers of SVG document-model work. This is an anatomy, not a rendering demonstration.", description: "Seven named strata assemble in dependency order. The foundation layers are highlighted beneath the same letterform." },
      { ...beat("middle", "geometry", ["svg-geometry", "svg-structure", "svg-resources", "svg-text"]), reverseFloor: 360, title: "A value belongs to a living model.", caption: "Geometry and text build on typed values, attributes and collections with specific limits.", description: "The strata spread apart. A value remains connected to its source attribute, while geometry and text metrics stay separate." },
      { ...beat("ending", "review", ["svg-geometry", "svg-text"]), reverseFloor: 650, title: "Keep the capabilities distinct.", caption: "Geometry and fallback text metrics are specific capabilities, not a full browser renderer.", description: "The glass strata align. A geometry outline and a distinct text-metrics strip remain beside the letterform." },
    ],
  },
  "aws-labs-mcp": {
    name: "Four independent agent capabilities", ink: "#254757", paper: "#edf2e7", material: "#b8d8ca", accent: "#eabd7d",
    chapters: [
      { ...beat("opening", "documents", ["mcp-documents"], [70, 0, 220]), reverseFloor: 0, title: "Keep the useful parts of a document.", caption: "Document content and slide images belong to the same input, with an explicit size limit.", description: "The Documents window is highlighted. Images, Connection and Session remain distinct, unconnected windows. A separate plate represents operator-managed browser infrastructure." },
      { ...beat("middle", "images", ["mcp-assets"], [320, 225, 445]), reverseFloor: 225, title: "Inspect before extracting.", caption: "Discover an image, choose it, then create bounded output. Inspection alone does not write a file.", description: "Only the Images window is highlighted. A selected image stays inside its own inspection and extraction frame." },
      { ...beat("later", "transport", ["mcp-transport"], [560, 450, 670]), reverseFloor: 450, title: "Change the entry point, not the tool.", caption: "Local and network interfaces are a deployment choice with their own supported boundaries.", description: "Only the Connection window activates. Local and network ports sit inside that window without joining the other capabilities." },
      { ...beat("ending", "sessions", ["mcp-browser"], [820, 675, 900]), reverseFloor: 675, title: "End the session, keep the foundation.", caption: "A temporary browser session can close without deleting the infrastructure beneath it.", description: "Only the Session window is highlighted. Its temporary aperture closes while the browser-infrastructure plate and other windows remain intact." },
    ],
  },
  "cloud-runtime": {
    name: "Preview, iterate, learn, execute", ink: "#273953", paper: "#e9eff3", material: "#b9cee7", accent: "#edbd7c",
    chapters: [
      { ...beat("opening", "preview", ["cdk-diff"], [70, 0, 220]), reverseFloor: 0, title: "Preview the intent, not an invented result.", caption: "A readable diff describes template changes. Unresolved values stay unresolved; a preview is not a deployment.", description: "A template specimen becomes a readable change preview. A question mark preserves an unresolved collection." },
      { ...beat("middle", "iterate", ["cdk-hotswap"], [320, 225, 445]), reverseFloor: 225, title: "Use the shared development path.", caption: "QuickSight hotswap uses the shared Cloud Control handler for supported development updates, not the full deployment contract.", description: "The Iterate window shows a QuickSight development change inside a shared handler boundary. It is not marked as a deployed result." },
      { ...beat("later", "examples", ["cdk-examples"], [560, 450, 670]), reverseFloor: 450, title: "An example makes a checkable promise.", caption: "A documented package path can be compared with the package's actual exports.", description: "The Learn window aligns an illustrative example path with an exported path. Generic package / feature labels show the comparison; the linked work contains the actual paths." },
      { ...beat("ending", "runtime", ["jsii-cleanup", "jsii-types", "jsii-members", "jsii-bundle"], [820, 675, 900]), reverseFloor: 675, title: "Simplify inside. Preserve the contract.", caption: "Cleanup, lookups and packaging can improve while the external contract and diagnostic names remain deliberate.", description: "The Execute window opens its runtime internals inside the same external contract frame." },
    ],
  },
};

export function isMotionStory(value: string): value is MotionStory {
  return motionStorySlugs.includes(value as MotionStory);
}

export function chapterForMoment(story: MotionStory, moment: StoryMoment) {
  const chapter = motionStories[story].chapters.find(entry => entry.moment === moment);
  if (!chapter) throw new Error("Missing story moment: " + story + "/" + moment);
  return chapter;
}
