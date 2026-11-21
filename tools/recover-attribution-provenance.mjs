import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";
import { attributionBySha } from "./public-contribution-guards.mjs";
import { readVerifiedSnapshot } from "./build-contribution-provenance.mjs";
import { replayAttribution } from "./offline-attribution-replay.mjs";
import { publishProvenanceFiles } from "./write-provenance-files.mjs";

// Optional development oracle for explicitly supplied legacy rules. Normal
// public replay uses the owned offline module and needs no sibling workspace
// or Python. The oracle is retained for synthetic compatibility verification.
const replay = String.raw`
import sys,json,importlib.util,pathlib,collections,base64,hashlib,datetime
path=pathlib.Path(sys.argv[1]);sys.path.insert(0,str(path.parent.parent))
spec=importlib.util.spec_from_file_location('provenance_rules',path)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
data=json.load(sys.stdin);occ=collections.defaultdict(list)
def regular(path,directory=False):
 if path.is_symlink() or not (path.is_dir() if directory else path.is_file()):raise ValueError('Unsafe or missing offline cache path')
def instant(value):
 parsed=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
 if parsed.tzinfo is None:raise ValueError('Author timestamp needs a timezone')
 return parsed.astimezone(datetime.timezone.utc)
reader=None;cache_summary=None;used_entries={}
if data.get('cacheDirectory'):
 root=pathlib.Path(data['cacheDirectory']);regular(root,True)
 history_bytes=base64.b64decode(data['historyManifestBytes'],validate=True)
 fork_bytes=base64.b64decode(data['forkManifestBytes'],validate=True)
 binding=m._source_generation_binding(history_bytes,fork_bytes)
 directory=root/binding;regular(directory,True)
 binding_path=directory/'binding.json';regular(binding_path)
 binding_bytes=binding_path.read_bytes()
 expected={'schemaVersion':m.SourceBoundCommitCache.SCHEMA_VERSION,'sourceBinding':binding,'historyManifestSha256':hashlib.sha256(history_bytes).hexdigest(),'historyManifestBytes':len(history_bytes),'forkManifestSha256':hashlib.sha256(fork_bytes).hexdigest(),'forkManifestBytes':len(fork_bytes)}
 if json.loads(binding_bytes)!=expected:raise ValueError('Offline cache binding does not match exact sources')
 # Do not construct the mutable cache or call its network-enabled lookup.
 reader=object.__new__(m.SourceBoundCommitCache)
 reader.source_binding=binding;reader.cache_directory=directory
 reader.sanitizer=m._load_public_payload_sanitizer();reader.public_safety=m._load_public_safety()
for source,records in [('public-history',data['history']),('public-fork',data['fork'])]:
 for record in records:
  if source=='public-fork' and not record.get('attributed_accounts'):continue
  occ[record['sha']].append((source,record))
result=[]
for commit in data['commits']:
 records=occ.get(commit['sha'],[])
 if not records:raise ValueError('Missing public source occurrence for '+commit['sha'])
 agents=set();defaults=set();references=set();eligible_repositories=set();pr_repositories=set()
 for source,record in records:
  recorded_agents=m._candidate_agents(record)
  recorded_defaults=m._default_model_accounts('history' if source=='public-history' else 'residual',record)
  agents.update(recorded_agents);defaults.update(recorded_defaults)
  repository=m._validate_repository(record.get('repository'))
  references.add((source,repository))
  if recorded_agents or recorded_defaults:
   eligible_repositories.add(repository)
   for association in record.get('associations') or []:
    url=association.get('pull_request_url') if isinstance(association,dict) else None
    if url:
     m._pr_number(url);pr_repositories.add(m._validate_repository('/'.join(m.urlparse(url).path.split('/')[1:3])))
 if reader is not None:
  for membership in data['memberships']:
   if membership.get('commit_sha')==commit['sha']:
    m._pr_number(membership.get('pull_request_url'))
    pr_repositories.add(m._validate_repository(membership.get('base_repository')))
  if not eligible_repositories:raise ValueError('No eligible source-bound request for published commit')
  repository=sorted(pr_repositories or eligible_repositories)[0];sha=m._validate_sha(commit['sha'])
  entry_path=reader._entry_path(repository,sha);regular(entry_path)
  entry_bytes=entry_path.read_bytes();payload=reader._read_entry(entry_path,repository,sha)
  if entry_path.read_bytes()!=entry_bytes:raise ValueError('Offline cache entry changed during replay')
  parents=payload.get('parents')
  if not isinstance(parents,list) or len(parents)>1:raise ValueError('Published commit is missing non-merge parent evidence')
  for parent in parents:m._validate_sha(parent.get('sha'))
  additions,deletions,zero_diff=m._commit_metrics(payload)
  if zero_diff or additions!=commit['additions'] or deletions!=commit['deletions']:raise ValueError('Published commit metrics do not match cached detail')
  authored_at=(payload.get('commit') or {}).get('author',{}).get('date')
  if not isinstance(authored_at,str) or instant(authored_at)!=instant(commit['date']):raise ValueError('Published author timestamp does not match cached detail')
  resolved=payload.get('_resolvedRepository') or m._repository_from_commit_url(payload.get('html_url'),sha)
  expected_repository=m._validate_repository(resolved) if isinstance(resolved,str) else repository
  if expected_repository!=commit['repository']:raise ValueError('Published repository does not match cached detail')
  agents.update(m._candidate_agents(payload))
  envelope=json.loads(entry_bytes)
  used_entries[(repository.casefold(),sha)]={'repository':repository.casefold(),'sha':sha,'payloadSha256':envelope['payloadSha256'],'envelopeSha256':hashlib.sha256(entry_bytes).hexdigest()}
 explicit=sorted(agent for agent in agents if m.AGENT_KIND_BY_ID.get(agent)=='model')
 platforms=sorted(agent for agent in agents if m.AGENT_KIND_BY_ID.get(agent)=='platform')
 models,_,_=m.resolve_candidate_attribution(explicit,platforms,defaults,commit['date'],source_completed_at=data['sourceCompletedAt'])
 basis='recorded-model-marker' if explicit else 'stated-awsmadi-date-rule' if models else 'platform-only' if agents else 'missing-marker'
 result.append({'sha':commit['sha'],'modelIds':models,'basis':basis,'sourceOccurrences':[{'source':source,'repository':repository} for source,repository in sorted(references)]})
if reader is not None:
 if binding_path.read_bytes()!=binding_bytes:raise ValueError('Offline cache binding changed during replay')
 entries=[used_entries[key] for key in sorted(used_entries)]
 cache_summary={'verification':'offline-source-bound','sourceBinding':binding,'bindingSha256':hashlib.sha256(binding_bytes).hexdigest(),'entries':len(entries),'entriesSha256':hashlib.sha256(m._canonical_json_bytes(entries)).hexdigest()}
print(json.dumps({'commits':result,'cacheBinding':cache_summary},separators=(',',':')))
`;

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const basisCodes = { "recorded-model-marker": "r", "stated-awsmadi-date-rule": "h", "platform-only": "t" };

