import type { MotionStory } from "./article-motion";

export type MobileStoryPart = {
  label: string;
  location: string;
  meaning: string;
};

export type MobileStoryGuide = {
  orientation: string;
  parts: readonly MobileStoryPart[];
  layout?: "compact";
};

type ChapterGuides = readonly MobileStoryGuide[];

const fileIdentity: readonly MobileStoryPart[] = [
  { label: "Content", location: "Ring 1", meaning: "The file's actual contents." },
  { label: "Type", location: "Ring 2", meaning: "What kind of file entry it is." },
  { label: "Mode", location: "Ring 3", meaning: "The file's permissions." },
  { label: "Path", location: "Ring 4", meaning: "Its canonical location." },
  { label: "Membership", location: "Ring 5", meaning: "Which files belong in the input." },
];

const svgLayers: readonly MobileStoryPart[] = [
  { label: "Prototypes", location: "Top marker", meaning: "Identity and inheritance." },
  { label: "Live values", location: "Second marker", meaning: "Attribute-linked values." },
  { label: "Collections", location: "Third marker", meaning: "Live lists." },
  { label: "Geometry", location: "Middle marker", meaning: "Paths, lengths, points and bounds." },
  { label: "Structure", location: "Fifth marker", meaning: "Document organization." },
  { label: "Resources", location: "Sixth marker", meaning: "Reusable graphics." },
  { label: "Text metrics", location: "Bottom marker", meaning: "Fallback measurements." },
];

