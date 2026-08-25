import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

/* eslint-disable @next/next/no-css-tags -- Vinext dev serves imported global CSS as a JavaScript module. */

const title = "Madison Hope Steiner | Principal AI Architect Portfolio";
const description =
  "Public systems portfolio of Principal AI Architect Madison Hope Steiner (mh0pe / awsmadi): distributed systems, AI infrastructure, security, and cloud platforms.";
const siteName = "Madison Hope Steiner — Open-Source Systems Portfolio";
const canonicalUrl = "https://mh0pe.github.io/";
const profileUrls = [
  "https://github.com/mh0pe",
  "https://github.com/awsmadi",
  "https://www.linkedin.com/in/madisonhsteiner",
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${canonicalUrl}#madison-hope-steiner`,
      name: "Madison Hope Steiner",
      alternateName: ["Madison Steiner", "mh0pe", "awsmadi"],
      url: canonicalUrl,
      image: `${canonicalUrl}og-v3.jpg`,
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
      "@type": "ProfilePage",
      "@id": `${canonicalUrl}#profile-page`,
      url: canonicalUrl,
      name: siteName,
      description,
      about: { "@id": `${canonicalUrl}#madison-hope-steiner` },
      mainEntity: { "@id": `${canonicalUrl}#madison-hope-steiner` },
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
  const socialImage = new URL("/og-v3.jpg", origin).toString();

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
    authors: [
      { name: "Madison Hope Steiner", url: canonicalUrl },
      { name: "mh0pe", url: "https://github.com/mh0pe" },
      { name: "awsmadi", url: "https://github.com/awsmadi" },
    ],
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
      url: origin,
      siteName,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "Distributed systems, production AI infrastructure, security controls, and agent orchestration",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#091217",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <link
          rel="stylesheet"
          href="/portfolio.css?v=20260825-identity-ux-v2"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
