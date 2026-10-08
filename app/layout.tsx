import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { preload } from "react-dom";
import { socialImageFor } from "./data/social";

const title = "Madison Hope Steiner | Principal AI Architect";
const description =
  "Principal AI Architect Madison Hope Steiner (mh0pe, awsmadi) helps teams govern, ship, and scale AI, security, cloud, and developer systems.";
const siteName = "Madison Hope Steiner | Open-Source Systems Portfolio";
const canonicalUrl = "https://mh0pe.github.io/";
const profileUrls = [
  "https://github.com/mh0pe",
  "https://github.com/awsmadi",
  "https://www.linkedin.com/in/madisonhsteiner",
  "https://www.credly.com/users/madisonhsteiner",
] as const;

const themeBootstrap = `(() => {
  let saved = null;
  try {
    const candidate = localStorage.getItem("mhs-color-theme");
    saved = candidate === "light" || candidate === "dark" ? candidate : null;
  } catch {}
  const theme = saved ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${canonicalUrl}#madison-hope-steiner`,
      name: "Madison Hope Steiner",
      alternateName: ["Madison Steiner", "mh0pe", "awsmadi"],
      url: canonicalUrl,
      image: `${canonicalUrl}portraits/madison-outdoor-720.webp`,
      jobTitle: "Principal AI Architect",
      description,
      sameAs: profileUrls,
      knowsAbout: [
        "Distributed systems",
        "AI infrastructure",
        "Cloud architecture",
        "Security engineering",
        "Agent orchestration",
        "Model Context Protocol",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${canonicalUrl}#website`,
      url: canonicalUrl,
      name: siteName,
      description,
      author: { "@id": `${canonicalUrl}#madison-hope-steiner` },
      publisher: { "@id": `${canonicalUrl}#madison-hope-steiner` },
    },
  ],
};

function configuredSiteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) {
    return null;
  }

  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      )
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const localHost =
    host?.match(/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/)?.[0] ?? null;
  const origin =
    configuredSiteOrigin() ??
    (localHost ? `http://${localHost}` : "https://mh0pe.github.io");
  const socialImage = socialImageFor("/");

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    authors: [{ name: "Madison Hope Steiner", url: canonicalUrl }],
    creator: "Madison Hope Steiner",
    publisher: "Madison Hope Steiner",
    category: "Technology",
    keywords: [
      "Madison Hope Steiner",
      "mh0pe",
      "awsmadi",
      "Principal AI Architect",
      "distributed systems",
      "AI infrastructure",
      "security engineering",
      "cloud architecture",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      url: new URL("/", origin).toString(),
      siteName,
      locale: "en_US",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage.url, alt: socialImage.alt }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preload("/fonts/instrument-sans-variable.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  preload("/fonts/newsreader-variable.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          data-static-runtime="theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <script data-static-runtime="theme" src="/theme.js?v=20261003-palette" defer />
        <script data-static-runtime="interactions" src="/interactions.js?v=20260930-clarity" defer />
      </head>
      <body className="hope-brand">{children}</body>
    </html>
  );
}
