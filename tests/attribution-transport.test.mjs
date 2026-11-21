import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { buildAttributionTransport, validateAttributionTransportFiles } from '../tools/build-attribution-transport.mjs';
import { loadAttributionArchive, joinAttributionArchive, decodeAttributionChunk, parseArchiveSearch } from '../app/data/attribution-archive.mjs';
import { readAgentAttributionData, aggregateAttribution, attributionEvidence, DEFAULT_ATTRIBUTION_FILTERS, parseAttributionSearch, serializeAttributionSearch } from '../app/components/attribution-model.ts';

const canonical = await readFile(new URL('../app/data/agent-attribution.json', import.meta.url));
const basisBytes = await readFile(new URL('../app/data/agent-attribution-basis.json', import.meta.url));
const expected = readAgentAttributionData(JSON.parse(canonical));
const built = buildAttributionTransport(canonical, basisBytes);
const {seed,files} = built;
const chunks = seed.archive.map(row => files.get(row.href));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const result = await joinAttributionArchive(seed, chunks);

test('archive preserves every record, SHA order, identity, line metric and basis', () => {
  assert.deepEqual(result.data, expected);
  assert.equal(result.basisBySha.size, expected.commits.length);
  assert.equal(expected.commits.map(row => result.basisBySha.get(row.sha)).join(''),JSON.parse(basisBytes).basis);
  assert.equal(seed.totalRows,expected.coverage.measuredShas);
});

test('seed is the complete default aggregation, counts and exact top fifteen, never a partial summary', () => {
  const evidence=attributionEvidence(expected,DEFAULT_ATTRIBUTION_FILTERS);
  assert.deepEqual(seed.defaultView.rows,aggregateAttribution(expected,DEFAULT_ATTRIBUTION_FILTERS).filter(row=>row.value>0));
  assert.equal(seed.defaultView.evidenceCount,evidence.length);
  assert.equal(seed.defaultView.repositoryCount,new Set(evidence.flatMap(row=>row.repositories)).size);
  assert.deepEqual(seed.defaultView.commits,evidence.slice(0,15));
  assert.equal(seed.defaultView.basis,evidence.slice(0,15).map(row=>result.basisBySha.get(row.sha)).join(''));
});

test('seed and complete chunks have finite initial and per-request budgets', () => {
  assert.ok(built.seedBytes.length<=48*1024); assert.ok(gzipSync(built.seedBytes).length<=12*1024);
  for(const bytes of chunks){assert.ok(bytes.length<=32*1024);assert.ok(gzipSync(bytes).length<=16*1024);}
  assert.ok(seed.archive.length>1);assert.ok(seed.defaultView.commits.length<=15);
});

test('source and basis mismatches fail before output', () => {
  assert.throws(()=>buildAttributionTransport(Buffer.concat([canonical,Buffer.from(' ')]),basisBytes));
  for(const key of ['schemaVersion','attributionSha256','shaOrderSha256','basis']){const value=JSON.parse(basisBytes);value[key]='wrong';assert.throws(()=>buildAttributionTransport(canonical,Buffer.from(JSON.stringify(value))));}
});

test('every filter dimension retains exact results and URL parsing, including models absent from the default top fifteen', () => {
  const selections=[...seed.repositories.map(repository=>({repository})),...seed.models.map(model=>({agent:model.id}))];
  for(const selected of selections)for(const surface of ['all','pr','fork-only'])for(const scope of ['code','all-text'])for(const metric of ['additions','commits']){
    const filter={...DEFAULT_ATTRIBUTION_FILTERS,...selected,surface,scope,metric};
    assert.deepEqual(aggregateAttribution(result.data,filter),aggregateAttribution(expected,filter));
    assert.deepEqual(attributionEvidence(result.data,filter),attributionEvidence(expected,filter));
    const search=serializeAttributionSearch(filter);assert.deepEqual(parseArchiveSearch(search,seed),parseAttributionSearch(search,expected));
  }
});

test('missing, reordered, corrupted and truncated chunks fail closed', async () => {
  await assert.rejects(joinAttributionArchive(seed,chunks.slice(1)));
  await assert.rejects(joinAttributionArchive(seed,[...chunks].reverse()));
  const wrong=[...chunks];wrong[0]=Buffer.from(chunks[0]);wrong[0][0]^=1;
  await assert.rejects(joinAttributionArchive(seed,wrong));wrong[0]=chunks[0].subarray(1);await assert.rejects(joinAttributionArchive(seed,wrong));
});

