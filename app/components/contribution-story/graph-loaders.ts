import type {
  ContributionGraph,
  ContributionGraphId,
} from "./types";
import compactCatalog from "../../data/project-graphs.compact.json";
import { unpackContributionGraph } from "../../data/contribution-graph-compact.mjs";
import { assertContributionGraphV2 } from "../../data/contribution-graph-contract.mjs";

const graphCache = new Map<ContributionGraphId, ContributionGraph>();

export function getContributionGraph(
  graphId: ContributionGraphId,
): ContributionGraph {
  const cached = graphCache.get(graphId);
  if (cached) {
    return cached;
  }
  const graph = assertContributionGraphV2(
    unpackContributionGraph(compactCatalog, graphId),
    graphId,
  ) as ContributionGraph;
  graphCache.set(graphId, graph);
  return graph;
}
