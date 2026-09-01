"use client";

import { useSyncExternalStore } from "react";
import type {
  ContributionClusterId,
  ContributionGraphId,
  ContributionGraphNodeType,
} from "./types";

export type LineageFocusSource =
  | "constellation"
  | "constellation-scroll"
  | "card-player"
  | "project-article"
  | "project-simulation"
  | "node";

export interface PortfolioLineageFocus {
  readonly chapterId: ContributionClusterId;
  readonly projectId: string | null;
  readonly graphId: ContributionGraphId | null;
  readonly evidenceId: string | null;
  readonly repository: string | null;
  readonly commitId: string | null;
  readonly fileId: string | null;
  readonly nodeId: string | null;
  readonly nodeType: ContributionGraphNodeType | null;
  readonly source: LineageFocusSource;
}

const projectByEvidence: Readonly<Record<string, string>> = {
  "ash-workspace": "automated-security-helper",
  "ash-project-execution": "automated-security-helper",
  "ash-workspace-reporting": "automated-security-helper",
  "ash-mcp-confinement": "automated-security-helper",
  "ash-workspace-mcp": "automated-security-helper",
  "ash-distributed": "automated-security-helper",
  "ash-assurance-python": "automated-security-helper",
  "ash-assurance-typescript": "automated-security-helper",
  "ash-transpiler": "automated-security-helper",
  "ash-mcp-transport": "automated-security-helper",
  "ash-mcp-sessions": "automated-security-helper",
  "ash-scanner-runtime": "automated-security-helper",
  "ash-external-gate": "automated-security-helper",
  "guard-enforcement": "cloudformation-guard",
  "guard-outcomes": "cloudformation-guard",
  "guard-query-reporting": "cloudformation-guard",
  "guard-registry": "cloudformation-guard",
  "guard-registry-operands": "cloudformation-guard",
  "guard-registry-pack": "cloudformation-guard",
  "guard-registry-tests": "cloudformation-guard",
  "nix-winsock": "nix-windows",
  "nix-aterm": "nix-windows",
  "nix-test-setup": "nix-windows",
  "nix-environment": "nix-windows",
  "nix-setenv": "nix-windows",
  "nix-proxy": "nix-windows",
  "nix-builder": "nix-windows",
  "nix-cert-startup": "nix-windows",
  "nix-big-coff": "nix-windows",
  "nix-cross-build-ci": "nix-windows",
  "nix-store-deletion": "nix-windows",
  "nix-cert-config": "nix-windows",
  "nix-validation-harness": "nix-windows",
  "rules-js-pnp": "rules-js-pnp",
  "cdk-foreach": "cloud-runtime",
  "cdk-quicksight": "cloud-runtime",
  "jsii-promises": "cloud-runtime",
  "jsii-types": "cloud-runtime",
  "jsii-members": "cloud-runtime",
  "jsii-runtime": "cloud-runtime",
  "cdk-doc-exports": "cloud-runtime",
  "mcp-doc-loader": "aws-labs-mcp",
  "mcp-transport": "aws-labs-mcp",
  "mcp-assets": "aws-labs-mcp",
  "mcp-browser": "aws-labs-mcp",
  "portable-base": "portable-frameworks",
  "portable-carl-runtime": "portable-frameworks",
  "portable-carl-schema": "portable-frameworks",
  "portable-paul": "portable-frameworks",
  "portable-seed": "portable-frameworks",
  "code-index-skill": "portable-frameworks",
  "svg-prototypes": "lightpanda-svg",
  "svg-scalars": "lightpanda-svg",
  "svg-collections": "lightpanda-svg",
  "svg-geometry": "lightpanda-svg",
  "svg-structure": "lightpanda-svg",
  "svg-resources": "lightpanda-svg",
  "svg-text": "lightpanda-svg",
};

const graphByProject: Readonly<Record<string, ContributionGraphId>> = {
  "automated-security-helper": "automated-security-helper",
  "cloudformation-guard": "cloudformation-guard",
  "nix-windows": "nix-windows",
  "rules-js-pnp": "rules-js-pnp",
  "lightpanda-svg": "lightpanda-svg",
  "portable-frameworks": "portable-frameworks",
  "aws-labs-mcp": "aws-labs-mcp",
  "cloud-runtime": "cloud-runtime",
};

const initialFocus: PortfolioLineageFocus = {
  chapterId: "security",
  projectId: "automated-security-helper",
  graphId: "automated-security-helper",
  evidenceId: "ash-workspace",
  repository: "awslabs/automated-security-helper",
  commitId: null,
  fileId: null,
  nodeId: null,
  nodeType: null,
  source: "constellation-scroll",
};

let currentFocus = initialFocus;
const listeners = new Set<() => void>();

export function projectIdForEvidence(evidenceId: string | null) {
  return evidenceId ? (projectByEvidence[evidenceId] ?? null) : null;
}

export function graphIdForProject(projectId: string | null) {
  return projectId ? (graphByProject[projectId] ?? null) : null;
}

export function publishPortfolioLineageFocus(
  next: Omit<PortfolioLineageFocus, "projectId" | "graphId"> & {
    readonly projectId?: string | null;
    readonly graphId?: ContributionGraphId | null;
  },
) {
  const projectId =
    next.projectId === undefined
      ? projectIdForEvidence(next.evidenceId)
      : next.projectId;
  const graphId =
    next.graphId === undefined ? graphIdForProject(projectId) : next.graphId;
  const resolved: PortfolioLineageFocus = {
    ...next,
    projectId,
    graphId,
  };

  const semanticKeys: readonly (keyof PortfolioLineageFocus)[] = [
    "chapterId",
    "projectId",
    "graphId",
    "evidenceId",
    "repository",
    "commitId",
    "fileId",
    "nodeId",
    "nodeType",
  ];
  if (semanticKeys.every((key) => currentFocus[key] === resolved[key])) {
    return;
  }

  currentFocus = resolved;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentFocus;
}

export function subscribePortfolioLineageFocus(listener: () => void) {
  return subscribe(listener);
}

export function getPortfolioLineageFocus() {
  return getSnapshot();
}

function getServerSnapshot() {
  return initialFocus;
}

export function usePortfolioLineageFocus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
