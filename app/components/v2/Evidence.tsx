import {
  publicSources,
  type DeliveryState,
  type EvidenceClaim,
  type PublicSourceId,
} from "../../data/portfolio-v2";

export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const readerStatus: Record<DeliveryState, string> = {
  Released: "Available in release",
  Merged: "Integrated",
  Open: "Available in public branch",
  Prototype: "Public prototype",
  Superseded: "Historical implementation",
};

export function StatusStamp({ state }: { readonly state: DeliveryState }) {
  return (
    <span className="status-stamp" data-state={state.toLowerCase()}>
      <span aria-hidden="true" className="status-stamp__mark" />
      {readerStatus[state]}
    </span>
  );
}

export function SourceLink({
  sourceId,
  children,
  className,
}: {
  readonly sourceId: PublicSourceId;
  readonly children?: React.ReactNode;
  readonly className?: string;
}) {
  const source = publicSources[sourceId];

  return (
    <a
      className={["source-link", className].filter(Boolean).join(" ")}
      href={source.href}
      target="_blank"
      rel="noreferrer"
      data-proof-kind={source.kind}
    >
      <span className="source-link__label">{children ?? source.label}</span>
      <span className="visually-hidden"> (opens in a new tab)</span>
      <Arrow />
    </a>
  );
}

export function ClaimLedger({
  claim,
  compact = false,
}: {
  readonly claim: EvidenceClaim;
  readonly compact?: boolean;
}) {
  return (
    <article
      className="claim-ledger"
      data-claim-id={claim.id}
      id={`claim-${claim.id}`}
    >
      <div className="claim-ledger__heading">
        <p className="micro-label">Outcome</p>
        <StatusStamp state={claim.state} />
      </div>
      <h3>{claim.outcome}</h3>
      <dl>
        <div>
          <dt>Contribution</dt>
          <dd>{claim.contribution}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{readerStatus[claim.state]}</dd>
        </div>
        {!compact ? (
          <>
            <div>
              <dt>Availability</dt>
              <dd>{claim.availability}</dd>
            </div>
            <div>
              <dt>Adoption</dt>
              <dd>{claim.adoption}</dd>
            </div>
            <div>
              <dt>Maturity</dt>
              <dd>{claim.maturity}</dd>
            </div>
          </>
        ) : null}
      </dl>
      <div className="claim-ledger__proofs" role="group" aria-label="Claim proof">
        {claim.sourceIds.map((sourceId) => (
          <SourceLink sourceId={sourceId} key={sourceId} />
        ))}
      </div>
    </article>
  );
}
