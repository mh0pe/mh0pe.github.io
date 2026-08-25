import compactCatalog from "../../data/project-player-records.compact.json";
import { unpackContributionPlayerRecords } from "../../data/contribution-player-records-compact.mjs";
import type {
  ContributionGraphId,
  ContributionPlayerRecords,
} from "./types";

const recordCache = new Map<ContributionGraphId, ContributionPlayerRecords>();

export function getContributionPlayerRecords(
  graphId: ContributionGraphId,
): ContributionPlayerRecords {
  const cached = recordCache.get(graphId);
  if (cached) {
    return cached;
  }
  const records = unpackContributionPlayerRecords(
    compactCatalog,
    graphId,
  ) as ContributionPlayerRecords;
  recordCache.set(graphId, records);
  return records;
}
