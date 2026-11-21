/* eslint-disable @next/next/no-css-tags -- These static route bundles also work without JavaScript. */
import routeStyleVersions from "../../data/route-style-versions.json";

export default function RouteStyles({ route }: { readonly route?: string }) {
  // Development uses editable originals so a CSS edit updates immediately.
  if (process.env.NODE_ENV === "production" && route && Object.hasOwn(routeStyleVersions, route)) {
    const version = routeStyleVersions[route as keyof typeof routeStyleVersions];
    if (!/^[a-f0-9]{64}$/.test(version)) throw new Error(`Missing stylesheet identity: ${route}`);
    return <link rel="stylesheet" href={`/route-styles/${route}.css?v=${version}`} precedence="portfolio" />;
  }
  return (
    <>
      <link rel="stylesheet" href="/portfolio-v2.css?v=20261003-palette" precedence="portfolio" />
      <link rel="stylesheet" href="/portfolio-v3.css?v=20261003-palette-contrast" precedence="portfolio" />
      <link rel="stylesheet" href="/journey-polish.css?v=20261010-journey" precedence="portfolio" />
      <link rel="stylesheet" href="/interactions.css?v=20261003-palette" precedence="portfolio" />
      <link rel="stylesheet" href="/editorial-system.css?v=20261022-editorial" precedence="portfolio" />
    </>
  );
}
