/* eslint-disable @next/next/no-css-tags -- These static route bundles also work without JavaScript. */

export default function RouteStyles({ route }: { readonly route?: string }) {
  // Development uses editable originals so a CSS edit updates immediately.
  if (process.env.NODE_ENV === "production" && (route === "home" || route === "models" || route === "method")) {
    return <link rel="stylesheet" href={`/route-styles/${route}.css?v=20261003-loading`} precedence="portfolio" />;
  }
  return (
    <>
      <link rel="stylesheet" href="/portfolio-v2.css?v=20261003-palette" precedence="portfolio" />
      <link rel="stylesheet" href="/portfolio-v3.css?v=20261003-palette-contrast" precedence="portfolio" />
      <link rel="stylesheet" href="/interactions.css?v=20261003-palette" precedence="portfolio" />
    </>
  );
}
