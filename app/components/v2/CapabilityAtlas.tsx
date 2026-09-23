import {
  capabilityIndexRows,
  publicSources,
} from "../../data/portfolio-v2";
import { SourceLink } from "./Evidence";

const portfolioLinks: Partial<Record<(typeof capabilityIndexRows)[number]["id"], { href: string; label: string }>> = {
  "cloudformation-guard": { href: "/work/cloudformation-guard/", label: "See the policy integrity system" },
  "nix-windows": { href: "/work/nix-windows/", label: "See the Windows portability system" },
  "agent-operating-systems": { href: "/work/agent-systems/", label: "See the agent systems" },
  "lightpanda-svg": { href: "/decisions/#reviewable-svg-stack", label: "See the layered delivery decision" },
};

export default function CapabilityAtlas() {
  return (
    <div className="capability-atlas" data-visualization="capability-atlas">
      <div className="capability-atlas__map" aria-hidden="true">
        <svg viewBox="0 0 720 420" focusable="false">
          <path className="atlas-axis" d="M48 210H672M360 32V388" />
          <path className="atlas-orbit" pathLength="1" d="M104 210C104 104 220 48 360 48S616 104 616 210 500 372 360 372 104 316 104 210Z" />
          {capabilityIndexRows.map((row, index) => {
            const angle = (index / capabilityIndexRows.length) * Math.PI * 2 - Math.PI / 2;
            const x = 360 + Math.cos(angle) * 238;
            const y = 210 + Math.sin(angle) * 138;
            return (
              <g
                className={`capability-atlas__node capability-atlas__node--${index + 1}`}
                data-capability-id={row.id}
                transform={`translate(${x} ${y})`}
                key={row.id}
              >
                <rect x="-10" y="-10" width="20" height="20" />
                <text x="0" y="-18" textAnchor="middle">{String(index + 1).padStart(2, "0")}</text>
              </g>
            );
          })}
          <circle cx="360" cy="210" r="30" />
          <text x="360" y="214" textAnchor="middle">MHS</text>
        </svg>
      </div>
      <ol className="capability-atlas__ledger">
        {capabilityIndexRows.map((row, index) => (
          <li
            data-capability-id={row.id}
            key={row.id}
            id={`capability-${row.id}`}
          >
            <details open={index === 0 ? true : undefined}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3 className="capability-atlas__system">{row.system}</h3>
                <small>{row.family}</small>
              </summary>
              <div>
                <p>{row.capability}</p>
                <dl>
                  <div><dt>My contribution</dt><dd>{row.contribution}</dd></div>
                  <div><dt>Where to inspect it</dt><dd>{row.availability}</dd></div>
                  <div><dt>Integration</dt><dd>{row.adoption}</dd></div>
                </dl>
                {portfolioLinks[row.id] ? (
                  <a className="text-action capability-atlas__story" href={portfolioLinks[row.id]?.href}>
                    {portfolioLinks[row.id]?.label} <span aria-hidden="true">→</span>
                  </a>
                ) : null}
                <p className="micro-label">Code and review</p>
                <ul className="atlas-source-list">
                  {row.sourceIds.map((sourceId) => (
                    <li key={sourceId}>
                      <SourceLink sourceId={sourceId}>{publicSources[sourceId].label}</SourceLink>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </li>
        ))}
      </ol>
      <p className="capability-atlas__note">Select a system to connect its result with the architecture and public work behind it.</p>
    </div>
  );
}
