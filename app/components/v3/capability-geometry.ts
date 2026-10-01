import { stackLayers, type CapabilityProject } from "@/app/data/capability-bricks";

type Point = [number, number];
type Cell = { x: number; y: number; z: number; owner: string };
type Surface = { owner: string; kind: "top" | "front" | "side"; plane: number; squares: Point[] };
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
const tiltX = Math.PI / 10, tiltY = Math.PI / 4;

// Plate Stack's camera angles, with site-specific connected polycube geometry.
function project([x, y, z]: number[]) {
  const rx = x * Math.cos(tiltY) + z * Math.sin(tiltY);
  const rz = -x * Math.sin(tiltY) + z * Math.cos(tiltY);
  return `${(rx + 150).toFixed(2)},${(y * Math.cos(tiltX) - rz * Math.sin(tiltX) + 49).toFixed(2)}`;
}

// Cancel shared edges before tracing contours. This removes the cube grid
// inside each solid, including its stepped and concave faces.
function contour(squares: Point[], world: (u: number, v: number) => number[]) {
  const edges = new Map<string, [Point, Point]>();
  for (const [u, v] of squares) {
    const points: Point[] = [[u, v], [u + 1, v], [u + 1, v + 1], [u, v + 1]];
    points.forEach((a, i) => {
      const b = points[(i + 1) % 4];
      if (!edges.delete(`${b}>${a}`)) edges.set(`${a}>${b}`, [a, b]);
    });
  }
  const paths: string[] = [];
  while (edges.size) {
    const [firstKey, [start, end]] = edges.entries().next().value!;
    edges.delete(firstKey);
    let current = end;
    let d = `M${project(world(...start))}L${project(world(...end))}`;
    while (`${current}` !== `${start}`) {
      const next = [...edges.entries()].find(([, [a]]) => `${a}` === `${current}`);
      if (!next) throw new Error("Unclosed capability surface");
      edges.delete(next[0]);
      current = next[1][1];
      d += `L${project(world(...current))}`;
    }
    paths.push(`${d}Z`);
  }
  return paths.join("");
}

export function capabilityGeometry(projectData: CapabilityProject) {
  const cells: Cell[] = [];
  const owners = new Map<string, string>();
  for (let y = 0; y < 8; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 3; x++) {
    const floor = Math.floor(y / 2);
    const candidate = z === 1 ? x : (y % 2 === 0 ? [0, 0, 2] : [0, 1, 1])[x];
    const owner = projectData.changes[candidate].layers.some((layer) => layer === stackLayers[floor].id)
      ? `${candidate}` : `context-${floor}`;
    cells.push({ x, y, z, owner });
    owners.set(key(x, y, z), owner);
  }
  for (let index = 0; index < 3; index++) {
    const solid = cells.filter((cell) => cell.owner === `${index}`);
    const visited = new Set<string>();
    const queue = [solid[0]];
    while (queue.length) {
      const cell = queue.pop();
      if (!cell || visited.has(key(cell.x, cell.y, cell.z))) continue;
      visited.add(key(cell.x, cell.y, cell.z));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const next = solid.find((c) => c.x === cell.x + dx && c.y === cell.y + dy && c.z === cell.z + dz);
        if (next) queue.push(next);
      }
    }
    if (!solid.length || visited.size !== solid.length) throw new Error(`Split capability shape: ${projectData.id}/${index}`);
  }
  const surfaces = new Map<string, Surface>();
  for (const cell of cells) {
    const { x, y, z, owner } = cell;
    const add = (kind: Surface["kind"], plane: number, u: number, v: number, neighbor: string) => {
      if (owners.get(neighbor) === owner) return;
      const id = `${owner}/${kind}/${plane}`;
      const surface = surfaces.get(id) ?? { owner, kind, plane, squares: [] };
      surface.squares.push([u, v]);
      surfaces.set(id, surface);
    };
    add("front", z, x, y, key(x, y, z - 1));
    add("side", x + 1, z, y, key(x + 1, y, z));
    add("top", y, x, z, key(x, y - 1, z));
  }
  const parts = [...new Set(cells.map((cell) => cell.owner))].map((owner) => {
    const solid = cells.filter((cell) => cell.owner === owner);
    const bottom = Math.max(...solid.map((cell) => cell.y));
    return { owner, bottom, x: owner === "0" ? -28 : owner === "2" ? 28 : 12, y: -32 - (7 - bottom) * 4 };
  }).sort((a, b) => b.bottom - a.bottom || a.owner.localeCompare(b.owner));
  const faces = [...surfaces.entries()].map(([id, surface]) => {
    const { owner, kind, plane, squares } = surface;
    const world = (u: number, v: number) => kind === "front" ? [u * 48 - 72, v * 30, plane * 48 - 48]
      : kind === "side" ? [plane * 48 - 72, v * 30, u * 48 - 48]
      : [u * 48 - 72, plane * 30, v * 48 - 48];
    const center = squares.map(([u, v]) => world(u + .5, v + .5)).reduce((sum, p) => sum.map((n, i) => n + p[i] / squares.length), [0, 0, 0]);
    const depth = center[1] * Math.sin(tiltX) + (-center[0] * Math.sin(tiltY) + center[2] * Math.cos(tiltY)) * Math.cos(tiltX);
    const internal = kind === "front" ? plane > 0 : kind === "side" ? plane < 3 : plane > 0;
    return { id, owner, kind, internal, d: contour(squares, world), depth, part: parts.find((part) => part.owner === owner)!, order: parts.findIndex((part) => part.owner === owner) };
  }).sort((a, b) => b.depth - a.depth);
  return { cells, parts, faces };
}