test('generation, offset, count and basis errors remain rejected even with rehashed chunk bytes', async () => {
  for(const mutate of [value=>value.generation='f'.repeat(64),value=>value.offset=2,value=>value.rows.pop(),value=>value.basis='?',value=>value.schemaVersion=2]){
    const value=JSON.parse(chunks[0]);mutate(value);const bytes=Buffer.from(JSON.stringify(value));
    await assert.rejects(decodeAttributionChunk(seed,{...seed.archive[0],bytes:bytes.length,sha256:hash(bytes)},bytes));
  }
  const altered=clone(seed),value=JSON.parse(chunks[0]);value.basis='t'.repeat(value.rows.length);
  const bytes=Buffer.from(JSON.stringify(value));altered.archive[0]={...altered.archive[0],sha256:hash(bytes),href:`/attribution/${hash(bytes)}.json`,bytes:bytes.length};
  await assert.rejects(joinAttributionArchive(altered,[bytes,...chunks.slice(1)]),/basis binding/);
});

test('manifest rejects off-origin paths, duplicate chunks, offset gaps and oversized responses before any fetch', async () => {
  for(const mutate of [s=>s.archive[0].href='https://other.invalid/chunk.json',s=>s.archive[0].offset=1,s=>s.archive[0].bytes=32769,s=>s.totalRows++,s=>s.archive.push(s.archive[0])]){
    const value=clone(seed);mutate(value);let calls=0;
    await assert.rejects(loadAttributionArchive(value,{origin:'https://portfolio.invalid',fetcher:async()=>{calls++;throw Error('unexpected')}}));assert.equal(calls,0);
  }
});

test('loader limits concurrency, requires same-origin requests and exposes only the complete result', async () => {
  let active=0,max=0,calls=0;
  const loaded=await loadAttributionArchive(seed,{origin:'https://portfolio.invalid',fetcher:async(url,options)=>{
    calls++;active++;max=Math.max(max,active);assert.equal(new URL(url).origin,'https://portfolio.invalid');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
    await new Promise(resolve=>setTimeout(resolve,2));active--;return new Response(files.get(new URL(url).pathname));
  }});
  assert.ok(max<=3);assert.equal(calls,seed.archive.length);assert.deepEqual(loaded.data,expected);
});

test('HTTP errors, oversized bodies, interrupted streams and timeouts do not return partial data; retry succeeds', async () => {
  for(const fetcher of [async()=>new Response('',{status:503}),async()=>new Response(new Uint8Array(32769)),async()=>new Response(new Uint8Array(2)),async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))]){
    await assert.rejects(loadAttributionArchive(seed,{origin:'https://portfolio.invalid',timeoutMs:10,fetcher}));
  }
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(loadAttributionArchive(seed,{origin:'https://portfolio.invalid',signal:controller.signal,fetcher:async()=>{calls++;return new Response('')}}));assert.equal(calls,0);
  assert.deepEqual((await loadAttributionArchive(seed,{origin:'https://portfolio.invalid',fetcher:async url=>new Response(files.get(new URL(url).pathname))})).data,expected);
});

test('export validator reads actual copied files, binds the default seed to canonical bytes, and rejects damage', async () => {
  const directory=await mkdtemp(resolve(tmpdir(),'attribution-export-'));
  try {
    for(const row of seed.archive)await writeFile(resolve(directory,`${row.sha256}.json`),files.get(row.href));
    const options={seed,archiveDirectory:directory,attributionBytes:canonical,basisBytes};
    assert.deepEqual((await validateAttributionTransportFiles(options)).data,expected);
    const wrong=clone(seed);wrong.defaultView.evidenceCount--;await assert.rejects(validateAttributionTransportFiles({...options,seed:wrong}));
    await writeFile(resolve(directory,`${seed.archive[0].sha256}.json`),'{}');await assert.rejects(validateAttributionTransportFiles(options));
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('client imports only seed and loader, passes basis per record, and guards stale completion without replacing requested filters', async () => {
  const source=await readFile(new URL('../app/components/AttributionExplorer.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/import .*agent-attribution(?:-basis|-provenance)?\.json/);
  assert.match(source,/if \(!needsArchive \|\| archive\) return/);
  assert.match(source,/controller\.signal\.aborted \|\| epoch !== requestEpoch\.current/);
  assert.match(source,/const filters = archive \? requestedFilters : DEFAULT_ATTRIBUTION_FILTERS/);
  assert.match(source,/basis=\{basisFor\(commit\)\}/);
  assert.match(source,/parseArchiveSearch\(window\.location\.search, transport\)/);
  assert.match(source,/Retry selected view/);
  const completion=source.slice(source.indexOf('loadAttributionArchive(transport'),source.indexOf('}, [needsArchive'));
  assert.doesNotMatch(completion,/setFilters\(/);
});
