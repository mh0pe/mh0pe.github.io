import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function toPosix(path) {
  return path.split(sep).join(posix.sep);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

export async function buildArtifactManifest({
  outputPath,
  rootDirectory,
  sourceRevision = "unversioned",
}) {
  const root = resolve(rootDirectory);
  const destination = resolve(outputPath);
  const relativeDestination = toPosix(relative(root, destination));
  const destinationIsInsideRoot = relativeDestination !== "" && !relativeDestination.startsWith("../") && relativeDestination !== "..";
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareUtf8(left.name, right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const exportedPath = toPosix(relative(root, path));
      invariant(!/[\u0000-\u001f\u007f]/.test(exportedPath), `Artifact path contains control characters: ${JSON.stringify(exportedPath)}`);
      const metadata = await lstat(path);
      invariant(!metadata.isSymbolicLink(), `Artifact contains a symbolic link: ${exportedPath}`);
      if (destinationIsInsideRoot && exportedPath === relativeDestination) {
        invariant(metadata.isFile(), `Manifest destination is not a regular file: ${exportedPath}`);
        invariant(metadata.nlink === 1, `Manifest destination is hard-linked: ${exportedPath}`);
        continue;
      }
      if (metadata.isDirectory()) {
        await visit(path);
      } else {
        invariant(metadata.isFile(), `Artifact contains a non-regular entry: ${exportedPath}`);
        invariant(metadata.nlink === 1, `Artifact contains a hard-linked file: ${exportedPath}`);
        const bytes = await readFile(path);
        files.push({ bytes: bytes.byteLength, path: exportedPath, sha256: sha256(bytes) });
      }
    }
  }

  await visit(root);
  files.sort((left, right) => compareUtf8(left.path, right.path));
  const treeInput = files.map((file) => `${file.sha256} ${file.bytes} ${file.path}\n`).join("");
  const manifest = {
    schemaVersion: 1,
    algorithm: "sha256",
    sourceRevision,
    root: "pages-dist",
    selfExcludedPath: destinationIsInsideRoot ? relativeDestination : null,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    treeSha256: sha256(treeInput),
    files,
  };
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

async function main() {
  const rootDirectory = process.argv[2] ?? "pages-dist";
  const outputPath = process.argv[3] ?? `${rootDirectory}/release-manifest.json`;
  const manifest = await buildArtifactManifest({
    outputPath,
    rootDirectory,
    sourceRevision: process.env.RELEASE_REVISION ?? "unversioned",
  });
  console.log(JSON.stringify({
    fileCount: manifest.fileCount,
    output: outputPath,
    sourceRevision: manifest.sourceRevision,
    treeSha256: manifest.treeSha256,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
