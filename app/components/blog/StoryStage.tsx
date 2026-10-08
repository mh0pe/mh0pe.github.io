import { motionStories, storyFrames, type MotionStory, type StoryMoment } from "@/app/data/article-motion";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";

export function StoryStage({ story, moment, rail = false }: { story: MotionStory; moment: StoryMoment; rail?: boolean }) {
  const direction = motionStories[story];
  const index = moment === "opening" ? 0 : moment === "middle" ? 1 : 2;
  const chapter = direction.chapters[index];
  const instance = story + "-" + (rail ? "rail" : moment);
  const keys: Record<MotionStory, string[]> = {
    "workspace-security": ["Application", "Service", "Infrastructure"],
    "one-definition-many-agent-tools": ["Shared meaning", "Native packaging", "Validation"],
    "reproducible-security-checks": ["Fixed tools", "Changing inputs"],
    "security-feedback-where-you-work": ["Scanner result", "Working margin"],
    "handoffs-that-carry-the-work": ["Why", "Now", "Next", "Human review"],
    "integrity-bound-yarn-pnp-for-bazel": ["Content", "Type", "Mode", "Path", "Membership"],
    "typed-svg-dom": ["Document model", "Live values", "Geometry", "Text metrics"],
    "aws-labs-mcp": ["Documents", "Images", "Connection", "Session"],
    "cloud-runtime": ["Preview", "Example", "Contract"],
  };
  return <figure className={"article-story" + (rail ? " article-story--rail" : " article-story--" + moment)}
    data-story-stage={rail ? "rail" : moment} data-story-slug={story} data-story-frame={storyFrames[moment]}
    aria-describedby={instance + "-description"}>
    <div className="article-story__viewport">
      <div className="article-story__still"><StoryScene story={story} frame={storyFrames[moment]} id={instance + "-still"} accessible /></div>
      <div className="article-story__live" data-story-mount aria-hidden="true" />
    </div>
    <ul className="article-story__keys" aria-label="Parts of the illustration">{keys[story].map(label => <li key={label}>{label}</li>)}</ul>
    <figcaption className="article-story__caption">
      <div>
        <p className="article-story__folio">{direction.name}</p>
        <strong data-story-title>{chapter.title}</strong>
        <p data-story-caption>{chapter.caption}</p>
        <p className="visually-hidden" id={instance + "-description"} data-story-description>{chapter.description}</p>
      </div>
      <button type="button" className="article-story__quiet" data-story-quiet hidden>Still view</button>
    </figcaption>
  </figure>;
}
