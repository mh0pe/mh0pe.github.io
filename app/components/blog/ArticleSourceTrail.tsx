import { getContributionPlayerRecords } from "../contribution-story/player-record-loaders";
import type { ContributionPlayerRecords } from "../contribution-story/types";

const preferredPaths: Record<number, readonly string[]> = {
  460: ["workspace/resolver.py", "workspace/plan.py", "workspace/workspace_file.py"],
  462: ["workspace/execution.py", "workspace/aggregation.py", "tests/unit/workspace/test_project_isolation.py"],
  478: ["workspace/reporting.py", "workspace/policy.py", "workspace/execution.py"],
};
const relevantCommit: Record<number, RegExp> = {
  460: /parse and discover|validated execution plan|add --workspace/i,
  462: /scope one execution|merge per-project|attribution gate/i,
  478: /reporter|workspace policy/i,
};

export function selectSourceTrail(records: ContributionPlayerRecords, sourceHref: string) {
  if (records.id !== "ash-workspace" || !records.publicOnly) return null;
  const change = records.changes.find(item => item.kind === "pull-request" && item.href === sourceHref);
  if (!change || ![460, 462, 478].includes(change.number ?? 0)
    || change.repository !== "awslabs/automated-security-helper"
    || change.href !== `https://github.com/${change.repository}/pull/${change.number}`) return null;
  const commitPrefix = `https://github.com/${change.repository}/commit/`;
  const commits = change.commits.filter(item => item.href === commitPrefix + item.sha && /^[a-f0-9]{40}$/.test(item.sha));
  const preferredCommits = commits.filter(item => relevantCommit[change.number!].test(item.label));
  const selectedCommits = [...new Map([...preferredCommits, ...commits.filter(item => !/^(merge|docs|test|ci)\b/i.test(item.label))].map(item => [item.sha, item])).values()].slice(0, 3);
  const paths = preferredPaths[change.number!];
  const filePrefix = `https://github.com/${change.repository}/blob/${change.referenceSha}/`;
  const files = change.files.filter(item => {
    try {
      return /^[a-f0-9]{40}$/.test(change.referenceSha) && item.href.startsWith(filePrefix)
        && decodeURIComponent(item.href.slice(filePrefix.length)) === item.path
        && !/(^|\/)(docs|schemas|generated|node_modules)\//.test(item.path) && !/\.(md|json|lock)$/.test(item.path);
    } catch { return false; }
  });
  const preferredFiles = paths.flatMap(path => files.filter(item => item.path === path || item.path.endsWith("/" + path)));
  const selectedFiles = [...new Map([...preferredFiles, ...files].map(item => [item.path, item])).values()].slice(0, 3);
  if (!selectedCommits.length && !selectedFiles.length) return null;
  return { commits: selectedCommits, files: selectedFiles, allChangesHref: change.href + "/files" };
}

export function SourceTrailDetails({ trail, label }: {
  readonly trail: NonNullable<ReturnType<typeof selectSourceTrail>>;
  readonly label: string;
}) {
  return <details className="article-implementation">
    <summary>Explore this change<span className="visually-hidden">: {label}</span></summary>
    {trail.commits.length ? <><p>Selected changes</p><ul>{trail.commits.map(commit => <li key={commit.sha}>
      <a href={commit.href} target="_blank" rel="noreferrer">{commit.label}<span className="visually-hidden">, opens in a new tab</span></a>
    </li>)}</ul></> : null}
    {trail.files.length ? <><p>Inside the implementation</p><ul>{trail.files.map(file => <li key={file.path}>
      <a href={file.href} target="_blank" rel="noreferrer">{file.path.split("/").at(-1)}<span className="visually-hidden">, {file.path}, opens in a new tab</span></a>
    </li>)}</ul></> : null}
    <a href={trail.allChangesHref} target="_blank" rel="noreferrer">See all changes on GitHub<span className="visually-hidden">, opens in a new tab</span></a>
  </details>;
}

// Server-rendered links only. The canonical record is never serialized into the page.
export default function ArticleSourceTrail({ sourceHref, label }: { readonly sourceHref: string; readonly label: string }) {
  const trail = selectSourceTrail(getContributionPlayerRecords("ash-workspace"), sourceHref);
  return trail ? <SourceTrailDetails trail={trail} label={label} /> : null;
}
