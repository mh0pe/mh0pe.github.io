import type { Metadata } from "next";
import { socialDescription, socialImageFor, socialOrigin, socialPage } from "./social";

export function routeMetadata(pathname: string, title: string, description: string): Metadata {
  const page = socialPage(pathname);
  const canonical = new URL(page.path, socialOrigin).toString();
  const pageTitle = page.title || `${title} | Madison Hope Steiner`;
  const socialImage = socialImageFor(pathname);
  description = socialDescription(pathname, description);
  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: pageTitle,
      description,
      type: "website",
      url: canonical,
      siteName: "Madison Hope Steiner | Open-Source Systems Portfolio",
      locale: "en_US",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [{ url: socialImage.url, alt: socialImage.alt }],
    },
  };
}
