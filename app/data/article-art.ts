import type { CSSProperties } from "react";

export type ArtFamily = "reports" | "editions" | "registration" | "annotations" | "folio" | "verification" | "cutaway" | "apertures" | "revisions";
export type ArtMoment = "cover" | "focus" | "resolve";

export interface ArticleArtDirection {
  readonly family: ArtFamily;
  readonly name: string;
  readonly palette: readonly [string, string, string, string];
  readonly cover: { readonly title: string; readonly description: string; readonly caption: string };
  readonly beats: readonly {
    readonly section: string;
    readonly moment: Exclude<ArtMoment, "cover">;
    readonly title: string;
    readonly description: string;
    readonly caption: string;
  }[];
}

export const articleArt: Readonly<Record<string, ArticleArtDirection>> = {
  "workspace-security": {
    family: "reports", name: "The shared edition", palette: ["#153e38", "#b9e6d4", "#ef9569", "#edf3dc"],
    cover: { title: "Many projects. One view.", description: "Three differently colored project sheets gather into a report. Each keeps its own identifying strip.", caption: "A shared view, with each project's identity still attached. The three projects are illustrative." },
    beats: [
      { section: "plan-first", moment: "focus", title: "Know what is in the frame.", description: "An outlined scope frames three named projects before their scan results are collected.", caption: "The plan makes scope visible before scanning begins." },
      { section: "local-meaning", moment: "resolve", title: "The address travels with the finding.", description: "Three distinct project strips remain visible inside one combined report.", caption: "Project identity and project-relative paths remain useful in the combined view." },
    ],
  },
  "one-definition-many-agent-tools": {
    family: "editions", name: "One master, many editions", palette: ["#382654", "#d8c4f1", "#edc15c", "#efe8f7"],
    cover: { title: "One meaning. Many forms.", description: "One master sheet unfolds into fifteen small editions with different silhouettes and the same central mark.", caption: "Fifteen platform integrations, generated from one shared definition. The shapes represent packaging differences." },
    beats: [
      { section: "shared-contract", moment: "focus", title: "Keep the meaning. Change the wrapper.", description: "The same central mark sits inside a document, a folder, and a plugin-shaped frame.", caption: "Content and platform packaging are separate design decisions." },
      { section: "validate-output", moment: "resolve", title: "An edition still needs a proof.", description: "Three generated forms meet matching validation frames and receive check marks.", caption: "Check generated output against the tool that will receive it." },
    ],
  },
  "reproducible-security-checks": {
    family: "registration", name: "Calibration notes", palette: ["#164c61", "#9fdee1", "#ebbb59", "#e9f4f1"],
    cover: { title: "The conditions belong in the picture.", description: "A calibration dial aligns with a tool plate, while a separate rules strip remains visible beside it.", caption: "Pinned tools make one part of the scan explicit. Rules and external data can still change independently." },
    beats: [
      { section: "pin-tools", moment: "focus", title: "Give the tools a fixed reference.", description: "Registration marks settle around three tool tiles within a defined environment.", caption: "The environment supplies known tools to ASH's existing scan path." },
      { section: "boundaries", moment: "resolve", title: "Fixed tools. Separate moving inputs.", description: "A stationary tool plate sits next to an independently moving rules strip.", caption: "Pinning an executable does not pin a separately refreshed vulnerability database." },
    ],
  },
  "security-feedback-where-you-work": {
    family: "annotations", name: "Notes in the margin", palette: ["#603821", "#b4cbdc", "#efba7d", "#f7ecda"],
    cover: { title: "Beside the work, not away from it.", description: "An amber annotation sits beside a line in an illustrated editor window, connected to the scanner result below.", caption: "The editor turns the scanner's result into feedback beside the work. This is an illustration, not a product screenshot." },
    beats: [
      { section: "installation", moment: "focus", title: "Inspect what actually ships.", description: "A package opens to show its defined contents, separate from the environment around it.", caption: "Package checks examine the artifact a person will install." },
      { section: "editor", moment: "resolve", title: "A result becomes a next step.", description: "A finding moves from a report into a marked line in the editor.", caption: "The integration reads the report and preserves the scan's meaning." },
    ],
  },
  "handoffs-that-carry-the-work": {
    family: "folio", name: "The continuation folio", palette: ["#482c58", "#d3b5d8", "#9ed1be", "#f1e7ec"],
    cover: { title: "Carry what lets the work continue.", description: "Three overlapping pages labeled Why, Now, and Next form a concise handoff folio.", caption: "Decisions, current state, and a bounded next action. A handoff is more than a transcript." },
    beats: [
      { section: "decisions", moment: "focus", title: "Keep the reason within reach.", description: "A selected decision is lifted from a long transcript into a short, clearly marked page.", caption: "Recall should bring the relevant decision into the next task." },
      { section: "learning", moment: "resolve", title: "An observation is not yet a rule.", description: "An observation page and an operating-rule page are separated by a review seal.", caption: "A person can review the proposal before it becomes operating guidance." },
    ],
  },
  "integrity-bound-yarn-pnp-for-bazel": {
    family: "verification", name: "The integrity proof", palette: ["#3b3558", "#f0a79b", "#b8c9f0", "#f4e9e5"],
    cover: { title: "Verify before you execute.", description: "Two sets of file tiles align at a marked verification gate before a run symbol on the other side.", caption: "The project's dependency state and exact files meet at a verification boundary before the resolver loads." },
    beats: [
      { section: "respect-state", moment: "focus", title: "Agreement matters between the pieces.", description: "Lockfile and graph panels share registration marks showing the relationship being checked.", caption: "Checking a file is different from checking that it belongs to the dependency state being executed." },
      { section: "files", moment: "resolve", title: "Bytes are only one part of identity.", description: "Three labeled seals identify bytes, file type, and executable mode around a single file.", caption: "The integrity boundary binds contents, type, mode, paths, and membership." },
    ],
  },
  "typed-svg-dom": {
    family: "cutaway", name: "Anatomy of an SVG capability", palette: ["#234775", "#a9cbe9", "#eaa38d", "#e9eef6"],
    cover: { title: "A capability has an anatomy.", description: "Seven colored transparent plates assemble around an SVG letterform, making its supporting layers visible.", caption: "Seven merged layers of the SVG document model. The letterform is an editorial metaphor, not a claim about rendering or font shaping." },
    beats: [
      { section: "foundation", moment: "focus", title: "Identity supports live behavior.", description: "An element silhouette is paired with a live value dial and a collection of matching elements.", caption: "Typed identity, live values, and live collections establish contracts for later APIs." },
      { section: "geometry", moment: "resolve", title: "Name the capability precisely.", description: "A curve's control points and measured bounds sit beside a text-metrics specimen.", caption: "Geometry queries and fallback text metrics have specific boundaries. They are not a complete rendering stack." },
    ],
  },
  "aws-labs-mcp": {
    family: "apertures", name: "Tools with a frame", palette: ["#263947", "#c8e0dd", "#e9b267", "#e9f0eb"],
    cover: { title: "More capability. Clearer boundaries.", description: "Four independent windows contain a document, an image, a connection, and a browser session.", caption: "Four distinct contribution areas, not one pipeline: documents, assets, transport, and browser sessions." },
    beats: [
      { section: "documents", moment: "focus", title: "Discover. Choose. Extract.", description: "An image is selected from a document before appearing inside a bounded output frame.", caption: "Inspecting available assets and writing selected output remain separate decisions." },
      { section: "sessions", moment: "resolve", title: "Give temporary work a clear frame.", description: "An illustrated browser window has visible beginning and ending brackets around its working session.", caption: "Session discovery, creation, inspection, and termination make the lifecycle understandable." },
    ],
  },
  "cloud-runtime": {
    family: "revisions", name: "The developer's proof", palette: ["#223f78", "#b7ccf5", "#e7ad65", "#eaf0f8"],
    cover: { title: "Make the next decision clearer.", description: "An edited page brings an intended change, its preview, and its execution contract into alignment.", caption: "Clearer previews, checkable examples, and deliberate runtime behavior support different moments in the work." },
    beats: [
      { section: "preview", moment: "focus", title: "Show the intent before the action.", description: "A repeated infrastructure definition appears beside its clearly marked change preview.", caption: "A change preview explains template intent without pretending to have evaluated every deployment-time value." },
      { section: "runtime", moment: "resolve", title: "Refine the inside. Preserve the contract.", description: "A compact runtime core sits within an unchanged, labeled external frame.", caption: "Cleanup, caching, and packaging changes still have behavior to preserve." },
    ],
  },
};

export function artFor(slug: string): ArticleArtDirection {
  const direction = articleArt[slug];
  if (!direction) throw new Error("Missing article art direction: " + slug);
  return direction;
}

export function artStyle(direction: ArticleArtDirection): CSSProperties {
  return {
    "--art-ink": direction.palette[0], "--art-light": direction.palette[1],
    "--art-pop": direction.palette[2], "--art-paper": direction.palette[3],
  } as CSSProperties;
}