// These are reading guides to the authored shapes, not a second technical diagram.
// The stage's committed chapter selects one guide without a client-side rerender.
export const articleMobileLabels: Record<MotionStory, ChapterGuides> = {
  "workspace-security": [
    {
      orientation: "Read the three raised territories from left to right. The amber finding belongs to the application and keeps its file address.",
      parts: [
        { label: "Application", location: "Left territory", meaning: "The application keeps its own identity." },
        { label: "Service", location: "Middle territory", meaning: "The service remains a separate project." },
        { label: "Infrastructure", location: "Right territory", meaning: "The supporting infrastructure has its own boundary." },
        { label: "Finding 01", location: "Amber card, lower left", meaning: "Application · src/api.py stays attached to this finding." },
      ],
    },
    {
      orientation: "The dashed frame gathers the three territories into a scan plan without joining them together.",
      parts: [
        { label: "Selected scope", location: "Dashed outer frame", meaning: "Which projects the plan includes." },
        { label: "Separate ownership", location: "Three raised territories", meaning: "Application, service and infrastructure keep their boundaries." },
        { label: "Finding 01", location: "Amber card, lower left", meaning: "The application finding keeps the same address within the selected scope." },
      ],
    },
    {
      orientation: "Follow each dashed line down to its report strip. A finding keeps the address of the project it came from.",
      parts: [
        { label: "Application · src/api.py", location: "Amber card in the left strip", meaning: "The same finding reaches the shared report with its address intact." },
        { label: "Service / path", location: "Middle strip", meaning: "Findings from the service." },
        { label: "Infrastructure / path", location: "Right strip", meaning: "Findings from the infrastructure." },
      ],
    },
  ],
  "one-definition-many-agent-tools": [
    {
      orientation: "One large diamond sits inside a ring of fifteen editions. The diamond inside each edition carries the same meaning.",
      parts: [
        { label: "Shared definition", location: "Large central diamond", meaning: "The guidance is written once." },
        { label: "Native editions", location: "Fifteen surrounding shapes", meaning: "Each tool receives its own packaging." },
      ],
    },
    {
      orientation: "Three wrappers open below the shared diamond. Their outlines differ; the diamond inside each stays the same.",
      parts: [
        { label: "Document", location: "Left, folded corner", meaning: "Guidance packaged as a document." },
        { label: "Folder", location: "Middle, tabbed edge", meaning: "Guidance packaged as a folder." },
        { label: "Plugin", location: "Right, rectangular outline", meaning: "Guidance packaged as a plugin." },
      ],
    },
    {
      orientation: "Each wrapper sits above its own dashed receiving box. Producing a file and checking it in the receiving tool are separate steps.",
      parts: [
        { label: "Generated form", location: "Document, folder and plugin", meaning: "Three packages carrying the same guidance." },
        { label: "Receiving tool", location: "Dashed box below each", meaning: "Each package needs its own acceptance check." },
      ],
    },
  ],
  "reproducible-security-checks": [
    {
      orientation: "The indexed ring is the fixed tool environment. The three bars above it are separate inputs, read from top to bottom.",
      parts: [
        { label: "Pinned tools", location: "Indexed ring", meaning: "The executable tools have a known environment." },
        { label: "Code / rules / external data", location: "Top / middle / bottom bars", meaning: "The things those tools inspect or use." },
      ],
    },
    {
      orientation: "The three input bars spread apart while the indexed ring remains fixed. Fixing the tools does not fix these inputs.",
      parts: [
        { label: "Code", location: "Top bar", meaning: "The software being checked." },
        { label: "Rules", location: "Middle bar", meaning: "The checks applied to it." },
        { label: "External data", location: "Bottom bar", meaning: "Information supplied from outside the tool environment." },
      ],
    },
    {
      orientation: "The input bars move independently around the fixed ring. A known tool environment is not a promise of identical results.",
      parts: [
        { label: "What is fixed", location: "Indexed ring", meaning: "The pinned executable tools." },
        { label: "What can change", location: "Three separate bars", meaning: "Code, rules and external data." },
      ],
    },
  ],
  "security-feedback-where-you-work": [
    {
      orientation: "The solid package card and separate dashed dependency box mark two inspection boundaries.",
      parts: [
        { label: "Installed ASH package", location: "Solid card, left", meaning: "Inspect the wheel and its unpacked contents." },
        { label: "External dependencies", location: "Dashed box, right", meaning: "The surrounding dependencies need a separate inspection." },
      ],
    },
    {
      orientation: "The finding card docks beside the highlighted line in src/api.py. Its address and line number connect the feedback to the work.",
      parts: [
        { label: "src/api.py · line 42", location: "Highlighted line, left", meaning: "The illustrative line the finding concerns." },
        { label: "Finding 01", location: "Amber card, right", meaning: "Feedback arrives beside the relevant line." },
      ],
    },
    {
      orientation: "Five separate cards are possible outcomes, not steps in a sequence. A stopped or unavailable check must not look like a clean result.",
      parts: [
        { label: "Complete", location: "Upper-left card", meaning: "The scan finished; it may still have findings." },
        { label: "No findings", location: "Upper-middle card", meaning: "No findings were reported." },
        { label: "Incomplete", location: "Upper-right card", meaning: "The scan is only partially complete." },
        { label: "Cancelled", location: "Lower-left card", meaning: "The scan was stopped." },
        { label: "Unavailable", location: "Lower-right card", meaning: "A result is not available." },
      ],
    },
  ],
  "handoffs-that-carry-the-work": [
    {
      orientation: "Three strands cross the folded sheet and the dashed session boundary. Read the strands from top to bottom.",
      parts: [
        { label: "Why", location: "Top strand", meaning: "The reason behind the work." },
        { label: "Now", location: "Middle strand", meaning: "Its current state." },
        { label: "Next", location: "Bottom strand", meaning: "What the next session should do." },
      ],
    },
    {
      orientation: "The fold brings two linked cards into view above the strands. A decision travels with its reason, not the whole conversation.",
      parts: [
        { label: "Decision", location: "Upper-left card", meaning: "The selected decision worth carrying forward." },
        { label: "Its reason", location: "Upper-right card", meaning: "Why that decision was made." },
        { label: "Current state", location: "Middle strand", meaning: "What is true now remains distinct from the decision." },
      ],
    },
    {
      orientation: "The sheet unfolds across the session break with the decision and its reason still attached. The dashed lesson box remains separate for review.",
      parts: [
        { label: "Continuity", location: "Three crossing strands", meaning: "Why, Now and Next survive the handoff." },
        { label: "Decision and reason", location: "Two linked upper cards", meaning: "The selected decision travels with its reason." },
        { label: "Proposed lesson", location: "Dashed box, lower right", meaning: "A person still needs to review it." },
      ],
    },
  ],
  "integrity-bound-yarn-pnp-for-bazel": [
    {
      orientation: "Five numbered rings surround a file specimen. Each number identifies a different property to check: a filename alone cannot establish identity.",
      parts: fileIdentity,
    },
    {
      orientation: "The numbered rings spread into a cutaway around the same file specimen, so each check can be inspected before loading.",
      parts: fileIdentity,
    },
    {
      orientation: "The rings align before loading. The matching card connects from the upper left; the changed card stays behind the thick barrier at the right.",
      parts: [
        { label: "Matching input", location: "Upper-left card and connector", meaning: "The illustration shows an input that meets all five checks." },
        { label: "Verification boundary", location: "Five aligned rings", meaning: "Content, type, mode, path and membership must match." },
        { label: "Changed input", location: "Lower-right card and barrier", meaning: "The illustration keeps the changed input outside." },
      ],
    },
  ],
  "typed-svg-dom": [
    {
      orientation: "Seven plates assemble beneath the letter A. The first three foundations are highlighted: prototypes, live values and collections.",
      parts: svgLayers,
      layout: "compact",
    },
    {
      orientation: "The plates spread apart but remain one document model. A curved connector joins the illustrated attribute to its live value.",
      parts: [
        { label: "Live values", location: "Second marker and curved connector", meaning: "Values stay attached to their attributes." },
        { label: "Collections", location: "Third marker", meaning: "Lists stay connected to the document." },
        { label: "Geometry", location: "Middle marker", meaning: "Paths, lengths, points and bounds build on those foundations." },
      ],
    },
    {
      orientation: "The seven plates align again. Two separate measurement capabilities stay visible beside the letter.",
      parts: [
        { label: "Geometry", location: "Dashed outline attached to a letter plate", meaning: "The bounds of the illustrated letter, not a claim about a full renderer." },
        { label: "Text metrics", location: "Separate lower-right strip", meaning: "Fallback text measurements, not a complete rendering system." },
      ],
    },
  ],
  "aws-labs-mcp": [
    {
      orientation: "Four independent capability windows stay in place. The upper-left document window is highlighted for this paragraph.",
      parts: [
        { label: "Documents", location: "Upper-left window", meaning: "Choose loading limits and preserve page or slide images." },
        { label: "Browser infrastructure", location: "Wide plate below the windows", meaning: "Its lifetime is separate from the temporary browser session." },
      ],
    },
    {
      orientation: "The upper-right image window is highlighted. An outlined asset is selected before a separate output appears.",
      parts: [
        { label: "Inspect assets", location: "Left side of the image window", meaning: "Identify the image content before choosing an output." },
        { label: "Selected output", location: "Dashed box, right side", meaning: "Extraction is an explicit choice, separate from inspection." },
      ],
    },
    {
      orientation: "Only the lower-left connection window is highlighted. The selector moves between a local default and a network option.",
      parts: [
        { label: "Local default", location: "Left connection pin", meaning: "Keep the existing local connection available." },
        { label: "Network option", location: "Right connection pin", meaning: "Select the interface, host and port for the supported server." },
        { label: "Tool purpose", location: "Within the same window", meaning: "A different entry point does not change what the tool does." },
      ],
    },
    {
      orientation: "The lower-right browser session closes. The wide browser-infrastructure plate stays in place; the other capability windows are not steps in that operation.",
      parts: [
        { label: "Session ends", location: "Closing browser window, lower right", meaning: "The temporary browser session closes." },
        { label: "Infrastructure remains", location: "Wide plate below the windows", meaning: "The operator-managed browser infrastructure stays in place." },
      ],
    },
  ],
  "cloud-runtime": [
    {
      orientation: "Four contribution areas stay in place. Preview, in the upper left, shows a template and a readable change preview without replacing unknowns.",
      parts: [
        { label: "Template", location: "Left sheet in Preview", meaning: "A loop is part of the intended change." },
        { label: "Change preview", location: "Right sheet in Preview", meaning: "Describe additions and changes in terms the author uses." },
        { label: "Unresolved stays unknown", location: "Question marks on both sheets", meaning: "An unknown collection is not replaced with an invented count." },
      ],
    },
    {
      orientation: "Iterate, in the upper right, connects supported QuickSight resources to a shared Cloud Control handler. This is a development hotswap path, not a deployment." ,
      parts: [
        { label: "QuickSight", location: "Left card in Iterate", meaning: "The supported resource types being updated." },
        { label: "Cloud Control", location: "Right card in Iterate", meaning: "A shared handler replaces repeated resource-specific handling." },
      ],
    },
    {
      orientation: "Learn, in the lower left, brings the example path beside the actual export. The generic package / feature labels illustrate the comparison; the linked work contains the real paths.",
      parts: [
        { label: "Example path", location: "Left sheet in Learn", meaning: "The import shown in a documented example." },
        { label: "Actual export", location: "Right sheet in Learn", meaning: "The path the package makes available." },
      ],
    },
    {
      orientation: "Execute, in the lower right, settles four internal mechanisms inside an unchanged external-contract frame.",
      parts: [
        { label: "Promises / types / members / bundle", location: "Four inner boxes in Execute", meaning: "The jsii mechanisms improved by these changes." },
        { label: "External contract", location: "Unchanged outer frame in Execute", meaning: "Behavior and diagnostic names stay intact." },
      ],
    },
  ],
  "zero-findings": [
    {
      orientation: "The two illustrative receipts show the same count. The count does not tell you which checks ran.",
      parts: [
        { label: "Scan A", location: "Left receipt", meaning: "0 findings reported." },
        { label: "Scan B", location: "Right receipt", meaning: "0 findings reported." },
      ],
    },
    {
      orientation: "Look below the zeroes for what ran. The outlined gap is also labeled in words.",
      parts: [
        { label: "3 of 3 ran", location: "Scan A", meaning: "All planned checks ran, including infrastructure." },
        { label: "2 of 3 ran", location: "Scan B", meaning: "The infrastructure check did not run." },
      ],
    },
    {
      orientation: "The dependency-data row is separate. Its age does not change which checks ran.",
      parts: [
        { label: "Within age limit", location: "Scan A", meaning: "The supported dependency data is current under the configured limit." },
        { label: "Past age limit", location: "Scan B", meaning: "The dependency check ran with stale data. The infrastructure check is still missing." },
      ],
    },
    {
      orientation: "The final row names a next step, not a release approval. Both counts are still zero.",
      parts: [
        { label: "Review within scope", location: "Scan A", meaning: "Review the findings with the stated scope in mind." },
        { label: "Follow up", location: "Scan B", meaning: "Resolve the gaps or make the narrower scope explicit." },
      ],
    },
  ],
};
