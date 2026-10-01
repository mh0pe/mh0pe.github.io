import { projectFields } from "./HopeLineField";
import SatinRibbon from "./SatinRibbon";

// Layout is art direction. Only the selected project edges encode relationships.
export const livingProjects = [
  { label: "Security", href: "/work/automated-security-helper/", x: 228, y: 198, scale: 1.65 },
  { label: "Policy", href: "/work/cloudformation-guard/", x: 525, y: 104, scale: 1.15 },
  { label: "Windows", href: "/work/nix-windows/", x: 512, y: 367, scale: 1.5 },
  { label: "Agent teams", href: "/work/agent-systems/", x: 235, y: 484, scale: 1.3 },
  { label: "Build tools", href: "/capabilities/#capability-rules-js-pnp", x: 91, y: 357, scale: 0.85 },
  { label: "Browser", href: "/capabilities/#capability-lightpanda-svg", x: 586, y: 536, scale: 0.95 },
  { label: "AI tooling", href: "/capabilities/#capability-aws-labs-mcp", x: 401, y: 239, scale: 0.85 },
  { label: "Cloud", href: "/capabilities/#capability-aws-cloud-runtime", x: 143, y: 68, scale: 0.8 },
] as const;

export function buildLivingCluster(project: (typeof projectFields)[number]) {
  const positions = new Map(project.nodes.map((node) => {
    const p = project.positions.get(node.id)!;
    return [node.id, { x: p.x - project.anchor.x, y: p.y - project.anchor.y }];
  }));
  const connections = project.edges.map((edge) => {
    const from = positions.get(edge.source)!;
    const to = positions.get(edge.target)!;
    return { id: edge.id, d: `M${from.x} ${from.y}L${to.x} ${to.y}` };
  });
  const nodes = project.nodes.map((node) => {
    const p = positions.get(node.id)!;
    const r = node.type === "repository" ? 4 : node.type === "evidence" ? 3 : 1.8;
    return `M${p.x - r} ${p.y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }).join("");
  return { project, positions, connections, nodes };
}

export const livingClusters = projectFields.map(buildLivingCluster);

export function ProjectArtwork() {
  const field = livingClusters.find(({ project }) => project.graph.id === "automated-security-helper")!;
  return (
    <svg className="living-feature__art" viewBox="0 0 900 540" aria-hidden="true" focusable="false">
      <SatinRibbon id="feature-satin" />
      <g className="living-feature__graph" transform="translate(692 238) scale(2.15)">
        <path className="living-cluster__edges" d={field.connections.map((edge) => edge.d).join("")} />
        <path className="living-cluster__nodes" d={field.nodes} />
      </g>
      <text x="620" y="404" className="living-feature__art-label">SECURITY, CONNECTED.</text>
    </svg>
  );
}

export default function LivingConstellation() {
  return (
    <figure className="living-constellation" data-contribution-sculpture data-motion-once>
      <svg viewBox="0 0 720 620" role="img" aria-labelledby="living-title living-description">
        <title id="living-title">A body of work across eight systems.</title>
        <desc id="living-description">Each numbered cluster shows selected public changes and implementation details within one project. The folded ribbons are decorative, not connections between projects. Matching project links follow the artwork.</desc>
        <defs><clipPath id="hero-satin-bounds"><rect width="720" height="620" /></clipPath></defs>
        <g clipPath="url(#hero-satin-bounds)"><SatinRibbon id="hero-satin" /></g>
        {livingClusters.map(({ project, connections, nodes }, index) => {
          const layout = livingProjects[index];
          return (
            <g className="living-cluster" key={project.graph.id} data-graph-id={project.graph.id} data-family={project.graph.chapterId}
              style={{ "--cluster-x": `${layout.x}px`, "--cluster-y": `${layout.y}px`, "--cluster-scale": layout.scale,
                "--mobile-x": `${index % 2 ? 522 : 198}px`, "--mobile-y": `${90 + Math.floor(index / 2) * 142}px` } as React.CSSProperties}>
              <title>{project.graph.title}</title>
              <path className="living-cluster__edges" d={connections.map((edge) => edge.d).join("")} />
              <path className="living-cluster__nodes" d={nodes} />
              <text x="0" y="70" textAnchor="middle">{String(index + 1).padStart(2, "0")}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <p className="living-constellation__caption">Explore the work behind the connections.</p>
        <nav className="living-project-index" aria-label="Explore eight systems">
          {livingProjects.map((project, i) => (
            <a className="hope-line__index-item" href={project.href} data-graph-id={projectFields[i].graph.id} key={project.href}>
              <span>{String(i + 1).padStart(2, "0")}</span>{project.label}
            </a>
          ))}
        </nav>
      </figcaption>
    </figure>
  );
}
