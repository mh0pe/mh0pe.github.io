import { projectFields } from "@/app/components/v3/HopeLineField";

// Adapted from OriginKit Topology Field's spatial network treatment. Geometry is
// prepared at build time; connections come from public work, not proximity.
const labels = ["Security", "Policy", "Portability", "Agent teams", "Build tools", "Browser", "AI tooling", "Cloud"];

function fixed(value: number) {
  return Number(value.toFixed(1));
}

export function buildSculpture() {
  return projectFields.map((project, index) => {
    const angle = -Math.PI / 2 + (index / projectFields.length) * Math.PI * 2;
    const depth = Math.sin(angle + 0.6);
    const center = { x: 240 + Math.cos(angle) * 160, y: 190 + Math.sin(angle) * 126 };
    const scale = 0.57 + (depth + 1) * 0.035;
    const positions = new Map(project.nodes.map((node) => {
      const point = project.positions.get(node.id)!;
      return [node.id, {
        x: fixed(center.x + (point.x - project.anchor.x) * scale),
        y: fixed(center.y + (point.y - project.anchor.y) * scale),
      }];
    }));
    const connections = project.edges.map((edge) => {
      const from = positions.get(edge.source)!;
      const to = positions.get(edge.target)!;
      return { id: edge.id, d: `M${from.x} ${from.y}L${to.x} ${to.y}` };
    });
    const nodes = project.nodes.map((node) => {
      const point = positions.get(node.id)!;
      const r = node.type === "repository" ? 3.6 : node.type === "evidence" ? 2.8 : 1.6;
      return `M${fixed(point.x - r)} ${point.y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
    }).join("");
    return { project, center, connections, nodes, label: labels[index] };
  });
}

export default function ContributionSculpture() {
  return (
    <figure className="contribution-sculpture" data-contribution-sculpture data-motion-once>
      <svg viewBox="0 0 480 385" role="img" aria-labelledby="sculpture-title sculpture-description">
        <title id="sculpture-title">Eight systems, connected by a practice.</title>
        <desc id="sculpture-description">Each cluster is a real project. Its branches represent selected public changes and implementation details. The surrounding orbits are decorative; the linked atlas below explains the work.</desc>
        <g className="contribution-sculpture__orbits" aria-hidden="true">
          <ellipse cx="240" cy="190" rx="196" ry="150" />
          <ellipse cx="240" cy="190" rx="180" ry="66" transform="rotate(-28 240 190)" />
          <ellipse cx="240" cy="190" rx="180" ry="66" transform="rotate(35 240 190)" />
        </g>
        {buildSculpture().map(({ project, center, connections, nodes, label }, index) => (
          <g className="contribution-sculpture__cluster" data-graph-id={project.graph.id} data-family={project.graph.chapterId} key={project.graph.id} style={{ "--cluster-order": index } as React.CSSProperties}>
            <title>{project.graph.title}</title>
            <path className="contribution-sculpture__edges" d={connections.map((edge) => edge.d).join("")} />
            <path className="contribution-sculpture__nodes" d={nodes} />
            <text x={fixed(center.x)} y={fixed(center.y + (center.y > 190 ? 46 : -37))} textAnchor="middle">{label}</text>
          </g>
        ))}
        <g className="contribution-sculpture__center" aria-hidden="true">
          <circle cx="240" cy="190" r="29" />
          <text x="240" y="195" textAnchor="middle">Hope</text>
        </g>
      </svg>
      <figcaption>One practice. Many connected possibilities.</figcaption>
    </figure>
  );
}
