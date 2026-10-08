import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const brand = read("public/portfolio-v3.css");
const architecture = read("public/living-architecture.css");
const landing = read("public/landing-story.css");

function variables(block) {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

const light = variables(brand.match(/:root\s*\{([^}]+)\}/)[1]);
const legacy = variables(read("public/portfolio-v2.css").match(/:root\s*\{([^}]+)\}/)[1]);
const dark = { ...light, ...variables(brand.match(/html\[data-theme="dark"\]\s*\{([^}]+)\}/)[1]) };
const art = variables(architecture.match(/\.contribution-scene\s*\{([^}]+)\}/)[1]);
const darkArt = { ...art, ...variables(architecture.match(/\[data-theme="dark"\] :is\(\.architecture-hero, \.contribution-scene\)\s*\{([^}]+)\}/)[1]) };

function resolve(value, tokens) {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  return reference ? resolve(tokens[reference[1]], tokens) : value;
}

function rgb(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
}

function contrast(a, b) {
  const luminance = (hex) => rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const [high, low] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (high + .05) / (low + .05);
}

function readable(foreground, background, minimum = 4.5) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= minimum, `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
}

function mix(a, b, amount) {
  const first = rgb(a), second = rgb(b);
  return `#${first.map((value, i) => Math.round(value * amount + second[i] * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}

test("page text and interactive colors are AA-readable in both palettes", () => {
  for (const tokens of [light, dark]) {
    for (const background of [tokens["--hope-porcelain"], tokens["--hope-porcelain-deep"], mix(tokens["--hope-green"], tokens["--hope-porcelain"], .09)]) {
      for (const name of ["--hope-carbon", "--hope-carbon-soft", "--hope-ink-muted", "--hope-blue", "--hope-green-dark", "--hope-copper"]) {
        readable(tokens[name], background);
      }
    }
    readable(tokens["--hope-on-accent"], tokens["--hope-green"]);
    readable(tokens["--hope-porcelain"], tokens["--hope-blue"]);
  }
});

test("architecture text is readable at every gradient endpoint, not just the page background", () => {
  for (const [tokens, illustration, endpoints] of [
    [light, art, ["#f9e4ce", "#f0f3ff", "#dce4f5"]],
    [dark, darkArt, ["#493746", "#253555", "#18243b"]],
  ]) {
    for (const color of endpoints) assert.ok(architecture.includes(color));
    const combined = { ...tokens, ...illustration };
    for (const background of [...endpoints, illustration["--architecture-paper"], illustration["--architecture-tint"]]) {
      for (const name of ["--architecture-ink", "--architecture-muted"]) readable(resolve(illustration[name], combined), background);
      readable(resolve(illustration["--architecture-focus"], combined), background, 3);
    }
  }
});

test("stack layer colors carry through to labeled project chips in both themes", () => {
  for (const tokens of [light, dark]) {
    for (const layer of ["foundations", "security", "tools", "ai"]) {
      const color = tokens[`--hope-layer-${layer}`];
      readable(color, mix(color, tokens["--hope-porcelain"], .06));
      readable(color, tokens["--hope-porcelain-deep"]);
      assert.ok(architecture.includes(`var(--hope-layer-${layer})`));
      assert.ok(landing.includes(`var(--hope-layer-${layer})`));
    }
  }
  for (const kind of ["security", "policy", "windows", "continuity"]) assert.ok(landing.includes(`[data-story-kind="${kind}"]`));
});

test("legacy dark visualizations use coordinated light-on-ink colors", () => {
  for (const background of [legacy["--night"], legacy["--night-raised"], legacy["--night-soft"]]) {
    for (const name of ["--paper", "--paper-muted", "--cyan", "--coral", "--lime", "--gold", "--violet"]) readable(legacy[name], background);
  }
});

test("theme metadata and runtime use the actual page surface colors", () => {
  const layout = read("app/layout.tsx"), runtime = read("public/theme.js");
  for (const tokens of [light, dark]) {
    assert.ok(layout.includes(`color: "${tokens["--hope-porcelain"]}"`));
    assert.ok(runtime.includes(`"${tokens["--hope-porcelain"]}"`));
  }
  assert.match(read("app/components/v2/RouteStyles.tsx"), /portfolio-v3\.css\?v=20261003-palette-contrast/);
  assert.match(layout, /theme\.js\?v=20261003-palette/);
  assert.match(read("app/page.tsx"), /living-architecture\.css\?v=20261003-palette/);
  assert.match(read("app/page.tsx"), /landing-story\.css\?v=20261007-journal-targets/);
});

test("the brand icon uses the palette without recoloring official badge artwork", () => {
  const icon = read("public/favicon.svg");
  for (const name of ["--hope-carbon", "--hope-green"]) assert.ok(icon.includes(light[name]));
  assert.doesNotMatch(landing, /(?:\.landing-credential-gallery|\.landing-employer__logo)[^{]*\{[^}]*(?:filter|mix-blend-mode):/);
});

test("transparent badge artwork has a stable light surface without enlarging its footprint", () => {
  const badge = landing.match(/\.landing-credential-gallery img\s*\{([^}]+)\}/)[1];
  assert.match(badge, /background:\s*#faf8f3/);
  assert.match(badge, /box-sizing:\s*border-box/);
  assert.match(badge, /padding:\s*\.35rem/);
  assert.match(badge, /width:\s*128px/);
  assert.match(badge, /height:\s*128px/);
  assert.match(badge, /object-fit:\s*contain/);
  readable("#000000", "#faf8f3");
});

test("project numbers use readable theme text instead of translucent legacy colors", () => {
  const rules = [...brand.matchAll(/[^{}]*\.work-index__number\s*\{([^}]+)\}/g)];
  const colors = rules.flatMap(([, rule]) => [...rule.matchAll(/(?:^|;)\s*color:\s*([^;]+);/g)].map(([, color]) => color));
  assert.deepEqual(colors, ["var(--hope-ink-muted)"]);
  for (const tokens of [light, dark]) readable(tokens["--hope-ink-muted"], tokens["--hope-porcelain"]);
});
