/* eslint-disable @next/next/no-html-link-for-pages -- native anchors keep the exported GitHub Pages build free of RSC navigation requests. */

const navigation = [
  { key: "work", label: "Work", href: "/work/" },
  { key: "capabilities", label: "How I help", href: "/capabilities/" },
  { key: "decisions", label: "Decisions", href: "/decisions/" },
  { key: "about", label: "Experience", href: "/about/" },
  { key: "proof", label: "Evidence", href: "/proof/" },
] as const;

function NavigationLinks({ current, activeSection }: { readonly current?: string; readonly activeSection?: string }) {
  return (
    <>
      {navigation.map((item) => (
        <a
          href={item.href}
          key={item.href}
          aria-current={current === item.key ? "location" : undefined}
          data-active-section={activeSection === item.key ? "true" : undefined}
        >
          {item.label}
        </a>
      ))}
      <a
        className="primary-nav__conversation"
        href="https://www.linkedin.com/in/madisonhsteiner"
        target="_blank"
        rel="noreferrer"
      >
        Connect<span className="visually-hidden"> with Madison Hope Steiner on LinkedIn, opens in a new tab</span>
      </a>
    </>
  );
}

export function ThemeToggle() {
  return (
    <button
      className="theme-toggle"
      type="button"
      data-theme-toggle
      aria-label="Toggle color theme"
      suppressHydrationWarning
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g className="theme-toggle__sun">
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M19.07 4.93l-1.56 1.56M6.49 17.51l-1.56 1.56" />
        </g>
        <path className="theme-toggle__moon" d="M18.8 15.4A7.7 7.7 0 0 1 8.6 5.2 7.8 7.8 0 1 0 18.8 15.4Z" />
      </svg>
      <span>Theme</span>
    </button>
  );
}

export default function SiteHeader({ current, activeSection }: { readonly current?: string; readonly activeSection?: string }) {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <a className="site-identity" href="/" aria-label="Madison Hope Steiner, home">
          <span className="site-identity__mark" aria-hidden="true">M<span>H</span>S</span>
          <span className="site-identity__name">Madison <em>Hope</em> Steiner</span>
          <small>Principal AI Architect</small>
        </a>

        <nav className="primary-nav" aria-label="Primary navigation">
          <NavigationLinks current={current} activeSection={activeSection} />
        </nav>

        <ThemeToggle />

        <details className="mobile-nav">
          <summary>
            <span>Menu</span>
            <span className="mobile-nav__glyph" aria-hidden="true"><i /><i /></span>
          </summary>
          <nav aria-label="Mobile navigation">
            <NavigationLinks current={current} activeSection={activeSection} />
          </nav>
        </details>
      </div>
    </header>
  );
}
