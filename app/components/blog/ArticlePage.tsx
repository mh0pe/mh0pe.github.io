/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-css-tags -- Native links and stylesheet preserve the non-hydrated static article export. */
import { articlePath, relatedArticles, topicFor, type BlogArticle } from "../../data/blog";
import { StructuredData } from "../v2/StructuredData";
import { RouteFrame } from "../v2/RouteFrame";
import { artFor, artStyle } from "../../data/article-art";
import { StoryStage } from "@/app/components/blog/StoryStage";
import { isMotionStory, motionStories } from "@/app/data/article-motion";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";
import { socialImageData } from "@/app/data/social";
import ArticleSourceTrail from "./ArticleSourceTrail";
import { ArtDrawing } from "./EditorialArt";

const site = "https://mh0pe.github.io";

export default function ArticlePage({ article }: { readonly article: BlogArticle }) {
  const topic = topicFor(article);
  const direction = artFor(article.slug);
  if (!isMotionStory(article.slug)) throw new Error("Missing motion story: " + article.slug);
  const story = article.slug;
  const chapters = motionStories[story].chapters;
  const url = site + articlePath(article);
  return (
    <RouteFrame current="blog">
      {/* React places these in the document head. Vinext's current metadata
          shim does not emit the Open Graph article section/tag fields. */}
      <meta property="article:section" content={topic.label} />
      {article.tags.map((tag) => <meta property="article:tag" content={tag} key={tag} />)}
      <StructuredData value={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting", "@id": url + "#article", url, headline: article.title,
            description: article.deck, author: { "@id": site + "/#madison-hope-steiner" },
            image: socialImageData(articlePath(article)), mainEntityOfPage: url,
            isPartOf: { "@id": site + "/blog/#journal" }, articleSection: topic.label,
            keywords: article.tags, citation: article.sources.map((source) => source.href),
            ...(article.linkedinPost ? { discussionUrl: article.linkedinPost.href } : {}),
          },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: site + "/" },
            { "@type": "ListItem", position: 2, name: "Writing", item: site + "/blog/" },
            { "@type": "ListItem", position: 3, name: article.title, item: url },
          ] },
        ],
      }} />
      <link rel="stylesheet" href="/living-feature.css?v=20261007-living-feature" precedence="living-feature" />
      <link rel="stylesheet" href="/article-mobile-labels.css" precedence="article-mobile-labels" />
      <script data-static-runtime="article-scroll" src="/article-scroll.js?v=20261007-living-feature" defer />
      <article className="journal article-page" data-motion-story={story} data-story-runtime="/article-motion.js" data-story-layout="inline"
        data-story-focus={direction.beats[0].section} data-story-resolve={direction.beats[1].section}
        data-topic={article.topic} data-art={direction.family} style={artStyle(direction)}>
        <div className="article-opening-band">
        <header className="shell article-opening">
          <a className="journal-back" href="/blog/">← All writing</a>
          <div className="article-opening__grid">
            <div className="article-opening__words">
              <p className="journal-eyebrow">{topic.label} <span aria-hidden="true">/</span> {article.project}</p>
              <h1>{article.title}</h1>
              <p className="article-deck">{article.deck}</p>
              <p className="article-byline">By <a href="/#experience">Madison Hope Steiner</a></p>
              <ul className="journal-tags" aria-label="Article topics">
                {article.tags.map((tag) => <li key={tag}><a href={"/blog/?tag=" + encodeURIComponent(tag) + "#topic-" + article.topic}>{tag}</a></li>)}
              </ul>
            </div>
            <figure className="article-opening__vignette">
              <StoryScene story={story} frame={chapters[0].frame} id={story + "-cover"} accessible />
              <figcaption>{motionStories[story].name}</figcaption>
            </figure>
          </div>
        </header>
        </div>
        <div className="shell article-layout">
          <div className="article-reading">
          <aside className="article-contents">
            <details>
              <summary>In this article</summary>
              <nav aria-label="Article contents">
                <a href="#overview">At a glance</a>
                {article.sections.map((section) => <a key={section.id} href={"#" + section.id}>{section.title}</a>)}
                <a href="#takeaway">What I take from it</a>
                <a href="#sources">Code and further reading</a>
              </nav>
            </details>
          </aside>
            <div className="article-overview" id="overview">
              <p className="journal-eyebrow">At a glance</p>
              <p>{article.overview}</p>
            </div>
            <div className="article-introduction">{article.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            {article.sections.map((section) => {
              const visualBeats = chapters.filter(chapter => chapter.section === section.id);
              const otherSources = section.sources?.filter(id => !visualBeats.some(chapter => chapter.sourceIds.includes(id)));
              return (
              <section className="article-section" id={section.id} key={section.id} aria-labelledby={section.id + "-title"}>
                <h2 id={section.id + "-title"}>{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => <div className="article-section__beat" key={paragraph}>
                  <p>{paragraph}</p>
                  {visualBeats[index] ? <StoryStage story={story} moment={visualBeats[index].moment} sources={article.sources} /> : null}
                </div>)}
                {section.detail ? <details className="article-implementation"><summary>{section.detail.title}</summary>
                  <ol>{section.detail.steps.map((item) => <li key={item}>{item}</li>)}</ol><p>{section.detail.caption}</p>
                </details> : null}
                {otherSources?.length ? <ul className="article-section__sources" aria-label={"Related code for " + section.title}>
                  {otherSources.map((id) => {
                    const source = article.sources.find((entry) => entry.id === id)!;
                    return <li key={id}><a href={source.href} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a></li>;
                  })}
                </ul> : null}
              </section>
            ); })}
            <details className="article-implementation">
              <summary>For a closer technical look</summary>
              <ul>{article.implementationNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            </details>
            <section className="article-takeaway" id="takeaway" aria-labelledby="takeaway-title">
              <h2 id="takeaway-title">What I take from it</h2>
              <p>{article.takeaway}</p>
            </section>
          </div>
        </div>
        <div className="shell article-reference-layout">
            <section className="article-sources article-reading" id="sources" aria-labelledby="sources-title">
              <h2 id="sources-title">Code and further reading</h2>
              <ul>{article.sources.map((source) => (
                <li id={"source-" + source.id} key={source.id}>
                  <a href={source.href} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a>
                  {source.note ? <p>{source.note}</p> : null}
                  {article.slug === "workspace-security" ? <ArticleSourceTrail sourceHref={source.href} label={source.label} /> : null}
                </li>
              ))}</ul>
              {article.linkedinPost ? <a className="article-discussion" href={article.linkedinPost.href} target="_blank" rel="noreferrer">{article.linkedinPost.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a> : null}
              {article.relatedCase ? <a className="article-case-link" href={article.relatedCase.href}>{article.relatedCase.label} <span aria-hidden="true">→</span></a> : null}
            </section>
        </div>
        <section className="shell journal-related" aria-labelledby="related-writing-title">
          <h2 id="related-writing-title">Another angle on the work.</h2>
          <div>
            {relatedArticles(article).map((related) => <article className="journal-related__card" key={related.slug} data-topic={related.topic}>
              <div className="journal-related__cover" style={artStyle(artFor(related.slug))}>
                <ArtDrawing direction={artFor(related.slug)} id={"related-" + related.slug} compact />
              </div>
              <p className="journal-eyebrow">{topicFor(related).label}</p>
              <h3><a className="journal-related__link" href={articlePath(related)}>{related.title} <span aria-hidden="true">↗</span></a></h3>
              <p>{related.deck}</p>
            </article>)}
          </div>
        </section>
      </article>
    </RouteFrame>
  );
}
