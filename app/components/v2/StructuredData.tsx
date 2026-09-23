import type { PublicCredential } from "../../data/credentials";

const siteUrl = "https://mh0pe.github.io";
const personId = `${siteUrl}/#madison-hope-steiner`;

export function StructuredData({ value }: { readonly value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function ProfilePageData() {
  return (
    <StructuredData
      value={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${siteUrl}/#profile-page`,
        url: `${siteUrl}/`,
        name: "Madison Hope Steiner | Principal AI Architect",
        about: { "@id": personId },
        mainEntity: { "@id": personId },
      }}
    />
  );
}

export function CollectionPageData({
  path,
  name,
  description,
}: {
  readonly path: string;
  readonly name: string;
  readonly description: string;
}) {
  const url = new URL(path, `${siteUrl}/`).toString();
  return (
    <StructuredData
      value={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name,
        description,
        author: { "@id": personId },
      }}
    />
  );
}

export function CredentialListData({
  credentials,
}: {
  readonly credentials: readonly PublicCredential[];
}) {
  return (
    <StructuredData
      value={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": `${siteUrl}/credentials/#earned-credentials`,
        name: "Credentials earned by Madison Hope Steiner",
        numberOfItems: credentials.length,
        itemListElement: credentials.map((credential, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: credential.href,
          item: {
            "@type": "EducationalOccupationalCredential",
            name: credential.name,
            identifier: credential.id,
            dateCreated: credential.issuedDate,
            recognizedBy: {
              "@type": "Organization",
              name: credential.issuer,
            },
            url: credential.href,
          },
        })),
      }}
    />
  );
}

export function CaseStudyData({
  path,
  title,
  description,
  sources,
}: {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly sources: readonly string[];
}) {
  const url = new URL(path, `${siteUrl}/`).toString();
  return (
    <StructuredData
      value={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            "@id": `${url}#case-study`,
            headline: title,
            description,
            url,
            author: { "@id": personId },
            citation: sources,
            isPartOf: { "@id": `${siteUrl}/work/#collection` },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
              { "@type": "ListItem", position: 2, name: "Work", item: `${siteUrl}/work/` },
              { "@type": "ListItem", position: 3, name: title, item: url },
            ],
          },
        ],
      }}
    />
  );
}
