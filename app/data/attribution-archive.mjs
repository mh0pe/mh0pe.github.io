import { expandAgentAttributionData } from './agent-attribution-contract.mjs';

const fail = message => { throw new Error(`Attribution archive: ${message}`); };
const shaPattern = /^[a-f0-9]{64}$/;
export async function archiveHash(bytes) {
  const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(value => value.toString(16).padStart(2, '0')).join('');
}
const jsonHash = value => archiveHash(new TextEncoder().encode(JSON.stringify(value)));

export function validateArchiveManifest(seed) {
  if (seed?.schemaVersion !== 1 || seed.catalog?.schemaVersion !== 3 || seed.catalog?.snapshot?.publicOnly !== true || !Number.isSafeInteger(seed.totalRows) || seed.totalRows < 1 || !Array.isArray(seed.archive) || seed.archive.length < 1 || seed.archive.length > 4096) fail('invalid manifest');
  for (const key of ['canonicalSha256', 'basisSha256', 'basisCodesSha256', 'shaOrderSha256', 'expandedSha256']) if (!shaPattern.test(seed[key])) fail('invalid binding');
  let offset = 0, totalBytes = 0;
  const hashes = new Set();
  for (const chunk of seed.archive) {
    if (!shaPattern.test(chunk.sha256) || chunk.href !== `/attribution/${chunk.sha256}.json` || hashes.has(chunk.sha256) || chunk.offset !== offset || !Number.isSafeInteger(chunk.count) || chunk.count < 1 || chunk.count > 256 || !Number.isSafeInteger(chunk.bytes) || chunk.bytes < 1 || chunk.bytes > 32768) fail('invalid chunk descriptor');
    offset += chunk.count; totalBytes += chunk.bytes; hashes.add(chunk.sha256);
  }
  if (offset !== seed.totalRows || totalBytes > 64 * 1024 * 1024) fail('archive extent mismatch');
}

export async function decodeAttributionChunk(seed, descriptor, bytes) {
  if (bytes.byteLength !== descriptor.bytes || await archiveHash(bytes) !== descriptor.sha256) fail('chunk byte/hash mismatch');
  const chunk = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (chunk.schemaVersion !== 1 || chunk.generation !== seed.canonicalSha256 || chunk.offset !== descriptor.offset || !Array.isArray(chunk.rows) || chunk.rows.length !== descriptor.count || typeof chunk.basis !== 'string' || chunk.basis.length !== descriptor.count || !/^[rht]+$/.test(chunk.basis)) fail('chunk generation/order/count mismatch');
  return { data: expandAgentAttributionData({ ...seed.catalog, commits: chunk.rows }), basis: chunk.basis };
}

export async function joinAttributionArchive(seed, chunks) {
  validateArchiveManifest(seed);
  if (chunks.length !== seed.archive.length) fail('missing chunks');
  const decoded = await Promise.all(chunks.map((bytes, index) => decodeAttributionChunk(seed, seed.archive[index], bytes)));
  const data = { ...decoded[0].data, commits: decoded.flatMap(part => part.data.commits) };
  const basis = decoded.map(part => part.basis).join('');
  if (await archiveHash(new TextEncoder().encode(basis)) !== seed.basisCodesSha256) fail('basis binding mismatch');
  const shas = data.commits.map(row => row.sha);
  if (shas.length !== seed.totalRows || new Set(shas).size !== shas.length || await jsonHash(shas) !== seed.shaOrderSha256 || await jsonHash(data) !== seed.expandedSha256 || data.coverage.measuredShas !== shas.length) fail('complete archive integrity mismatch');
  return { data, basisBySha: new Map(shas.map((sha, index) => [sha, basis[index]])) };
}

async function boundedResponse(response, limit, signal) {
  if (!response.ok || response.redirected || !response.body) fail('response unavailable');
  const length = response.headers.get('content-length');
  if (length !== null && Number(length) > limit) fail('response exceeds bound');
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) fail('request aborted');
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); fail('response exceeds bound'); }
      chunks.push(value);
    }
    if (signal.aborted || total !== limit) fail('truncated or aborted response');
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** @param {any} seed
 * @param {{fetcher?: typeof fetch, signal?: AbortSignal, timeoutMs?: number, origin?: string}} options */
export async function loadAttributionArchive(seed, { fetcher = globalThis.fetch, signal, timeoutMs = 12000, origin = globalThis.location?.origin } = {}) {
  validateArchiveManifest(seed);
  if (!origin || !/^https?:\/\//.test(origin)) fail('same-origin context required');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) fail('request aborted');
  signal?.addEventListener('abort', abort, { once: true });
  const bytes = new Array(seed.archive.length); let next = 0;
  async function worker() {
    while (next < seed.archive.length) {
      const index = next++, descriptor = seed.archive[index];
      const timer = setTimeout(abort, timeoutMs);
      try {
        if (controller.signal.aborted) fail('request aborted');
        const response = await fetcher(new URL(descriptor.href, origin).href, { signal: controller.signal, credentials: 'omit', mode: 'same-origin', redirect: 'error' });
        bytes[index] = await boundedResponse(response, descriptor.bytes, controller.signal);
        await decodeAttributionChunk(seed, descriptor, bytes[index]);
      } finally { clearTimeout(timer); }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(3, seed.archive.length) }, worker));
    if (controller.signal.aborted) fail('request aborted');
    return await joinAttributionArchive(seed, bytes);
  } catch (error) { controller.abort(); throw error; }
  finally { signal?.removeEventListener('abort', abort); }
}

export function parseArchiveSearch(search, seed) {
  const query = new URLSearchParams(search);
  const choices = { repository: ['all', ...seed.repositories], agent: ['all', ...seed.models.map(model => model.id)], surface: ['all', 'pr', 'fork-only'], scope: ['code', 'all-text'], metric: ['additions', 'commits'] };
  return Object.fromEntries(Object.entries(choices).map(([key, values]) => [key, values.includes(query.get(key)) ? query.get(key) : values[0]]));
}
