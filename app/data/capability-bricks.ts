import { getContributionGraph } from "@/app/components/contribution-story/graph-loaders";
import type { ContributionGraphId } from "@/app/components/contribution-story/types";

export const stackLayers = [
  { id: "ai", label: "AI workflows", detail: "How agents work together" },
  { id: "connections", label: "Connections", detail: "How tools work together" },
  { id: "tools", label: "Developer tools", detail: "How teams build and check" },
  { id: "foundations", label: "Foundations", detail: "Where the software runs" },
] as const;
type Layer = (typeof stackLayers)[number]["id"];

type Change = {
  id: string;
  title: string;
  short: string;
  meaning: string;
  layers: readonly Layer[];
  destinations: readonly string[];
};

type SceneStage = { label: string; detail: string };
type CapabilityScene = { start: SceneStage; addition: SceneStage; result: SceneStage; outputCount?: number };

// Plain-language readings of the linked changes, not a dependency map.
const scenes: Record<string, CapabilityScene> = {
  "ash-transpiler": {
    start: { label: "Shared guidance", detail: "One agent definition" },
    addition: { label: "Configuration generator", detail: "Translate the definition for each tool" },
    result: { label: "15 coding tools", detail: "Tool-specific configurations" }, outputCount: 15,
  },
  "ash-workspace": {
    start: { label: "Related projects", detail: "Each with its own security context" },
    addition: { label: "Workspace checks", detail: "Coordinate the scans" },
    result: { label: "Combined findings", detail: "Keep results tied to each project" },
  },
  "ash-distributed": {
    start: { label: "Build pipeline", detail: "Where teams build and deliver" },
    addition: { label: "Cloud scan integration", detail: "Deployment and a CDK pipeline step" },
    result: { label: "Distributed checks", detail: "Run scanners and combine their results" },
  },
  "nix-builder": {
    start: { label: "Nix build request", detail: "The shared build contract" },
    addition: { label: "Windows execution", detail: "Native process handling" },
    result: { label: "A Windows builder", detail: "Run supported Nix builds on Windows" },
  },
  "nix-cross-build-ci": {
    start: { label: "Windows components", detail: "The pieces of the Nix project" },
    addition: { label: "Cross-build workflow", detail: "Build automation for the project" },
    result: { label: "Project-wide builds", detail: "Build the Windows components together" },
  },
  "nix-recursive-runtime": {
    start: { label: "A running build", detail: "Work inside the Windows builder" },
    addition: { label: "Recursive execution", detail: "Connect nested operations" },
    result: { label: "Builds within builds", detail: "Invoke further Nix operations" },
  },
  "portable-seed": {
    start: { label: "SEED workflows", detail: "Existing planning and delivery tools" },
    addition: { label: "Installation packaging", detail: "Distribution and installation checks" },
    result: { label: "Ready to install", detail: "Native plugins and package runners" },
  },
  "portable-carl-runtime": {
    start: { label: "Working context", detail: "The guidance a coding session needs" },
    addition: { label: "Context integration", detail: "Workspace-aware setup" },
    result: { label: "Context carries forward", detail: "Bring guidance into another coding tool" },
  },
  "portable-base": {
    start: { label: "Shared working state", detail: "The state of an agent workflow" },
    addition: { label: "State synchronization", detail: "Recovery and continuity" },
    result: { label: "Work can continue", detail: "Recover state while preserving the workflow" },
  },
};

function project(id: ContributionGraphId, title: string, name: string, href: string, changes: Change[]) {
  const graph = getContributionGraph(id);
  return {
    id, title, name, href,
    changes: changes.map((change) => {
      const beat = graph.beats.find((candidate) => candidate.id === change.id);
      if (!beat?.date || !beat.href) throw new Error(`Missing public change: ${change.id}`);
      const scene = scenes[change.id];
      if (!scene) throw new Error(`Missing contribution explanation: ${change.id}`);
      return { ...change, scene, date: beat.date, href: beat.href };
    }),
  };
}

// Layer membership is a curated reading of the linked changes, not a size metric.
// Dates are the latest included commit in each saved change, not release dates.
export const capabilityProjects = [
  project("automated-security-helper", "Security that travels", "Automated Security Helper", "/work/automated-security-helper/", [
    { id: "ash-transpiler", short: "Define once", title: "One definition, fifteen agent integrations", meaning: "A shared definition becomes the configuration each coding tool needs. Teams can carry the same guidance into different working environments.", layers: ["connections", "tools"], destinations: ["Shared definition", "15 coding tools"] },
    { id: "ash-workspace", short: "Check together", title: "Security checks across a workspace", meaning: "Run checks across related projects and bring the results together, while keeping each project's identity and policy context.", layers: ["connections", "tools"], destinations: ["Related projects", "One workspace report"] },
    { id: "ash-distributed", short: "Run at scale", title: "Deploy checks into cloud pipelines", meaning: "Connect cloud deployment, distributed scanning, and a CDK pipeline step so teams can run the checks where they build and deliver.", layers: ["connections", "tools", "foundations"], destinations: ["Build pipeline", "Distributed scanners", "Combined results"] },
  ]),
  project("nix-windows", "Builds that cross platforms", "Nix on Windows", "/work/nix-windows/", [
    { id: "nix-builder", short: "Run natively", title: "Run Nix builders on Windows", meaning: "Give the shared build system a Windows execution path, with process handling suited to the operating system.", layers: ["foundations"], destinations: ["Shared build contract", "Windows execution"] },
    { id: "nix-cross-build-ci", short: "Build the whole", title: "Cross-build the complete Windows project", meaning: "Extend the automated build workflow to cover the project's Windows components together.", layers: ["tools"], destinations: ["Automated build workflow", "Windows components"] },
    { id: "nix-recursive-runtime", short: "Build within builds", title: "Recursive builds on Windows", meaning: "Connect the shared builder with the Windows execution path so one build can invoke further Nix operations.", layers: ["tools", "foundations"], destinations: ["Parent build", "Nested Nix operations"] },
  ]),
  project("portable-frameworks", "Agent workflows that carry forward", "SEED, CARL & BASE", "/work/agent-systems/", [
    { id: "portable-seed", short: "Make installable", title: "Installable SEED workflows", meaning: "Package existing planning and delivery workflows for native plugin and package-runner installation, with checks that the installation works.", layers: ["connections"], destinations: ["Existing workflows", "Plugin installation"] },
    { id: "portable-carl-runtime", short: "Carry context", title: "Carry working context across coding tools", meaning: "Bring relevant working context into a new session, with workspace selection and integrations for additional coding tools.", layers: ["ai", "connections"], destinations: ["Working context", "New coding sessions"] },
    { id: "portable-base", short: "Recover state", title: "Recover shared agent working state", meaning: "Synchronize shared working state and preserve workflow semantics so agent collaboration has a recoverable point of continuity.", layers: ["ai", "connections"], destinations: ["Shared working state", "Continued agent work"] },
  ]),
] as const;

export type CapabilityProject = (typeof capabilityProjects)[number];
