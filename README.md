# Bringing Hope to distributed systems at enterprise scale

A public systems portfolio for Principal AI Architect Madison Hope Steiner, grounded in the public GitHub histories of `mh0pe` and `awsmadi` and professional context from Madison’s LinkedIn profile.

The site uses a six-part path: Pressure → Constraint → Decision → Implementation → State → Source. It leads with what teams can now do, keeps availability separate from upstream adoption, and lets readers open the exact release, pull request, branch, repository, or documentation behind each supportable claim.

Primary routes:

- `/work/` and four deep system cases
- `/proof/` for the public work, status language, and optional model context
- `/decisions/` and `/method/` for the architecture grammar
- `/capabilities/` for the nine-system atlas
- `/about/` for career and organizational context

The homepage is static-first. Its living-system illustrations are complete in the HTML and use short, one-time motion only when they enter the viewport.

## Browser acceptance

```bash
npm ci
npm run build:pages
npm run preview:pages
```

Use `npm run dev` only while changing source. The static preview above is the acceptance path and avoids development-only module loading.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build:pages
npm test
npm audit
```

## Deployment

The published site at [mh0pe.github.io](https://mh0pe.github.io) deploys from
`main` through GitHub Pages. The workflow builds Vinext, renders every
canonical route into static HTML, validates local references and metadata, and
uploads only the browser-facing artifact.

```bash
NEXT_PUBLIC_SITE_URL=https://mh0pe.github.io npm run build:pages
```

The source code is ISC-licensed. Professional context is self-reported and does
not imply employer endorsement. The site is personal and does not speak for
any current or former employer.
