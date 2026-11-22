import type { BlogArticle } from "../../data/blog";
import { artFor, artStyle, type ArticleArtDirection, type ArtFamily, type ArtMoment } from "../../data/article-art";
import { chapterForMoment, type MotionStory } from "../../data/article-motion";
import { StoryScene } from "./motion/StoryScene";

const storyByFamily: Record<ArtFamily, MotionStory> = {
  reports: "workspace-security", editions: "one-definition-many-agent-tools",
  registration: "reproducible-security-checks", annotations: "security-feedback-where-you-work",
  folio: "handoffs-that-carry-the-work", verification: "integrity-bound-yarn-pnp-for-bazel",
  cutaway: "typed-svg-dom", apertures: "aws-labs-mcp", revisions: "cloud-runtime", receipts: "zero-findings",
  shards: "slowest-shard", matrix: "support-is-a-matrix",
};

// Collection previews use an authored article pose, without loading a Player,
// or running another clock in the writing library.
export function ArtDrawing({ direction, moment = "cover", id, compact = false }: {
  readonly direction: ArticleArtDirection; readonly moment?: ArtMoment; readonly id: string;
  readonly title?: string; readonly description?: string; readonly compact?: boolean;
}) {
  const story = storyByFamily[direction.family];
  const chapter = chapterForMoment(story, moment === "cover" ? "opening" : moment === "focus" ? "middle" : "ending");
  return <StoryScene story={story} frame={chapter.frame} id={id} accessible={!compact}
    className="article-art__drawing" artFamily={direction.family} artMoment={moment} />;
}
export function EditorialCover({ article }: { readonly article: BlogArticle }) {
  const direction = artFor(article.slug);
  const id = "figure-" + article.slug;
  return <figure className="article-cover" id={id} data-journal-figure data-art={direction.family} style={artStyle(direction)}>
    <ArtDrawing direction={direction} id={id} />
    <div className="article-cover__tools">
      <details className="article-cover__key"><summary>How the pieces fit</summary>
        <ul>{article.diagram.steps.map((step) => <li key={step.label}><strong>{step.label}</strong><span>{step.detail}</span></li>)}</ul>
      </details>
      <button className="article-figure__replay" type="button" data-figure-replay disabled hidden aria-label={"Replay the illustration: " + direction.cover.title}>Replay <span aria-hidden="true">↻</span></button>
    </div>
    <figcaption>{direction.cover.caption}</figcaption>
  </figure>;
}

export function EditorialBeat({ direction, beat, id, detail }: {
  readonly direction: ArticleArtDirection; readonly beat: ArticleArtDirection["beats"][number]; readonly id: string;
  readonly detail?: BlogArticle["sections"][number]["detail"];
}) {
  return <figure className="article-beat" data-journal-figure data-art={direction.family} style={artStyle(direction)} aria-labelledby={id + "-heading"}>
    <ArtDrawing direction={direction} moment={beat.moment} id={id} title={beat.title} description={beat.description} />
    <figcaption className="article-beat__note">
      <h3 id={id + "-heading"}>{beat.title}</h3>
      <p className="article-beat__caption">{beat.caption}</p>
      {detail ? <details className="article-beat__detail"><summary>Design notes</summary>
        <ol>{detail.steps.map((step) => <li key={step}>{step}</li>)}</ol><p>{detail.caption}</p>
      </details> : null}
      <button className="article-figure__replay" type="button" data-figure-replay disabled hidden aria-label={"Replay the illustration: " + beat.title}>Replay <span aria-hidden="true">↻</span></button>
    </figcaption>
  </figure>;
}
