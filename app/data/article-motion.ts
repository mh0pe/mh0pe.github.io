export const motionStorySlugs = [
  "workspace-security", "one-definition-many-agent-tools", "reproducible-security-checks",
  "security-feedback-where-you-work", "handoffs-that-carry-the-work",
  "integrity-bound-yarn-pnp-for-bazel", "typed-svg-dom", "aws-labs-mcp", "cloud-runtime",
] as const;
export type MotionStory = typeof motionStorySlugs[number];
export type StoryMoment = "opening" | "middle" | "ending";
export const storyFrames = { opening: 70, middle: 430, ending: 820 } as const;
export const storyDuration = 901;
export const storyFps = 30;

export const motionStories: Record<MotionStory, {
  name: string; ink: string; paper: string; material: string; accent: string;
  chapters: readonly { title: string; caption: string; description: string }[];
}> = {
  "workspace-security": {
    name: "The ownership atlas", ink: "#153e38", paper: "#edf3dc", material: "#b9e6d4", accent: "#ef9569",
    chapters: [
      { title: "A shared view. Distinct projects.", caption: "Application, service and infrastructure keep their own boundaries inside the wider workspace.", description: "Three sculptural project territories sit apart on a common map. Their names and paths remain attached to their own territory." },
      { title: "Scope before action.", caption: "The plan brings the selected projects into view before a scan begins.", description: "A scope frame passes across the three territories without merging them. Project identity is preserved inside the selected frame." },
      { title: "The address travels with the finding.", caption: "A combined report keeps findings connected to their project and project-relative path.", description: "The overview draws three project-addressed report strips out of the territories, preserving separate ownership." },
    ],
  },
  "one-definition-many-agent-tools": {
    name: "The publishing prism", ink: "#382654", paper: "#efe8f7", material: "#d8c4f1", accent: "#edc15c",
    chapters: [
      { title: "One meaning. Fifteen native forms.", caption: "A shared definition becomes fifteen platform integrations, each with its own packaging.", description: "One large diamond-shaped definition is surrounded by fifteen folded editions. Each carries the same diamond mark." },
      { title: "Change the wrapper, not the meaning.", caption: "Documents, folders and plugins can carry the same guidance in different forms.", description: "Three editions open into different document, folder and plugin silhouettes. Their central meaning stays visibly unchanged." },
      { title: "Generation is not acceptance.", caption: "Each generated form still needs a check against the tool that receives it.", description: "The editions settle beside three different receiving apertures. Generation and validation are visibly separate steps." },
    ],
  },
  "reproducible-security-checks": {
    name: "The fixed reference", ink: "#164c61", paper: "#e9f4f1", material: "#9fdee1", accent: "#ebbb59",
    chapters: [
      { title: "Give the tools a fixed reference.", caption: "A pinned environment makes the executable tools an explicit part of the scan.", description: "A large indexed instrument holds a tool collar in a fixed position, beside separate layers for code, rules and vulnerability data." },
      { title: "Different inputs. Different boundaries.", caption: "Code, rules and external data remain separate from the pinned tool environment.", description: "The instrument opens to reveal three independently positioned input layers. The fixed tool collar stays at the center." },
      { title: "Be precise about what is fixed.", caption: "Pinning tools does not pin every changing input or guarantee identical results.", description: "The tool collar remains fixed while the rule and external-data layers move independently outside it." },
    ],
  },
  "security-feedback-where-you-work": {
    name: "The working margin", ink: "#603821", paper: "#f7ecda", material: "#b4cbdc", accent: "#efba7d",
    chapters: [
      { title: "Bring the finding to the work.", caption: "A scanner result becomes an annotation beside the relevant work. This is an illustration, not an editor screenshot.", description: "An amber finding moves from a report into the margin of a large typographic work surface, beside a marked line." },
      { title: "A clear package boundary.", caption: "The installed artifact and its surrounding dependencies are different things to inspect.", description: "The work surface opens into a package cutaway. The artifact is separated from the surrounding tool environment." },
      { title: "Preserve the result's meaning.", caption: "Actionable feedback keeps completed, cancelled and unavailable states distinct.", description: "The annotation settles beside the work. Separate completed, cancelled and unavailable labels remain visible below it." },
    ],
  },
  "handoffs-that-carry-the-work": {
    name: "The continuity fold", ink: "#482c58", paper: "#f1e7ec", material: "#d3b5d8", accent: "#9ed1be",
    chapters: [
      { title: "Carry the reason, the state, the next step.", caption: "Why, Now and Next make a handoff useful beyond the conversation that produced it.", description: "A large folded editorial sheet carries three strands labeled Why, Now and Next across a session boundary." },
      { title: "Recall what lets the work continue.", caption: "A selected decision keeps its reason attached, without carrying the entire transcript.", description: "The sheet folds to bring a selected decision into view. Its reason stays attached while the current-state strand remains distinct." },
      { title: "Learning still needs a decision.", caption: "A proposed lesson remains outside the approved guidance until a person reviews it.", description: "The handoff sheet unfolds on the other side of a session break. A proposed lesson sits outside the approved guidance." },
    ],
  },
  "integrity-bound-yarn-pnp-for-bazel": {
    name: "The precision interlock", ink: "#3f302f", paper: "#f3e9de", material: "#c8d3cb", accent: "#ecae89",
    chapters: [
      { title: "Relationships meet exact inputs.", caption: "The dependency map and the files it describes approach the same verification boundary.", description: "Five machined interlocking rings surround a resolver aperture, binding content, type, mode, path and membership." },
      { title: "Identity is more than a filename.", caption: "Content, type, mode, canonical path and membership all belong in the check.", description: "The five inspection rings separate into a cutaway, exposing each part of file identity before the resolver can load." },
      { title: "Match before loading.", caption: "An illustrative matching input passes; a changed input remains outside. The article links the actual implementation and its limits.", description: "The rings align around a matching specimen. A changed specimen stays beyond the closed boundary, separate from the resolver." },
    ],
  },
  "typed-svg-dom": {
    name: "Anatomy of a letterform", ink: "#243956", paper: "#e9eff5", material: "#b5d9e8", accent: "#edbc85",
    chapters: [
      { title: "Build beneath the picture.", caption: "Seven layers of SVG document-model work, from prototypes to geometry and text. This is an anatomy, not a rendering demonstration.", description: "Seven transparent engraved strata reveal the document-model anatomy beneath one monumental SVG letterform." },
      { title: "A value belongs to a living model.", caption: "Typed values, attributes and collections belong to the same document model.", description: "The strata spread apart, with a separate label rail locating live values, collections and geometry inside the wider document model." },
      { title: "Keep the capabilities distinct.", caption: "Geometry and fallback text metrics remain separate capabilities, not a claim of full browser rendering.", description: "The glass strata align. A geometry outline and a distinct text-metrics strip stay visible beside the letterform." },
    ],
  },
  "aws-labs-mcp": {
    name: "The capability rooms", ink: "#254757", paper: "#edf2e7", material: "#b8d8ca", accent: "#eabd7d",
    chapters: [
      { title: "Four capabilities. Different responsibilities.", caption: "Document loading, image extraction, transport and browser sessions solve different parts of tool use.", description: "Four separate architectural rooms labeled Documents, Images, Connection and Session sit above a persistent infrastructure foundation." },
      { title: "Choose the useful boundary.", caption: "Inspection and extraction are separate choices; a transport changes the entry point, not the meaning of the tool.", description: "Document inspection and image extraction remain distinct rooms. A connection port moves independently between two entry points." },
      { title: "End the session, keep the foundation.", caption: "A temporary browser session can close without deleting the infrastructure beneath it.", description: "The session room closes its temporary aperture while the infrastructure foundation and other capabilities remain intact." },
    ],
  },
  "cloud-runtime": {
    name: "The executable proof", ink: "#273953", paper: "#e9eff3", material: "#b9cee7", accent: "#edbd7c",
    chapters: [
      { title: "Make intent visible.", caption: "A change preview speaks in the author's terms. Values that cannot be resolved remain unresolved.", description: "Large loop typography opens into a marked preview of intent. An unresolved value stays a question mark rather than becoming an invented resource count." },
      { title: "An example makes a checkable promise.", caption: "A documented example needs to match the package path people can actually import.", description: "An example sheet and an exported package sheet align at the same path, making their relationship visible." },
      { title: "Simplify inside. Preserve the contract.", caption: "Runtime internals can improve while the external contract and diagnostic names stay intact.", description: "The interior example sheets give way to types, members and bundle mechanisms inside the same outer contract frame." },
    ],
  },
};

export function isMotionStory(value: string): value is MotionStory {
  return motionStorySlugs.includes(value as MotionStory);
}
