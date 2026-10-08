// Modified geometric core of OriginKit Miura Image Fold. The original trigger,
// RAF loop, WebGL textures and viewport minima are deliberately not included.
// Source: https://www.originkit.dev/components/miura-image-fold
export function foldedSheet(progress: number, aspect = 1.8, cells = 8) {
  const gamma = 65 * Math.PI / 180;
  const theta = Math.max(0, Math.min(1, progress)) * 1.22;
  const nx = cells;
  const ny = Math.max(2, Math.round(nx / (aspect * Math.sin(gamma))));
  const b = 1 / (ny * Math.sin(gamma));
  const a = (aspect + b * Math.cos(gamma)) / nx;
  const ct = Math.cos(theta), st = Math.sin(theta);
  const k = Math.sqrt(1 + ct * ct * Math.tan(gamma) ** 2);
  const cell = {
    H: a * st * Math.sin(gamma), S: b * ct * Math.tan(gamma) / k,
    L: a * Math.sqrt(1 - st * st * Math.sin(gamma) ** 2), V: b / k,
  };
  const point = (i: number, j: number) => {
    const x = i * cell.L + (j & 1 ? cell.V : 0);
    const y = j * cell.S;
    const z = i & 1 ? cell.H : 0;
    return [230 + x * 470 + y * 125, 265 + y * 300 - z * 350 - x * 32];
  };
  return Array.from({ length: nx * ny }, (_, index) => {
    const i = index % nx, j = Math.floor(index / nx);
    return { points: [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)].map(p => p.join(",")).join(" "), shade: i % 2 };
  });
}
