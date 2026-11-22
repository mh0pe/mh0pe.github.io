import type { CSSProperties } from "react";
import { motionStories, type MotionStory } from "./article-motion";

export type ArtFamily = "reports" | "editions" | "registration" | "annotations" | "folio" | "verification" | "cutaway" | "apertures" | "revisions" | "receipts" | "shards" | "matrix";
export type ArtMoment = "cover" | "focus" | "resolve";

export interface ArticleArtDirection {
  readonly family: ArtFamily;
  readonly name: string;
  readonly palette: readonly [string, string, string, string];
  readonly cover: { readonly title: string; readonly description: string; readonly caption: string };
  readonly beats: readonly {
    readonly section: string;
    readonly moment: Exclude<ArtMoment, "cover">;
    readonly title: string;
    readonly description: string;
    readonly caption: string;
  }[];
}

// Preview metadata is derived from the same authored poses as the article,
// so a caption cannot describe a different illustration or an invented result.
function direction(story: MotionStory, family: ArtFamily): ArticleArtDirection {
  const p = motionStories[story];
  const [opening, middle] = p.chapters;
  const ending = p.chapters[p.chapters.length - 1];
  return {
    family, name: p.name, palette: [p.ink, p.material, p.accent, p.paper],
    cover: { title: opening.title, description: opening.description, caption: opening.caption },
    beats: [
      { section: middle.section, moment: "focus", title: middle.title, description: middle.description, caption: middle.caption },
      { section: ending.section, moment: "resolve", title: ending.title, description: ending.description, caption: ending.caption },
    ],
  };
}

export const articleArt: Readonly<Record<string, ArticleArtDirection>> = {
  "workspace-security": direction("workspace-security", "reports"),
  "one-definition-many-agent-tools": direction("one-definition-many-agent-tools", "editions"),
  "reproducible-security-checks": direction("reproducible-security-checks", "registration"),
  "security-feedback-where-you-work": direction("security-feedback-where-you-work", "annotations"),
  "handoffs-that-carry-the-work": direction("handoffs-that-carry-the-work", "folio"),
  "integrity-bound-yarn-pnp-for-bazel": direction("integrity-bound-yarn-pnp-for-bazel", "verification"),
  "typed-svg-dom": direction("typed-svg-dom", "cutaway"),
  "aws-labs-mcp": direction("aws-labs-mcp", "apertures"),
  "cloud-runtime": direction("cloud-runtime", "revisions"),
  "zero-findings": direction("zero-findings", "receipts"),
  "slowest-shard": direction("slowest-shard", "shards"),
  "support-is-a-matrix": direction("support-is-a-matrix", "matrix"),
};

export function artFor(slug: string): ArticleArtDirection {
  const direction = articleArt[slug];
  if (!direction) throw new Error("Missing article art direction: " + slug);
  return direction;
}

export function artStyle(direction: ArticleArtDirection): CSSProperties {
  return {
    "--art-ink": direction.palette[0], "--art-light": direction.palette[1],
    "--art-pop": direction.palette[2], "--art-paper": direction.palette[3],
  } as CSSProperties;
}
