import { motionStories, chapterForMoment, validatedReverseFloor, type MotionStory, type StoryMoment } from "@/app/data/article-motion";
import { articleMobileLabels } from "@/app/data/article-mobile-labels";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";
import type { ArticleSource } from "@/app/data/blog";

export function StoryStage({ story, moment, rail = false, sources = [] }: { story: MotionStory; moment: StoryMoment; rail?: boolean; sources?: readonly ArticleSource[] }) {
  const direction = motionStories[story];
  const chapter = chapterForMoment(story, moment);
  const index = direction.chapters.indexOf(chapter);
  const instance = story + "-" + (rail ? "rail" : moment);
  return <figure className={"article-story" + (rail ? " article-story--rail" : " article-story--" + moment)}
    data-story-stage={rail ? "rail" : moment} data-story-slug={story} data-story-frame={chapter.frame}
    data-story-start-frame={chapter.start} data-story-reverse-floor={rail ? undefined : validatedReverseFloor(chapter)}
    data-story-end-frame={chapter.end} data-story-anchor={chapter.section} data-story-chapter={index}
    aria-describedby={instance + "-description"}>
    <div className="article-story__viewport">
      <div className="article-story__still"><StoryScene story={story} frame={chapter.frame} id={instance + "-still"} accessible /></div>
      <div className="article-story__live" data-story-mount aria-hidden="true" />
    </div>
    <div className="article-story__mobile-guides">
      {articleMobileLabels[story].map((guide, guideIndex) => (!rail && guideIndex !== index) ? null : <div className="article-story__mobile-guide"
        data-mobile-story-chapter={guideIndex} key={guideIndex}>
        <p className="article-story__mobile-orientation">{guide.orientation}</p>
        <dl className={"article-story__mobile-parts" + (guide.layout === "compact" ? " article-story__mobile-parts--compact" : "")}>
          {guide.parts.map(part => <div key={part.label}>
            <dt>{guide.layout !== "compact" ? <span>{part.location}</span> : null}{part.label}</dt>
            <dd>{part.meaning}</dd>
          </div>)}
        </dl>
      </div>)}
    </div>
    <figcaption className="article-story__caption">
      <div>
        <strong data-story-title>{chapter.title}</strong>
        <p data-story-caption>{chapter.caption}</p>
        <p className="visually-hidden" id={instance + "-description"} data-story-description>{chapter.description}</p>
        <p className="article-story__cue"><span aria-hidden="true">↓</span> Changes as you read</p>
        {sources.length ? <div className="article-story__references">
          {direction.chapters.map((entry, chapterIndex) => (!rail && chapterIndex !== index) ? null : <ul data-story-source-chapter={chapterIndex} key={entry.moment} aria-label="Code behind this illustration">
            {entry.sourceIds.map(sourceId => {
              const source = sources.find(item => item.id === sourceId);
              if (!source) throw new Error("Missing story source: " + story + "/" + sourceId);
              return <li key={sourceId}><a href={source.href} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a></li>;
            })}
          </ul>)}
        </div> : null}
      </div>
      <button type="button" className="article-story__quiet" data-story-quiet hidden>Still view for all illustrations</button>
    </figcaption>
  </figure>;
}
