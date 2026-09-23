import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "public/credentials");

const sources = [
  ["4b68c719-c0c0-4875-91c5-8a29f2d14a63", "https://images.credly.com/images/de7e10b8-25a9-420b-834c-1e9cffd3b2fa/image.png"],
  ["5389ac76-260b-4211-b2b7-db0413df9601", "https://images.credly.com/images/0dc62494-dc94-469a-83af-e35309f27356/blob"],
  ["6dd54e5f-a6e9-4124-bd91-765f436d3e7d", "https://images.credly.com/images/cd038261-9d1c-4792-bc62-3a3b5bda175c/blob"],
  ["9ee1ca60-d39b-4f1d-9b11-c27978e6838b", "https://images.credly.com/images/cc8adc83-1dc6-4d57-8e20-22171247e052/blob"],
  ["319b79d7-c02c-4e66-8a19-e03e220373fc", "https://images.credly.com/images/69364be2-a1b5-407d-8bd9-9b357cf6103c/AWS_Industry_Financial_Services_Intermediate__L200_.png"],
  ["52ade23d-54c8-48bb-b90a-e132a877f7ba", "https://images.credly.com/images/49afe6bf-3df4-42fc-8b30-0819d0f28cec/AWS_Industry_Financial_Services_Foundational__L100_.png"],
  ["c054bfdf-abdb-4b0b-bbbd-dc8c99ca0be7", "https://images.credly.com/images/53acdae5-d69f-4dda-b650-d02ed7a50dd7/image.png"],
  ["8c186c65-bfa7-438f-983c-0aca58e76c31", "https://images.credly.com/images/4d08274f-64c1-495e-986b-3143f51b1371/image.png"],
  ["b3b85296-0e88-4075-a52c-8966a93c4ba5", "https://images.credly.com/images/2d84e428-9078-49b6-a804-13c15383d0de/image.png"],
  ["652eaaae-55d6-436b-8b73-763610552b1d", "https://images.credly.com/images/bd31ef42-d460-493e-8503-39592aaf0458/image.png"],
  ["0973ba63-6a34-42e5-9d03-cbfaa58500a9", "https://images.credly.com/images/f0d3fbb9-bfa7-4017-9989-7bde8eaf42b1/image.png"],
  ["6df21921-6917-431f-8370-b92ddd9326c2", "https://images.credly.com/images/0e284c3f-5164-4b21-8660-0d84737941bc/image.png"],
  ["91ce646f-8404-4575-8019-16e2f79cc199", "https://images.credly.com/images/00634f82-b07f-4bbd-a6bb-53de397fc3a6/image.png"],
  ["d72b6645-6f1f-43ec-8f6f-959dd7b9d84f", "https://images.credly.com/images/4d4693bb-530e-4bca-9327-de07f3aa2348/image.png"],
  ["ae819b31-11bd-4ba8-9c62-4d011a71c797", "https://images.credly.com/images/94af532a-9586-4cc5-b313-6341d3e5fb89/blob"],
  ["127cf404-78cf-4664-bddf-7cad875a3f5d", "https://images.credly.com/images/0c20a5b7-b4e9-4c2f-8b68-342e00a85e05/blob"],
  ["767ee9a6-3e53-413f-9292-5014e322652e", "https://images.credly.com/images/71fe0b13-e036-493b-b723-3e57a1face71/blob"],
  ["8511690c-6022-49a4-be65-b47711d403a1", "https://images.credly.com/images/b870667f-00a3-48d7-b988-9c02b441b883/image.png"],
  ["e91c5a7f-8836-452f-a667-640f595836ce", "https://images.credly.com/images/b9feab85-1a43-4f6c-99a5-631b88d5461b/image.png"],
  ["28ba2a54-aad6-4583-af9b-ac69ab1b4712", "https://images.credly.com/images/834f2c8d-2d2c-4ce7-9580-02a351c31626/image.png"],
  ["bfe454ae-08b2-4885-93cd-ae649c712bff", "https://images.credly.com/images/4897ff5f-0a15-4ac4-874e-8cb5443e7f28/blob"],
  ["8cf695a0-c42b-4e92-ab3d-984ce96dd29a", "https://images.credly.com/images/97c269f6-c8d0-40bd-8cbc-5c7834dbbc91/blob"],
  ["1ab58e76-a7e9-4eb0-b783-5665cc584db0", "https://images.credly.com/images/778bde6c-ad1c-4312-ac33-2fa40d50a147/image.png"],
  ["712672a0-79b0-456a-b105-e278cb59ec41", "https://images.credly.com/images/e5c85d7f-4e50-431e-b5af-fa9d9b0596e7/image.png"],
  ["8c24554d-15a9-4d02-a37f-36abe980e424", "https://images.credly.com/images/1a634b4e-3d6b-4a74-b118-c0dcb429e8d2/image.png"],
];

await mkdir(outputDirectory, { recursive: true });

for (const [id, url] of sources) {
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    throw new Error(`Invalid Credly record ID: ${id}`);
  }

  const response = await fetch(url, {
    headers: { accept: "image/avif,image/webp,image/png,image/*" },
  });
  if (!response.ok) {
    throw new Error(`Credly image ${id} returned ${response.status}.`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  await sharp(source)
    .resize(320, 320, {
      fit: "contain",
      withoutEnlargement: true,
    })
    .webp({ quality: 90, smartSubsample: true })
    .toFile(resolve(outputDirectory, `${id}.webp`));
}

console.log(`Refreshed ${sources.length} public credential badges.`);
