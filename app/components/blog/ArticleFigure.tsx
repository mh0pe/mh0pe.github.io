import type { CSSProperties } from "react";
import type { ArticleDiagram, BlogTopic } from "../../data/blog";

function ArrowPath({ d, markerId }: { readonly d: string; readonly markerId: string }) {
  return <path className="article-diagram__connection" d={d} markerEnd={"url(#" + markerId + ")"} />;
}

function Brick({ x, y, width = 132, height = 70, depth = 22, index }: {
  readonly x: number; readonly y: number; readonly width?: number;
  readonly height?: number; readonly depth?: number; readonly index: number;
}) {
  return (
    <g transform={"translate(" + x + " " + y + ")"}>
      <g className="article-brick" style={{ "--piece-index": index } as CSSProperties}>
        <path className="article-brick__top" d={"M0 0L" + depth + " " + -depth / 2 + "H" + (width + depth) + "L" + width + " 0Z"} />
        <path className="article-brick__side" d={"M" + width + " 0L" + (width + depth) + " " + -depth / 2 + "V" + (height - depth / 2) + "L" + width + " " + height + "Z"} />
        <rect className="article-brick__front" width={width} height={height} rx="2" />
        <text className="article-brick__number" x={width / 2} y={height / 2 + 8} textAnchor="middle">{index + 1}</text>
      </g>
    </g>
  );
}

export function DiagramDrawing({ diagram, id, compact = false }: {
  readonly diagram: ArticleDiagram; readonly id: string; readonly compact?: boolean;
}) {
  const titleId = id + "-drawing-title";
  const descriptionId = id + "-drawing-description";
  const arrowId = id + "-arrow";
  return (
    <svg className="article-diagram" viewBox="0 0 640 350" fill="none"
      role={compact ? undefined : "img"} aria-hidden={compact ? true : undefined}
      aria-labelledby={compact ? undefined : titleId + " " + descriptionId} focusable="false">
      {!compact ? <><title id={titleId}>{diagram.title}</title><desc id={descriptionId}>{diagram.steps.map((step, index) => String(index + 1) + ". " + step.label + ": " + step.detail).join(" ")}</desc></> : null}
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M1 1L8 5L1 9" className="article-diagram__arrowhead" />
        </marker>
      </defs>
      <ellipse className="article-diagram__ground" cx="320" cy="309" rx="265" ry="19" />
      {diagram.kind === "layers" ? (
        <>
          {diagram.steps.map((step, index) => <Brick key={step.label} x={90} y={281 - index * 36} width={430} height={27} depth={35} index={index} />)}
          <path className="article-diagram__axis" d="M570 292V53m-7 9 7-9 7 9" />
        </>
      ) : diagram.kind === "workspace" ? (
        <>
          {[0, 1, 2].map((index) => <Brick key={index} x={58 + index * 182} y={73} width={126} height={70} index={index} />)}
          <ArrowPath markerId={arrowId} d="M121 151V180Q121 195 144 195H274V224" />
          <ArrowPath markerId={arrowId} d="M303 151V224" />
          <ArrowPath markerId={arrowId} d="M485 151V180Q485 195 462 195H332V224" />
          <Brick x={154} y={230} width={320} height={65} depth={28} index={3} />
          <g className="article-diagram__project-marks">
            {[0, 1, 2].map((index) => <circle key={index} cx={196 + index * 115} cy="248" r="5" style={{ "--piece-index": index } as CSSProperties} />)}
          </g>
        </>
      ) : diagram.kind === "fan" ? (
        <>
          <Brick x={224} y={39} width={170} height={65} index={0} />
          <ArrowPath markerId={arrowId} d="M309 113V141" />
          <Brick x={224} y={149} width={170} height={60} index={1} />
          <ArrowPath markerId={arrowId} d="M309 218V235H119V258" />
          <ArrowPath markerId={arrowId} d="M309 218V258" />
          <ArrowPath markerId={arrowId} d="M309 218V235H499V258" />
          {[0, 1, 2].map((index) => <Brick key={index} x={58 + index * 190} y={265} width={122} height={48} index={2} />)}
        </>
      ) : diagram.kind === "integrity" ? (
        <>
          <Brick x={26} y={80} width={135} height={68} index={0} />
          <Brick x={26} y={219} width={135} height={68} index={1} />
          <ArrowPath markerId={arrowId} d="M190 114H208V172H241" />
          <ArrowPath markerId={arrowId} d="M190 252H208V192H241" />
          <Brick x={250} y={147} width={135} height={85} index={2} />
          <ArrowPath markerId={arrowId} d="M414 190H461" />
          <Brick x={470} y={147} width={135} height={85} index={3} />
          <path className="article-diagram__check" d="m290 214 8 8 17-20" />
        </>
      ) : diagram.kind === "domains" ? (
        <>{diagram.steps.map((step, index) => <Brick key={step.label} x={87 + index % 2 * 277} y={66 + Math.floor(index / 2) * 143} width={174} height={83} depth={30} index={index} />)}</>
      ) : (
        <>
          {diagram.steps.map((step, index) => {
            const count = diagram.steps.length;
            const width = count === 4 ? 113 : 146;
            const spacing = count === 4 ? 154 : 205;
            const x = 25 + index * spacing;
            return <g key={step.label}>
              <Brick x={x} y={124 + index * 16} width={width} height={100} index={index} />
              {index < count - 1 ? <ArrowPath markerId={arrowId} d={"M" + (x + width + 25) + " " + (177 + index * 16) + "H" + (x + spacing - 10)} /> : null}
            </g>;
          })}
        </>
      )}
    </svg>
  );
}

export function ArticleFigure({ diagram, id, topic, heading = "h2" }: {
  readonly diagram: ArticleDiagram; readonly id: string; readonly topic: BlogTopic;
  readonly heading?: "h2" | "h3";
}) {
  const Heading = heading;
  const List = diagram.kind === "workspace" || diagram.kind === "domains" ? "ul" : "ol";
  return (
    <figure className="article-figure" id={id} data-journal-figure data-diagram={diagram.kind} data-topic={topic}>
      <div className="article-figure__heading">
        <Heading>{diagram.title}</Heading>
        <button className="article-figure__replay" type="button" data-figure-replay disabled hidden
          aria-label={"Replay the illustration: " + diagram.title}>Replay <span aria-hidden="true">↻</span></button>
      </div>
      <div className="article-figure__composition">
        <DiagramDrawing diagram={diagram} id={id} />
        <List className="article-figure__legend" role="list">
          {diagram.steps.map((step, index) => (
            <li key={step.label}>
              <span className="article-figure__key" aria-hidden="true" style={{ "--piece-index": index } as CSSProperties}>{index + 1}</span>
              <span><strong>{step.label}</strong><small>{step.detail}</small></span>
            </li>
          ))}
        </List>
      </div>
      <figcaption>{diagram.caption}</figcaption>
    </figure>
  );
}

export function DetailFigure({ title, steps, caption, id }: {
  readonly title: string; readonly steps: readonly string[]; readonly caption: string; readonly id: string;
}) {
  return (
    <figure className="article-detail-figure" aria-labelledby={id + "-title"}>
      <p className="article-detail-figure__title" id={id + "-title"}>{title}</p>
      <ol role="list">
        {steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{step}</li>)}
      </ol>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
