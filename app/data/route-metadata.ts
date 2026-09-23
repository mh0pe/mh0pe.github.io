import type { Metadata } from "next";

const socialImage = {
  url: "https://mh0pe.github.io/og-v3.jpg",
  width: 1200,
  height: 630,
  alt: "Madison Hope Steiner, Principal AI Architect and open-source systems builder",
};

export function routeMetadata(pathname: string, title: string, description: string): Metadata {
  const canonical = new URL(pathname, "https://mh0pe.github.io/").toString();
  return {
    title: `${title} | Madison Hope Steiner`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: "Madison Hope Steiner | Open-Source Systems Portfolio",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
  };
}
