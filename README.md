# Bringing Hope to distributed systems at enterprise scale

A public systems portfolio for Principal AI Architect Madison Steiner, grounded in the public GitHub histories of `mh0pe` and `awsmadi` and career context from Madison’s LinkedIn profile.

The site leads with work delivered, capability, and impact. Public forks are presented as usable extensions that provide capabilities their upstream projects do not yet have; repository adoption state remains supporting provenance rather than the organizing narrative. Selected work links directly to public GitHub evidence, employment is distinguished from consulting context, and selected consulting clients remain indirect.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build:pages
npm test
npm audit
```

## Deployment

The site is deployed to [mh0pe.github.io](https://mh0pe.github.io) from the
`main` branch through GitHub Pages. The deployment workflow builds Vinext,
renders the Worker output into static HTML, validates every local asset, and
uploads only the browser-facing artifact.

```bash
NEXT_PUBLIC_SITE_URL=https://mh0pe.github.io npm run build:pages
```

The source code is ISC-licensed. Third-party names and logos remain the
property of their respective owners and are included only to identify
professional history.
