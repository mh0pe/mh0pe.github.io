/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep this journal useful without hydration. */
import { ArtDrawing, EditorialBeat } from "../components/blog/EditorialArt";
import { artFor, artStyle } from "../data/article-art";
import { RouteFrame } from "../components/v2/RouteFrame";
import { StructuredData } from "../components/v2/StructuredData";
import { articlePath, blogArticles, blogTopics, legacyEntryPoints } from "../data/blog";
import { routeMetadata } from "../data/route-metadata";
import { socialImageData } from "../data/social";

export const metadata = routeMetadata("/blog/", "Writing", "Illustrated essays by Madison Hope Steiner on security, AI workflows, developer tools, infrastructure, and browser engineering.");

export default function BlogPage() {
  const featured = blogArticles[0];
  const featuredArt = artFor(featured.slug);
  const sharedArt = artFor(blogArticles[1].slug);
  const tags = [...new Set(blogArticles.flatMap((article) => article.tags))].sort();
  return (
    <RouteFrame current="blog">
      <StructuredData value={{
        "@context": "https://schema.org", "@type": "Blog", "@id": "https://mh0pe.github.io/blog/#journal",
        url: "https://mh0pe.github.io/blog/", name: "Notes from the work",
        image: socialImageData("/blog/"), mainEntityOfPage: "https://mh0pe.github.io/blog/",
        author: { "@id": "https://mh0pe.github.io/#madison-hope-steiner" },
        blogPost: blogArticles.map((article) => ({ "@type": "BlogPosting", headline: article.title, url: "https://mh0pe.github.io" + articlePath(article) })),
      }} />
      <div className="journal journal-index" data-journal>
        <header className="shell journal-opening">
          <div>
            <a className="journal-back" href="/">← The portfolio</a>
            <p className="journal-eyebrow">Writing</p>
            <h1>Notes from<br />the work.</h1>
            <p className="journal-opening__lead">The decisions behind the systems, explained through the work itself.</p>
            <p>Essays on security, AI collaboration, and the foundations that make software useful to other people.</p>
          </div>
          <div className="journal-feature" data-topic={featured.topic} style={artStyle(featuredArt)}>
            <p className="journal-eyebrow">Start here <span aria-hidden="true">/</span> Security</p>
            <h2><a href={articlePath(featured)}>{featured.title}</a></h2>
            <figure className="journal-feature__diagram">
              <ArtDrawing direction={featuredArt} id="journal-feature" />
              <figcaption>
                <ul className="journal-feature__legend" role="list">
                  {featured.diagram.steps.map((step) => <li key={step.label}>{step.label}</li>)}
                </ul>
              </figcaption>
            </figure>
            <p>{featured.overview}</p>
            <a className="journal-read" href={articlePath(featured)}>Read the essay <span aria-hidden="true">→</span></a>
          </div>
        </header>
        <section className="shell journal-library" id="articles" aria-labelledby="articles-title">
          <div className="journal-library__heading">
            <h2 id="articles-title">Find a thread to follow.</h2>
            <p>Choose a topic, or explore the whole collection.</p>
          </div>
          <nav className="journal-topics" aria-label="Writing topics">
            <a href="#articles" data-journal-topic="all">All writing</a>
            {blogTopics.map((topic) => <a key={topic.id} href={"#topic-" + topic.id} data-journal-topic={topic.id}>{topic.label}</a>)}
          </nav>
          <div className="journal-filter" data-journal-tag-control hidden>
            <label htmlFor="journal-focus">A closer focus</label>
            <select id="journal-focus" data-journal-tag disabled>
              <option value="">All focus areas</option>
              {tags.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
            </select>
            <a href="#articles" data-journal-reset>Clear filters</a>
          </div>
          <p className="journal-status" data-journal-status role="status" aria-live="polite" aria-atomic="true" />
          {blogTopics.map((topic) => (
            <section className="journal-topic" key={topic.id} id={"topic-" + topic.id} data-journal-group={topic.id} data-topic={topic.id} aria-labelledby={"topic-title-" + topic.id}>
              <header><h2 id={"topic-title-" + topic.id}>{topic.label}</h2><p>{topic.description}</p></header>
              <div className="journal-entries">
                {blogArticles.filter((article) => article.topic === topic.id).map((article) => (
                  <article className="journal-entry" key={article.slug} data-journal-entry data-journal-tags={JSON.stringify(article.tags)}>
                    <div className="journal-entry__art" aria-hidden="true" style={artStyle(artFor(article.slug))}>
                      <ArtDrawing direction={artFor(article.slug)} id={"preview-" + article.slug} compact />
                    </div>
                    <div className="journal-entry__copy">
                      <p className="journal-eyebrow">{article.project}</p>
                      <h3><a href={articlePath(article)}>{article.title} <span aria-hidden="true">↗</span></a></h3>
                      <p>{article.deck}</p>
                      <ul className="journal-tags" aria-label={"Topics in " + article.title}>{article.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          <div className="journal-empty" data-journal-empty hidden>
            <h3>Try a wider view.</h3>
            <p>No essay matches both of those choices. Clear the focus area or browse all writing.</p>
            <a href="#articles" data-journal-reset="empty">Show all writing</a>
          </div>
        </section>
        <section className="shell journal-cases" aria-labelledby="journal-cases-title">
          <h2 id="journal-cases-title">See the systems behind the ideas.</h2>
          <p>For the scope of a contribution and its direct source links, explore the full project stories.</p>
          <ul>
            {legacyEntryPoints.filter((entry) => entry.kind === "case").map((entry) => <li key={entry.id}><a href={entry.href}>{
              entry.id === "automated-security-helper" ? "Automated Security Helper" :
              entry.id === "cloudformation-guard" ? "CloudFormation Guard" :
              entry.id === "nix-windows" ? "Nix on Windows" : "Organizational agent systems"
            } <span aria-hidden="true">→</span></a></li>)}
          </ul>
        </section>
        <section className="shell journal-explanation" aria-labelledby="journal-explanation-title">
          <h2 id="journal-explanation-title">Read the idea. Follow it into the work.</h2>
          <p>The illustrations explain a design choice. Each essay links to the code, review, or documentation where that choice takes shape.</p>
          <EditorialBeat direction={sharedArt} beat={sharedArt.beats[0]} id="journal-explanation" />
        </section>
      </div>
    </RouteFrame>
  );
}
