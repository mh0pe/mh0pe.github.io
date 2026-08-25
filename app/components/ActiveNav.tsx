"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactNode,
} from "react";

type HashHref = `#${string}`;

export type ActiveNavItem = Readonly<{
  href: HashHref;
  label: ReactNode;
  /**
   * Additional section IDs that should activate this link. This lets one
   * navigation label represent a group of related sections without adding
   * more items to a compact header.
   */
  sectionIds?: readonly string[];
  linkProps?: Omit<
    ComponentPropsWithoutRef<"a">,
    "aria-current" | "children" | "href"
  >;
}>;

export type ActiveNavProps = Omit<
  ComponentPropsWithoutRef<"nav">,
  "children"
> & {
  items: readonly ActiveNavItem[];
  linkClassName?: string;
  activeLinkClassName?: string;
  /**
   * A narrow observation band makes the section crossing the reader's
   * scanning line active, rather than whichever large section occupies the
   * most viewport area.
   */
  rootMargin?: string;
};

function normalizeSectionId(value: string): string {
  const withoutHash = value.startsWith("#") ? value.slice(1) : value;

  try {
    return decodeURIComponent(withoutHash);
  } catch {
    return withoutHash;
  }
}

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string | undefined {
  const className = values.filter(Boolean).join(" ");
  return className || undefined;
}

export function ActiveNav({
  items,
  linkClassName,
  activeLinkClassName,
  rootMargin = "-24% 0px -65% 0px",
  ...navProps
}: ActiveNavProps) {
  const [activeHref, setActiveHref] = useState<HashHref | null>(null);

  const observedSections = useMemo(
    () =>
      items.map((item) => ({
        href: item.href,
        ids: Array.from(
          new Set([
            normalizeSectionId(item.href),
            ...(item.sectionIds ?? []).map(normalizeSectionId),
          ]),
        ),
      })),
    [items],
  );

  useEffect(() => {
    const hrefBySectionId = new Map<string, HashHref>();
    const targetBySectionId = new Map<string, HTMLElement>();

    for (const item of observedSections) {
      for (const id of item.ids) {
        const target = document.getElementById(id);

        if (target && !hrefBySectionId.has(id)) {
          hrefBySectionId.set(id, item.href);
          targetBySectionId.set(id, target);
        }
      }
    }

    const syncFromLocation = () => {
      const sectionId = normalizeSectionId(window.location.hash);
      setActiveHref(hrefBySectionId.get(sectionId) ?? null);
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);

    if (
      targetBySectionId.size === 0 ||
      !("IntersectionObserver" in window)
    ) {
      return () => {
        window.removeEventListener("hashchange", syncFromLocation);
        window.removeEventListener("popstate", syncFromLocation);
      };
    }

    const visibleEntries = new Map<Element, IntersectionObserverEntry>();
    const observedTargets = Array.from(
      new Set(targetBySectionId.values()),
    ).sort((left, right) => {
      const position = left.compareDocumentPosition(right);

      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }

      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }

      return 0;
    });
    const firstTarget = observedTargets[0];
    const lastTarget = observedTargets.at(-1);
    let observer: IntersectionObserver;

    try {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visibleEntries.set(entry.target, entry);
            } else {
              visibleEntries.delete(entry.target);
            }
          }

          const activationLine = window.innerHeight * 0.24;
          const nearestEntry = Array.from(visibleEntries.values()).sort(
            (left, right) =>
              Math.abs(left.boundingClientRect.top - activationLine) -
              Math.abs(right.boundingClientRect.top - activationLine),
          )[0];

          if (nearestEntry) {
            const href = hrefBySectionId.get(nearestEntry.target.id);
            if (href) {
              setActiveHref(href);
            }
          } else {
            const beforeFirstTarget =
              firstTarget &&
              firstTarget.getBoundingClientRect().top > activationLine;
            const afterLastTarget =
              lastTarget &&
              lastTarget.getBoundingClientRect().bottom < activationLine;

            if (beforeFirstTarget || afterLastTarget) {
              setActiveHref(null);
            }
          }
        },
        {
          root: null,
          rootMargin,
          threshold: 0,
        },
      );
    } catch {
      return () => {
        window.removeEventListener("hashchange", syncFromLocation);
        window.removeEventListener("popstate", syncFromLocation);
      };
    }

    for (const target of observedTargets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [observedSections, rootMargin]);

  return (
    <nav {...navProps}>
      {items.map((item) => {
        const isActive = activeHref === item.href;
        const {
          className: itemClassName,
          onClick,
          ...linkProps
        } = item.linkProps ?? {};

        return (
          <a
            {...linkProps}
            key={item.href}
            href={item.href}
            className={joinClassNames(
              linkClassName,
              itemClassName,
              isActive && activeLinkClassName,
            )}
            aria-current={isActive ? "location" : undefined}
            data-active={isActive ? "true" : undefined}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              onClick?.(event);

              if (!event.defaultPrevented) {
                setActiveHref(item.href);
              }
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
