(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const compactNavigation = matchMedia("(max-width: 48rem)");
  const progressTarget = document.querySelector(".site-header");
  const MOTION_FILM_SCROLL_IDLE_MS = 180;
  let motionFilmObservers = [];
  let motionFilmScrollActive = false;
  let motionFilmScrollIdleTimer = 0;

  function setCurrentLink(links, activeLink) {
    const changed = activeLink.getAttribute("aria-current") !== "location";
    for (const link of links) {
      if (link === activeLink) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
    const activeIndex = links.indexOf(activeLink);
    if (activeIndex >= 0 && progressTarget) {
      progressTarget.style.setProperty("--page-progress", String((activeIndex + 1) / links.length));
      progressTarget.toggleAttribute("data-page-progress", true);
    }
    if (
      changed &&
      compactNavigation.matches &&
      activeLink.closest(".case-jump")
    ) {
      activeLink.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  function observeLinkedSections(nav) {
    if (!("IntersectionObserver" in window)) return;

    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const entries = links
      .map((link) => {
        const id = decodeURIComponent(link.hash.slice(1));
        return { link, target: document.getElementById(id) };
      })
      .filter((entry) => entry.target);

    if (entries.length < 2) return;

    const visible = new Map();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          visible.set(change.target.id, {
            ratio: change.intersectionRatio,
            top: Math.abs(change.boundingClientRect.top),
          });
        }

        const active = entries
          .filter(({ target }) => visible.get(target.id)?.ratio > 0)
          .sort((a, b) => {
            const aState = visible.get(a.target.id);
            const bState = visible.get(b.target.id);
            return bState.ratio - aState.ratio || aState.top - bState.top;
          })[0];

        if (active) setCurrentLink(links, active.link);
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: [0, 0.1, 0.35, 0.65] },
    );

    for (const { target } of entries) observer.observe(target);
  }

  function observeJourney() {
    const rail = document.querySelector("[data-journey-rail]");
    if (!rail || !("IntersectionObserver" in window)) return;

    const links = [...rail.querySelectorAll("[data-journey-section]")];
    const sections = [...document.querySelectorAll("[data-home-section]")];
    const linkBySection = new Map(
      links.flatMap((link) =>
        link.dataset.journeySection
          .split(/\s+/)
          .filter(Boolean)
          .map((section) => [section, link]),
      ),
    );
    const visible = new Map();

    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          visible.set(change.target.dataset.homeSection, {
            ratio: change.intersectionRatio,
            top: Math.abs(change.boundingClientRect.top),
          });
        }

        const active = sections
          .filter((section) => visible.get(section.dataset.homeSection)?.ratio > 0)
          .sort((a, b) => {
            const aState = visible.get(a.dataset.homeSection);
            const bState = visible.get(b.dataset.homeSection);
            return bState.ratio - aState.ratio || aState.top - bState.top;
          })[0];

        const activeLink = active
          ? linkBySection.get(active.dataset.homeSection)
          : undefined;
        if (activeLink) setCurrentLink(links, activeLink);
      },
      { rootMargin: "-24% 0px -48% 0px", threshold: [0, 0.08, 0.25, 0.5] },
    );

    for (const section of sections) observer.observe(section);
  }

  function connectMobileNavigation(details) {
    const summary = details.querySelector("summary");
    const navigation = details.querySelector("nav");
    const desktopNavigation = matchMedia("(min-width: 58.001rem)");
    if (!summary || !navigation) return;

    function close({ returnFocus = false } = {}) {
      if (!details.open) return;
      details.open = false;
      if (returnFocus && !desktopNavigation.matches) {
        summary.focus({ preventScroll: true });
      }
    }

    details.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !details.open) return;
      event.preventDefault();
      close({ returnFocus: true });
    });

    details.addEventListener("focusout", (event) => {
      if (event.relatedTarget) {
        if (!details.contains(event.relatedTarget)) close();
        return;
      }
      // A null destination can expose a transient body focus during Tab.
      window.setTimeout(() => {
        if (!details.contains(document.activeElement)) close();
      }, 0);
    });

    navigation.addEventListener("click", (event) => {
      if (!event.target.closest?.("a[href]")) return;
      // Let the anchor's native activation finish before hiding its details tree.
      window.setTimeout(() => {
        if (!event.defaultPrevented) close({ returnFocus: true });
      }, 0);
    });

    document.addEventListener("pointerdown", (event) => {
      if (details.open && !details.contains(event.target)) close();
    });

    desktopNavigation.addEventListener("change", () => {
      if (!desktopNavigation.matches) return;
      const focusWasInside = details.contains(document.activeElement);
      close();
      if (focusWasInside) {
        document.querySelector(".site-identity")?.focus({ preventScroll: true });
      }
    });
  }

  function connectCapabilityAtlas(atlas) {
    const ledgerItems = [...atlas.querySelectorAll("[data-capability-id]")]
      .filter((item) => item.closest(".capability-atlas__ledger"));
    const nodes = [...atlas.querySelectorAll(".capability-atlas__node[data-capability-id]")];

    function activate(id) {
      atlas.dataset.activeCapability = id;
      for (const item of ledgerItems) {
        item.toggleAttribute("data-active", item.dataset.capabilityId === id);
      }
      for (const node of nodes) {
        node.toggleAttribute("data-active", node.dataset.capabilityId === id);
      }
    }

    for (const item of ledgerItems) {
      const details = item.querySelector("details");
      const id = item.dataset.capabilityId;
      if (!details || !id) continue;

      details.addEventListener("toggle", () => {
        if (details.open) activate(id);
      });
      item.addEventListener("focusin", () => activate(id));
      item.addEventListener("pointerenter", () => activate(id), { passive: true });
    }

    const initial = ledgerItems.find((item) => item.querySelector("details[open]"));
    if (initial?.dataset.capabilityId) activate(initial.dataset.capabilityId);

    function activateHash({ focus = false } = {}) {
      const id = decodeURIComponent(location.hash.slice(1));
      const item = id ? document.getElementById(id) : null;
      if (!item || !atlas.contains(item) || !item.matches("[data-capability-id]")) return;

      const details = item.querySelector("details");
      if (details) details.open = true;
      activate(item.dataset.capabilityId);
      if (focus) item.querySelector("summary")?.focus({ preventScroll: true });
    }

    activateHash();
    window.addEventListener("hashchange", () => activateHash({ focus: true }));
  }

  function observeCaseStages() {
    const stages = [...document.querySelectorAll("[data-case-stage]")];
    if (stages.length === 0 || !("IntersectionObserver" in window)) return;

    const visible = new Map();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          visible.set(change.target, {
            ratio: change.isIntersecting ? change.intersectionRatio : 0,
            top: Math.abs(change.boundingClientRect.top),
          });
        }

        const active = stages
          .filter((stage) => visible.get(stage)?.ratio > 0)
          .sort((a, b) => {
            const aState = visible.get(a);
            const bState = visible.get(b);
            return bState.ratio - aState.ratio || aState.top - bState.top;
          })[0];
        if (!active) return;

        for (const stage of stages) {
          stage.toggleAttribute("data-active", stage === active);
        }
        const activeStage = active.dataset.caseStage;
        document.querySelectorAll(".case-hero__signal .case-signal__terminal[data-stage]")
          .forEach((terminal) => {
            terminal.toggleAttribute("data-active", terminal.dataset.stage === activeStage);
          });
      },
      { rootMargin: "-22% 0px -52% 0px", threshold: [0.08, 0.3, 0.6] },
    );

    for (const stage of stages) observer.observe(stage);
  }

  function stopMotionFilmObservers() {
    for (const observer of motionFilmObservers) observer.disconnect();
    motionFilmObservers = [];
    for (const video of document.querySelectorAll("video[data-motion-film]")) {
      video.removeAttribute("data-motion-observed");
    }
  }

  function motionFilmPoster(video) {
    return video.parentElement?.querySelector("[data-motion-poster]");
  }

  function resetMotionFilmPresentation(video) {
    video.removeAttribute("data-motion-ready");
    motionFilmPoster(video)?.style.removeProperty("opacity");
  }

  function pauseMotionFilm(video) {
    resetMotionFilmPresentation(video);
    video.pause();
  }

  function motionFilmHasIntent(video) {
    return video.dataset.motionIntent === "true";
  }

  function motionFilmCanPlay(video) {
    return video.hasAttribute("data-motion-visible") || (
      motionFilmHasIntent(video) &&
      video.hasAttribute("data-motion-intersecting")
    );
  }

  function loadMotionFilm(video, { explicitIntent = false } = {}) {
    if (
      reduceMotion.matches ||
      navigator.connection?.saveData === true
    )
      return false;
    if (
      motionFilmScrollActive &&
      !explicitIntent &&
      !motionFilmHasIntent(video)
    )
      return false;
    if (video.dataset.motionFailed === "true" && !explicitIntent) return false;
    if (video.dataset.motionLoaded === "true") return true;
    delete video.dataset.motionFailed;
    video.dataset.motionLoaded = "true";
    for (const source of video.querySelectorAll("source[data-src]")) {
      source.src = source.dataset.src;
    }
    video.load();
    return true;
  }

  function playMotionFilm(video, { explicitIntent = false } = {}) {
    const saveData = navigator.connection?.saveData === true;
    if (!video.hasAttribute("data-autoplay")) return;
    if (video.dataset.motionFailed === "true") return;
    if (video.ended && !explicitIntent) return;
    if (
      motionFilmScrollActive &&
      !explicitIntent &&
      !motionFilmHasIntent(video)
    ) {
      video.pause();
      return;
    }
    if (
      reduceMotion.matches ||
      document.hidden ||
      saveData ||
      !motionFilmCanPlay(video)
    ) {
      pauseMotionFilm(video);
      return;
    }
    if (video.dataset.motionStarted !== "true") {
      video.currentTime = 0;
      video.dataset.motionStarted = "true";
    }
    const playback = video.play();
    if (playback && "catch" in playback) {
      playback.catch(() => pauseMotionFilm(video));
    }
  }

  function requestMotionFilm(video) {
    video.dataset.motionIntent = "true";
    if (!loadMotionFilm(video, { explicitIntent: true })) return;
    video.currentTime = 0;
    delete video.dataset.motionStarted;
    if (video.readyState >= 2) playMotionFilm(video, { explicitIntent: true });
  }

  function bindMotionFilm(video) {
    if (video.dataset.motionEventsBound === "true") return;
    video.dataset.motionEventsBound = "true";

    const onMediaError = () => {
      if (video.dataset.motionLoaded !== "true") return;
      pauseMotionFilm(video);
      delete video.dataset.motionLoaded;
      delete video.dataset.motionStarted;
      delete video.dataset.motionIntent;
      video.dataset.motionFailed = "true";
      const control = video.closest(".motion-film")?.querySelector("[data-motion-play]");
      if (control) control.textContent = "Retry animation";
    };
    video.addEventListener("error", onMediaError);
    for (const source of video.querySelectorAll("source[data-src]")) {
      source.addEventListener("error", onMediaError);
    }
    video.addEventListener("loadeddata", () => playMotionFilm(video));
    video.addEventListener("seeked", () => {
      if (motionFilmHasIntent(video) && video.readyState >= 2) playMotionFilm(video);
    });
    video.addEventListener("playing", () => {
      if (video.dataset.motionFailed === "true") {
        pauseMotionFilm(video);
        return;
      }
      if (motionFilmScrollActive && !motionFilmHasIntent(video)) {
        video.pause();
        return;
      }
      if (
        reduceMotion.matches ||
        document.hidden ||
        navigator.connection?.saveData === true ||
        !motionFilmCanPlay(video)
      ) {
        pauseMotionFilm(video);
        return;
      }

      const poster = motionFilmPoster(video);
      if (poster) poster.style.opacity = "1";
      video.toggleAttribute("data-motion-ready", true);
      const control = video.closest(".motion-film")?.querySelector("[data-motion-play]");
      if (control) control.textContent = "Replay animation";
    });
    video.addEventListener("transitionend", (event) => {
      if (
        event.propertyName !== "opacity" ||
        !video.hasAttribute("data-motion-ready")
      )
        return;
      motionFilmPoster(video)?.style.removeProperty("opacity");
    });
    video.closest(".motion-film")?.querySelector("[data-motion-play]")
      ?.addEventListener("click", () => requestMotionFilm(video));
  }

  function resumeMotionFilmsAfterScroll() {
    motionFilmScrollActive = false;
    motionFilmScrollIdleTimer = 0;
    if (
      reduceMotion.matches ||
      document.hidden ||
      navigator.connection?.saveData === true
    )
      return;

    for (const video of document.querySelectorAll("video[data-motion-film]")) {
      if (
        video.hasAttribute("data-motion-preload-visible") ||
        video.hasAttribute("data-motion-visible")
      ) {
        loadMotionFilm(video);
      }
      if (
        motionFilmCanPlay(video) &&
        video.readyState >= 2
      ) {
        playMotionFilm(video);
      }
    }
  }

  function beginMotionFilmScroll() {
    if (!motionFilmScrollActive) {
      motionFilmScrollActive = true;
      for (const video of document.querySelectorAll("video[data-motion-film]")) {
        video.removeAttribute("data-motion-intent");
        video.pause();
      }
    }
    clearTimeout(motionFilmScrollIdleTimer);
    motionFilmScrollIdleTimer = window.setTimeout(
      resumeMotionFilmsAfterScroll,
      MOTION_FILM_SCROLL_IDLE_MS,
    );
  }

  function syncMotionMedia() {
    const staticMedia = reduceMotion.matches || navigator.connection?.saveData === true;
    if (staticMedia) stopMotionFilmObservers();
    for (const video of document.querySelectorAll("video[data-motion-film]")) {
      bindMotionFilm(video);
      const control = video.closest(".motion-film")?.querySelector("[data-motion-play]");
      if (control) control.hidden = staticMedia;
      if (staticMedia) {
        pauseMotionFilm(video);
        video.removeAttribute("autoplay");
        video.removeAttribute("data-motion-visible");
        video.removeAttribute("data-motion-intersecting");
        video.removeAttribute("data-motion-intent");
      }
    }
    root.toggleAttribute("data-reduced-motion", reduceMotion.matches);
  }

  function observeMotionFilms() {
    const saveData = navigator.connection?.saveData === true;
    const films = [...document.querySelectorAll("video[data-motion-film]")];
    for (const film of films) bindMotionFilm(film);
    if (
      films.length === 0 ||
      reduceMotion.matches ||
      saveData ||
      document.hidden
    )
      return;
    if (motionFilmObservers.length > 0) return;

    if (!("IntersectionObserver" in window)) {
      for (const film of films) {
        film.toggleAttribute("data-motion-intersecting", true);
        film.toggleAttribute("data-motion-visible", true);
        if (loadMotionFilm(film) && film.readyState >= 2) playMotionFilm(film);
      }
      return;
    }

    const preloadObserver = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          const video = change.target;
          if (change.isIntersecting) {
            video.toggleAttribute("data-motion-preload-visible", true);
            if (loadMotionFilm(video)) {
              video.removeAttribute("data-motion-preload-visible");
              preloadObserver.unobserve(video);
            }
          } else {
            video.removeAttribute("data-motion-preload-visible");
          }
        }
      },
      { rootMargin: "65% 0px", threshold: 0 },
    );

    const playbackObserver = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          const video = change.target;
          if (reduceMotion.matches || document.hidden) {
            video.removeAttribute("data-motion-visible");
            video.removeAttribute("data-motion-intersecting");
            video.removeAttribute("data-motion-intent");
            pauseMotionFilm(video);
            continue;
          }
          const intersecting = change.isIntersecting && change.intersectionRatio > 0;
          video.toggleAttribute("data-motion-intersecting", intersecting);
          if (!intersecting) video.removeAttribute("data-motion-intent");
          const visible = intersecting && change.intersectionRatio >= 0.55;
          video.toggleAttribute("data-motion-visible", visible);
          if (motionFilmCanPlay(video)) {
            if (loadMotionFilm(video) && video.readyState >= 2) playMotionFilm(video);
          } else {
            pauseMotionFilm(video);
          }
        }
      },
      { rootMargin: "-4% 0px", threshold: [0, 0.35, 0.55, 0.75] },
    );
    motionFilmObservers = [preloadObserver, playbackObserver];

    for (const film of films) {
      if (film.dataset.motionObserved === "true") continue;
      film.dataset.motionObserved = "true";
      preloadObserver.observe(film);
      playbackObserver.observe(film);
    }
  }

  function connectLineageFields() {
    for (const field of document.querySelectorAll("[data-lineage-field]")) {
      const tooltip = field.querySelector("[data-lineage-tooltip]");
      if (!tooltip) continue;
      const fallback = tooltip.textContent;

      const show = (target) => {
        if (!(target instanceof Element)) return;
        const source = target.closest("[data-lineage-label]");
        if (source && field.contains(source)) tooltip.textContent = source.dataset.lineageLabel;
      };
      const reset = (event) => {
        if (!field.contains(event.relatedTarget)) tooltip.textContent = fallback;
      };

      field.addEventListener("pointerover", (event) => show(event.target));
      field.addEventListener("focusin", (event) => show(event.target));
      field.addEventListener("pointerout", reset);
      field.addEventListener("focusout", reset);
    }
  }

  function connectContributionArt() {
    const scenes = [...document.querySelectorAll("[data-contribution-sculpture], [data-visualization='hope-line'], [data-lineage-field]")];
    if (!scenes.length) return;
    const syncVisibility = () => root.toggleAttribute("data-page-hidden", document.hidden);
    const syncPreference = () => root.toggleAttribute("data-art-static", reduceMotion.matches || navigator.connection?.saveData === true);
    syncVisibility();
    syncPreference();
    document.addEventListener("visibilitychange", syncVisibility);
    reduceMotion.addEventListener("change", syncPreference);
    navigator.connection?.addEventListener?.("change", syncPreference);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((changes) => {
        for (const change of changes) change.target.toggleAttribute("data-art-suspended", !change.isIntersecting);
      });
      for (const scene of scenes) observer.observe(scene);
    }
    const activate = (id) => {
      for (const scene of scenes) {
        scene.toggleAttribute("data-contribution-focus", Boolean(id));
        for (const cluster of scene.querySelectorAll("[data-graph-id]")) {
          cluster.toggleAttribute("data-active-project", cluster.dataset.graphId === id);
        }
      }
    };
    let focusedProject = null;
    let hoveredProject = null;
    for (const item of document.querySelectorAll(".hope-line__index-item")) {
      item.addEventListener("pointerenter", () => {
        hoveredProject = item.dataset.graphId;
        activate(hoveredProject);
      }, { passive: true });
      item.addEventListener("focusin", () => {
        focusedProject = item.dataset.graphId;
        activate(focusedProject);
      });
      item.addEventListener("pointerleave", () => {
        hoveredProject = null;
        activate(focusedProject);
      });
      item.addEventListener("focusout", (event) => {
        if (!item.contains(event.relatedTarget)) {
          focusedProject = null;
          activate(hoveredProject);
        }
      });
    }
  }

  function connectCapabilityStories() {
    if (typeof Element.prototype.animate !== "function") return;
    for (const stack of document.querySelectorAll("[data-stack-assembly]")) {
      const story = stack.closest("[data-capability-story]");
      const button = story?.querySelector("[data-cap-replay]");
      let animations = [];
      let entered = false;
      let visible = false;
      const stop = () => {
        for (const animation of animations) animation.cancel();
        animations = [];
      };
      const allowed = () => !reduceMotion.matches && !document.hidden && navigator.connection?.saveData !== true;
      const assemble = (selectionOnly = false) => {
        stop();
        if (!allowed() || !visible) return;
        const value = story?.querySelector(".cap-history input:checked")?.value;
        const currentView = /^[0-2]$/.test(value || "") ? stack.querySelector(`[data-change="${value}"]`) : null;
        const pieces = (currentView || stack).querySelectorAll(".cap-piece");
        animations = [...pieces].map((piece) => {
          const x = Number.parseFloat(piece.style.getPropertyValue("--assemble-x")) || 0;
          const y = Number.parseFloat(piece.style.getPropertyValue("--assemble-y")) || 0;
          const order = Number.parseFloat(piece.style.getPropertyValue("--assemble-order")) || 0;
          const animation = piece.animate([
            { transform: `translate(${x}px,${y}px)`, opacity: 0.3, visibility: "visible" },
            { transform: "translate(0px,0px)", opacity: 1, visibility: piece.hasAttribute("data-internal") ? "hidden" : "visible" },
          ], { duration: 850, delay: selectionOnly ? 0 : order * 65, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
          animation.onfinish = () => { animations = animations.filter((item) => item !== animation); };
          return animation;
        });
      };
      const sync = () => {
        if (button) button.hidden = !allowed();
        if (!allowed()) stop();
      };
      button?.addEventListener("click", () => assemble());
      // Native radios and CSS own the selected state even without this script.
      story?.addEventListener("change", () => assemble(true));
      document.querySelector(".cap-projects")?.addEventListener("change", () => {
        stop();
        // Refresh both directions even if rapid switching skips an observer event.
        if (story) {
          const bounds = stack.getBoundingClientRect();
          visible = bounds.width > 0 && bounds.height > 0 && bounds.top < window.innerHeight && bounds.bottom > 0;
        }
      });
      reduceMotion.addEventListener("change", sync);
      navigator.connection?.addEventListener?.("change", sync);
      document.addEventListener("visibilitychange", sync);
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
            if (!visible) stop();
            else if (!entered) { entered = true; assemble(); }
          }
        }, { threshold: [0, 0.2] });
        observer.observe(stack);
      } else {
        visible = true;
      }
      sync();
    }
  }

  function observeLivingArt() {
    const art = [...document.querySelectorAll("[data-lineage-field], [data-visualization='hope-line'], [data-motion-once], .hope-hero")];
    if (art.length === 0) return;
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      for (const item of art) item.toggleAttribute("data-motion-entered", true);
      return;
    }

    const observer = new IntersectionObserver((changes) => {
      for (const change of changes) {
        if (!change.isIntersecting) continue;
        change.target.toggleAttribute("data-motion-entered", true);
        observer.unobserve(change.target);
      }
    }, { rootMargin: "-8% 0px", threshold: 0.28 });

    for (const item of art) observer.observe(item);
  }

  for (const nav of document.querySelectorAll(".case-jump, .route-jump")) {
    observeLinkedSections(nav);
  }
  for (const details of document.querySelectorAll(".mobile-nav")) {
    connectMobileNavigation(details);
  }
  for (const atlas of document.querySelectorAll(".capability-atlas")) {
    connectCapabilityAtlas(atlas);
  }
  observeJourney();
  observeCaseStages();
  connectLineageFields();
  connectContributionArt();
  connectCapabilityStories();
  observeLivingArt();
  syncMotionMedia();
  if (document.querySelectorAll("video[data-motion-film]").length > 0) {
    window.addEventListener("scroll", beginMotionFilmScroll, { passive: true });
  }
  observeMotionFilms();
  function syncMotionPreference() {
    syncMotionMedia();
    observeMotionFilms();
  }
  reduceMotion.addEventListener("change", syncMotionPreference);
  navigator.connection?.addEventListener?.("change", syncMotionPreference);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) observeMotionFilms();
    for (const video of document.querySelectorAll("video[data-motion-film]")) {
      if (document.hidden) {
        pauseMotionFilm(video);
      } else if (
        video.hasAttribute("data-motion-visible") &&
        !video.ended &&
        !reduceMotion.matches &&
        navigator.connection?.saveData !== true
      ) {
        playMotionFilm(video);
      }
    }
  });
})();
