/* eslint-disable @next/next/no-css-tags -- The journal remains styled without JavaScript. */
export default function BlogLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/journal.css?v=20261007-editorial-art" precedence="journal" />
      <link rel="stylesheet" href="/editorial-art.css?v=20261007-editorial-art" precedence="editorial-art" />
      <script data-static-runtime="journal" src="/journal.js?v=20261007-editorial-art" defer />
      {children}
    </>
  );
}
