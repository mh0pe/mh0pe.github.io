/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-css-tags -- Native links and stylesheet preserve the non-hydrated static article export. */
import { articlePath, relatedArticles, topicFor, type BlogArticle } from "../../data/blog";
import { StructuredData } from "../v2/StructuredData";
import { RouteFrame } from "../v2/RouteFrame";
import { artFor, artStyle } from "../../data/article-art";
import { StoryStage } from "@/app/components/blog/StoryStage";
import { isMotionStory } from "@/app/data/article-motion";
import { socialImageData } from "@/app/data/social";

const site = "https://mh0pe.github.io";

export default function ArticlePage({ article }: { readonly article: BlogArticle }) {
  const topic = topicFor(article);
  const direction = artFor(article.slug);
  if (!isMotionStory(article.slug)) throw new Error("Missing motion story: " + article.slug);
  const story = article.slug;
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
      <script data-static-runtime="article-scroll" src="/article-scroll.js?v=20261007-living-feature" defer />
      <article className="journal article-page" data-motion-story={story}
        data-story-focus={direction.beats[0].section} data-story-resolve={direction.beats[1].section}
        data-topic={article.topic} data-art={direction.family} style={artStyle(direction)}>
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
            <StoryStage story={story} moment="opening" />
          </div>
        </header>
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
            {article.sections.map((section) => (
              <section className="article-section" id={section.id} key={section.id} aria-labelledby={section.id + "-title"}>
                <h2 id={section.id + "-title"}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {direction.beats.filter((beat) => beat.section === section.id).map((beat) => <StoryStage key={beat.moment}
                  story={story} moment={beat.moment === "focus" ? "middle" : "ending"} />)}
                {section.detail ? <details className="article-implementation"><summary>{section.detail.title}</summary>
                  <ol>{section.detail.steps.map((item) => <li key={item}>{item}</li>)}</ol><p>{section.detail.caption}</p>
                </details> : null}
                {section.sources ? <ul className="article-section__sources" aria-label={"Related code for " + section.title}>
                  {section.sources.map((id) => {
                    const source = article.sources.find((entry) => entry.id === id)!;
                    return <li key={id}><a href={source.href} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a></li>;
                  })}
                </ul> : null}
              </section>
            ))}
            <details className="article-implementation">
              <summary>For a closer technical look</summary>
              <ul>{article.implementationNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            </details>
            <section className="article-takeaway" id="takeaway" aria-labelledby="takeaway-title">
              <h2 id="takeaway-title">What I take from it</h2>
              <p>{article.takeaway}</p>
            </section>
          </div>
          <aside className="article-visual-rail" aria-label="Visual companion to the article">
            <StoryStage story={story} moment="middle" rail />
          </aside>
        </div>
        <div className="shell article-reference-layout">
            <section className="article-sources article-reading" id="sources" aria-labelledby="sources-title">
              <h2 id="sources-title">Code and further reading</h2>
              <ul>{article.sources.map((source) => (
                <li id={"source-" + source.id} key={source.id}>
                  <a href={source.href} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a>
                  {source.note ? <p>{source.note}</p> : null}
                </li>
              ))}</ul>
              {article.linkedinPost ? <a className="article-discussion" href={article.linkedinPost.href} target="_blank" rel="noreferrer">{article.linkedinPost.label} <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a> : null}
              {article.relatedCase ? <a className="article-case-link" href={article.relatedCase.href}>{article.relatedCase.label} <span aria-hidden="true">→</span></a> : null}
            </section>
        </div>
        <section className="shell journal-related" aria-labelledby="related-writing-title">
          <h2 id="related-writing-title">Another angle on the work.</h2>
          <div>
            {relatedArticles(article).map((related) => <article key={related.slug} data-topic={related.topic}>
              <p className="journal-eyebrow">{topicFor(related).label}</p>
              <h3><a href={articlePath(related)}>{related.title} <span aria-hidden="true">↗</span></a></h3>
              <p>{related.deck}</p>
            </article>)}
          </div>
        </section>
      </article>
    </RouteFrame>
  );
}