export function buildBasisCompanion(modelBytes, provenance) {
  assert.equal(provenance.schemaVersion, 1);
  assert.equal(hash(modelBytes), provenance.inputBindings.attributionSha256, "Attribution bytes changed after provenance recovery.");
  const models = expandAgentAttributionData(JSON.parse(modelBytes));
  validateRecoveredRows(models, provenance.commits);
  const bySha = new Map(provenance.commits.map((row) => [row.sha, row.basis]));
  return {
    schemaVersion: 1,
    attributionSha256: hash(modelBytes),
    shaOrderSha256: hash(JSON.stringify(models.commits.map((commit) => commit.sha))),
    basis: models.commits.map((commit) => basisCodes[bySha.get(commit.sha)]).join(""),
  };
}

export function validateRecoveredRows(models, recovered) {
  assert.ok(Array.isArray(recovered));
  const expected = new Map(models.commits.map((commit) => [commit.sha, commit]));
  assert.equal(expected.size, models.commits.length, "Duplicate attribution SHA.");
  assert.equal(recovered.length, expected.size, "Recovered row count differs.");
  assert.equal(new Set(recovered.map((row) => row.sha)).size, expected.size, "Duplicate recovered SHA.");
  for (const row of recovered) {
    const commit = expected.get(row.sha);
    assert.ok(commit, "Unknown recovered SHA.");
    assert.deepEqual([...row.modelIds].sort(), [...commit.modelIds].sort(), `Model identity mismatch for ${row.sha}`);
    assert.ok(["recorded-model-marker", "stated-awsmadi-date-rule", "platform-only"].includes(row.basis), `Missing marker or default eligibility for ${row.sha}`);
    assert.equal(row.modelIds.length === 0, row.basis === "platform-only");
    assert.ok(row.sourceOccurrences.length > 0);
    assert.deepEqual(Object.keys(row).sort(), ["sha", "modelIds", "basis", "sourceOccurrences"].sort());
    for (const source of row.sourceOccurrences) {
      assert.deepEqual(Object.keys(source).sort(), ["repository", "source"]);
      assert.ok(["public-history", "public-fork"].includes(source.source));
      assert.match(source.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    }
  }
  return recovered.sort((a, b) => a.sha.localeCompare(b.sha));
}

export async function recoverAttributionProvenance({ history: historyPath, fork: forkPath, models: modelPath, generator, cacheDirectory, python = "python3" }) {
  const history = await readVerifiedSnapshot(historyPath);
  const fork = await readVerifiedSnapshot(forkPath, "fork");
  assert.equal(fork.manifest.source_export_manifest_sha256, history.binding.sha256);
  const modelBytes = await readFile(modelPath);
  const implementation = generator ?? fileURLToPath(new URL("./offline-attribution-replay.mjs", import.meta.url));
  const generatorBytes = await readFile(implementation);
  const models = expandAgentAttributionData(JSON.parse(modelBytes));
  assert.equal(models.snapshot.publicOnly, true);
  assert.deepEqual([...models.snapshot.accounts].sort(), ["awsmadi", "mh0pe"]);
  assert.equal(models.snapshot.sourceExportGeneratedAt, history.manifest.completed_at, "Model and public-history cutoffs differ.");
  attributionBySha(models);
  const historyManifestBytes = await readFile(resolve(historyPath, "manifest.json"));
  const forkManifestBytes = await readFile(resolve(forkPath, "manifest.json"));
  assert.equal(hash(historyManifestBytes), history.binding.sha256, "History manifest changed before replay.");
  assert.equal(hash(forkManifestBytes), fork.binding.sha256, "Fork manifest changed before replay.");
  const input = { commits: models.commits, history: history.contents["commits.jsonl"], fork: fork.contents["commits.jsonl"], memberships: history.contents["pull_request_commits.jsonl"] ?? [], sourceCompletedAt: history.manifest.completed_at, ...(cacheDirectory ? { cacheDirectory: resolve(cacheDirectory), historyManifestBytes: historyManifestBytes.toString("base64"), forkManifestBytes: forkManifestBytes.toString("base64") } : {}) };
  let recovered;
  try {
    if (generator) {
      const result = spawnSync(python, ["-B", "-c", replay, resolve(generator)], {input: JSON.stringify(input), encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
      assert.equal(result.status, 0);
      recovered = JSON.parse(result.stdout);
    } else recovered = await replayAttribution(input);
  } catch {
    // Never expose raw commit messages, cached data or private paths.
    throw new Error("Local provenance replay failed; no output was written.");
  }
  const commits = validateRecoveredRows(models, recovered.commits);
  return {
    schemaVersion: 1,
    inputBindings: {
      publicHistoryManifestSha256: history.binding.sha256,
      publicHistoryCommitsSha256: history.binding.files["commits.jsonl"].sha256,
      publicForkManifestSha256: fork.binding.sha256,
      publicForkCommitsSha256: fork.binding.files["commits.jsonl"].sha256,
      attributionSha256: hash(modelBytes), generatorSha256: hash(generatorBytes),
      ...(cacheDirectory ? { commitDetailCache: recovered.cacheBinding } : {}),
    },
    commits,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
  const args = process.argv.slice(2);
  assert.ok([8, 10, 12, 14].includes(args.length), "Usage: --history DIR --fork DIR --models FILE --output NEW_FILE [--basis-output NEW_FILE] [--cache-directory DIR] [--generator LEGACY_ORACLE]");
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    assert.ok(args[i].startsWith("--") && ["history", "fork", "models", "generator", "output", "basis-output", "cache-directory"].includes(key) && args[i + 1] && !options[key]);
    options[key] = resolve(args[i + 1]);
  }
  for (const key of ["history", "fork", "models", "output"]) assert.ok(options[key], `Missing --${key}`);
  const artifact = await recoverAttributionProvenance({ ...options, cacheDirectory: options["cache-directory"] });
  const companion = options["basis-output"] ? buildBasisCompanion(await readFile(options.models), artifact) : null;
  await publishProvenanceFiles([
    {path: options.output, bytes: Buffer.from(`${JSON.stringify(artifact)}\n`)},
    ...(companion ? [{path: options["basis-output"], bytes: Buffer.from(`${JSON.stringify(companion)}\n`)}] : []),
  ]);
  console.log(`Recovered provenance for ${artifact.commits.length} existing commits.`);
  } catch (error) {
    console.error(error.mayRetainFiles
      ? "Local provenance publication failed; some output or temporary files may remain."
      : "Local provenance replay failed; no output was written.");
    process.exitCode = 1;
  }
}
