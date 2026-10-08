import { notFound } from "next/navigation";
import ArticlePage from "../../components/blog/ArticlePage";
import { articleBySlug, articlePath, blogArticles } from "../../data/blog";
import { routeMetadata } from "../../data/route-metadata";

type Params = { readonly params: Promise<{ readonly slug: string }> };

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Params) {
  const article = articleBySlug((await params).slug);
  if (!article) return {};
  const metadata = routeMetadata(articlePath(article), article.title, article.deck);
  return { ...metadata, openGraph: { ...metadata.openGraph, type: "article" as const,
    authors: ["https://mh0pe.github.io/"] } };
}

export default async function Page({ params }: Params) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
