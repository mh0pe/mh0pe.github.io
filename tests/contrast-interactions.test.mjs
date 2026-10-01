import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("the visible skip link preserves its inverse foreground when hovered or focused", async () => {
  const css = await read("public/portfolio-v3.css");
  assert.match(css, /\.hope-brand \.skip-link:is\(:hover, :focus-visible\)\s*\{\s*color: var\(--hope-porcelain\);/);
  for (const [foreground, background] of [["#f3efe6", "#171c1a"], ["#111714", "#edf0e7"]]) {
    assert.ok(contrast(foreground, background) >= 4.5);
  }
});

test("fixed dark source panels retain bright link and keyboard-focus colors", async () => {
  const css = await read("public/portfolio-v3.css");
  assert.match(css, /\.hope-brand \.source-records__link:is\(:hover, :focus-visible\)\s*\{\s*color: #e3f49b;/);
  assert.match(css, /\.hope-brand \.source-records :focus-visible\s*\{\s*outline: 2px solid #f3efe6;/);
  // #303233 bounds the brightest panel color when any 13% accent is laid
  // over #091314. This is a conservative color bound, not a pixel audit.
  for (const background of ["#091314", "#303233"]) {
    assert.ok(contrast("#e3f49b", background) >= 4.5);
    assert.ok(contrast("#f3efe6", background) >= 3);
  }
});

test("the credential chamber uses a bright focus ring independent of page theme", async () => {
  const css = await read("public/credentials.css");
  assert.match(css, /\.hope-brand \.credential-overview \.hope-text-link:focus-visible\s*\{\s*outline-color: #f3efe6;/);
  assert.ok(contrast("#f3efe6", "#0b100e") >= 3);
});

test("changed contrast styles have new export cache identifiers", async () => {
  assert.match(await read("app/layout.tsx"), /portfolio-v3\.css\?v=20260930-clarity/);
  assert.match(await read("app/credentials/layout.tsx"), /credentials\.css\?v=20260930-contrast-v1/);
});
