export const svgPrecisionVersion = 'continuous-coordinate-tokens-v2-9dp';
// Restrict tolerance to the fields containing trigonometric coordinates in the
// accepted scenes. Sizes, radii, opacity, viewBox and arc flags stay byte-exact.
const attributes = new Set(['transform', 'd', 'points']);
const number = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

// Test-only fingerprint, not SVG output. Keeping number tokens separate avoids
// turning a compact path such as M10-1e-14 into the different command M100.
export function canonicalSvg(markup) {
  const parts = [];
  let cursor = 0;
  for (const tag of markup.matchAll(/<[^>]+>/g)) {
    for (const attribute of tag[0].matchAll(/\s([\w:-]+)="([^"]*)"/g)) {
      const [, name, value] = attribute;
      if (!attributes.has(name) || name === 'd' && /[Aa]/.test(value)) continue;
      const grammar = name === 'transform' ? /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)|[-+\d.eE(),\s])*$/
        : name === 'd' ? /^[MmZzLlHhVvCcSsQqTtAa\d.eE+\-,\s]*$/ : /^[-+\d.eE,\s]*$/;
      if (!grammar.test(value)) throw new Error('Invalid numeric SVG attribute: ' + name);
      const offset = tag.index + attribute.index + attribute[0].indexOf('"') + 1;
      parts.push(markup.slice(cursor, offset));
      const tokens = [];
      let end = 0;
      for (const token of value.matchAll(number)) {
        const numeric = Number(token[0]);
        if (!Number.isFinite(numeric)) throw new Error('Non-finite SVG number');
        tokens.push(value.slice(end, token.index), {number: String(Number(numeric.toFixed(9)))});
        end = token.index + token[0].length;
      }
      tokens.push(value.slice(end));
      parts.push({numericAttribute: name, tokens});
      cursor = offset + value.length;
    }
  }
  parts.push(markup.slice(cursor));
  return JSON.stringify(parts);
}
