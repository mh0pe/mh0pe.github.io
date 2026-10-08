import pages from "./social-pages.json";
import { articleBySlug } from "./blog";

export const socialOrigin = "https://mh0pe.github.io";
export type SocialPage = {
  path: string; image: string; title: string; lines: string[]; label: string; art: string; alt: string;
};

export function socialPage(pathname: string): SocialPage {
  const path = pathname === "/" || pathname === "/404.html" ? pathname : pathname.replace(/\/$/, "") + "/";
  const entry = pages.find((page) => page.path === path);
  if (!entry) throw new Error("Missing social page: " + path);
  if (entry.alias) return socialPage(entry.alias);
  if (!entry.image || !entry.title || !entry.lines || !entry.label || !entry.art || !entry.alt) {
    throw new Error("Incomplete social page: " + path);
  }
  return entry as SocialPage;
}

export function socialImageFor(pathname: string) {
  const page = socialPage(pathname);
  return { url: `${socialOrigin}/social/${page.image}.jpg`, width: 1200, height: 630, alt: page.alt, type: "image/jpeg" };
}

export function socialImageData(pathname: string) {
  const image = socialImageFor(pathname);
  return { "@type": "ImageObject", url: image.url, contentUrl: image.url, width: image.width, height: image.height, caption: image.alt };
}

export function socialDescription(pathname: string, fallback: string) {
  const page = socialPage(pathname);
  const slug = page.path.match(/^\/blog\/([^/]+)\/$/)?.[1];
  return slug ? articleBySlug(slug)?.deck ?? fallback : fallback;
}
