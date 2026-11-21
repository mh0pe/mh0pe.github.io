import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { joinAttributionArchive, validateArchiveManifest } from '../app/data/attribution-archive.mjs';
import { readAgentAttributionData, aggregateAttribution, attributionEvidence, attributionModels, attributionRepositories, DEFAULT_ATTRIBUTION_FILTERS } from '../app/components/attribution-model.ts';

const hash = value => createHash('sha256').update(value).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value) + '\n');

export function buildAttributionTransport(canonicalBytes, basisBytes) {
  const compact = JSON.parse(canonicalBytes), basis = JSON.parse(basisBytes);
  assert.equal(compact.schemaVersion, 3);
  assert.equal(basis.schemaVersion, 1);
  const data = readAgentAttributionData(compact);
  const canonicalSha256 = hash(canonicalBytes);
  assert.equal(basis.attributionSha256, canonicalSha256);
  const shaOrderSha256 = hash(JSON.stringify(data.commits.map(row => row.sha)));
  assert.equal(basis.shaOrderSha256, shaOrderSha256);
  assert.equal(new Set(data.commits.map(row => row.sha)).size, data.commits.length);
  assert.equal(basis.basis.length, data.commits.length);
  assert.match(basis.basis, /^[rht]+$/);
  assert.equal(data.coverage.measuredShas, data.commits.length);
  const catalog = { ...compact }; delete catalog.commits;
  const files = new Map(), archive = [];
  for (let offset = 0; offset < compact.commits.length; offset += 256) {
    const rows = compact.commits.slice(offset, offset + 256).map(row => [...row]);
    rows[0][1] = Date.parse(data.commits[offset].date) / 1000;
    const bytes = encode({ schemaVersion: 1, generation: canonicalSha256, offset, rows, basis: basis.basis.slice(offset, offset + rows.length) });
    assert.ok(bytes.length <= 32 * 1024, 'Archive chunk raw budget exceeded');
    assert.ok(gzipSync(bytes).length <= 16 * 1024, 'Archive chunk gzip budget exceeded');
    const sha256 = hash(bytes), href = `/attribution/${sha256}.json`;
    files.set(href, bytes); archive.push({ href, sha256, bytes: bytes.length, offset, count: rows.length });
  }
  assert.ok(archive.length <= 4096 && archive.reduce((sum, row) => sum + row.bytes, 0) <= 64 * 1024 * 1024);
  const evidence = attributionEvidence(data, DEFAULT_ATTRIBUTION_FILTERS);
  const basisBySha = new Map(data.commits.map((row, index) => [row.sha, basis.basis[index]]));
  const seed = {
    schemaVersion: 1, canonicalSha256, basisSha256: hash(basisBytes), basisCodesSha256: hash(basis.basis), shaOrderSha256,
    expandedSha256: hash(JSON.stringify(data)), totalRows: data.commits.length,
    catalog, archive, repositories: attributionRepositories(data), models: attributionModels(data),
    defaultView: {
      rows: aggregateAttribution(data, DEFAULT_ATTRIBUTION_FILTERS).filter(row => row.value > 0),
      evidenceCount: evidence.length,
      repositoryCount: new Set(evidence.flatMap(row => row.repositories)).size,
      commits: evidence.slice(0, 15), basis: evidence.slice(0, 15).map(row => basisBySha.get(row.sha)).join(''),
    },
  };
  const seedBytes = encode(seed);
  assert.ok(seedBytes.length <= 48 * 1024, 'Initial attribution raw budget exceeded');
  assert.ok(gzipSync(seedBytes).length <= 12 * 1024, 'Initial attribution gzip budget exceeded');
  return { seed, seedBytes, files };
}

export async function writeAttributionTransport(root = resolve('.')) {
  const result = buildAttributionTransport(await readFile(resolve(root, 'app/data/agent-attribution.json')), await readFile(resolve(root, 'app/data/agent-attribution-basis.json')));
  await mkdir(resolve(root, 'public/attribution'), { recursive: true });
  for (const [href, bytes] of result.files) await writeFile(resolve(root, 'public', '.' + href), bytes);
  await writeFile(resolve(root, 'app/data/attribution-transport.json'), result.seedBytes);
  return result;
}

export async function validateAttributionTransportFiles({ seed, archiveDirectory, attributionBytes, basisBytes }) {
  validateArchiveManifest(seed);
  assert.equal(Boolean(attributionBytes), Boolean(basisBytes), 'Both source bindings are required together');
  if (attributionBytes && basisBytes) {
    const expected = buildAttributionTransport(attributionBytes, basisBytes);
    assert.deepEqual(seed, expected.seed, 'Transport seed differs from the bound canonical default view');
  }
  const chunks = await Promise.all(seed.archive.map(chunk => readFile(resolve(archiveDirectory, `${chunk.sha256}.json`))));
  return joinAttributionArchive(seed, chunks);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await writeAttributionTransport(process.argv[2] ? resolve(process.argv[2]) : resolve('.'));
  console.log(JSON.stringify({ rows: result.seed.totalRows, chunks: result.files.size, seedRaw: result.seedBytes.length, seedGzip: gzipSync(result.seedBytes).length }));
}
