(() => {
  "use strict";
  const article = document.querySelector("[data-motion-story]");
  if (!article) return;
  const stages = [...article.querySelectorAll("[data-story-stage]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = matchMedia("(forced-colors: active)");
  const connection = navigator.connection;
  let quiet = false, failed = false, imported = false, loading = false;
  let active = null, handle = null, scheduled = 0, lastFrame = -1;
  const visible = new Set();
  const allowed = () => !quiet && !failed && !reduced.matches && !colors.matches && !connection?.saveData && !document.hidden;
  const clamp = (n, low = 0, high = 1) => Math.min(high, Math.max(low, n));
  const ease = t => { const n = clamp(t); return n < .5 ? 4 * n ** 3 : 1 - (-2 * n + 2) ** 3 / 2; };
  const restoreCaption = stage => {
    if (stage?.dataset.storyOriginalTitle) stage.querySelector("[data-story-title]").textContent = stage.dataset.storyOriginalTitle;
    if (stage?.dataset.storyOriginalCaption) stage.querySelector("[data-story-caption]").textContent = stage.dataset.storyOriginalCaption;
    if (stage?.dataset.storyOriginalDescription) stage.querySelector("[data-story-description]").textContent = stage.dataset.storyOriginalDescription;
  };
  const stop = () => {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = 0;
    active?.removeAttribute("data-story-ready");
    handle?.destroy();
    restoreCaption(active);
    handle = null; active = null; lastFrame = -1;
  };
  const fail = () => { failed = true; stop(); fitRail(); syncButtons(); };
  const syncButtons = () => {
    for (const button of article.querySelectorAll("[data-story-quiet]")) {
      button.hidden = !imported || reduced.matches || colors.matches || !!connection?.saveData || failed;
      button.textContent = "Still view";
      button.setAttribute("aria-pressed", String(quiet));
    }
  };
  const frameFor = stage => {
    if (stage.dataset.storyStage === "rail") {
      const names = ["overview", article.dataset.storyFocus, article.dataset.storyResolve, "takeaway"];
      const anchors = names.map(name => document.getElementById(name));
      if (anchors.some(node => !node)) return 70;
      const positions = anchors.map(node => node.getBoundingClientRect().top + scrollY);
      const at = scrollY + innerHeight * .4;
      const frames = [70, 430, 820, 900];
      for (let i = 0; i < positions.length - 1; i++) {
        if (at <= positions[i + 1]) return Math.round(frames[i] + (frames[i + 1] - frames[i]) * ease((at - positions[i]) / Math.max(1, positions[i + 1] - positions[i])));
      }
      return 900;
    }
    const rect = stage.getBoundingClientRect();
    const progress = clamp((innerHeight * .72 - rect.top) / Math.max(1, rect.height + innerHeight * .15));
    const range = stage.dataset.storyStage === "opening" ? [70, 250] : stage.dataset.storyStage === "middle" ? [330, 600] : [700, 900];
    return Math.round(range[0] + (range[1] - range[0]) * ease(progress));
  };
  const pickStage = () => {
    const candidates = [...visible].filter(stage => {
      const box = stage.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 90 && box.top < innerHeight;
    });
    const rail = candidates.find(stage => stage.dataset.storyStage === "rail");
    if (rail) return rail;
    return candidates.sort((a, b) => {
      const score = node => { const r = node.getBoundingClientRect(); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 90); };
      return score(b) - score(a);
    })[0] ?? null;
  };
  const load = () => {
    if (loading || imported || !allowed()) return;
    loading = true;
    const script = document.createElement("script");
    script.src = "/article-motion.js?v=20261007-living-feature";
    script.onload = () => { loading = false; imported = typeof window.mountArticleStory === "function"; if (!imported) return fail(); syncButtons(); schedule(); };
    script.onerror = fail;
    document.head.append(script);
  };
  const update = () => {
    scheduled = 0;
    if (!allowed()) { stop(); return; }
    const next = pickStage();
    if (!next) { stop(); return; }
    if (!imported) { load(); return; }
    if (next !== active) {
      stop(); active = next;
      const mount = next.querySelector("[data-story-mount]");
      const frame = frameFor(next);
      const mountedStage = next;
      handle = window.mountArticleStory(mount, next.dataset.storySlug, frame,
        () => { if (active === mountedStage && allowed()) mountedStage.setAttribute("data-story-ready", "true"); }, fail);
      if (!handle) return fail();
      lastFrame = frame;
    } else {
      const frame = frameFor(next);
      if (frame !== lastFrame) { handle?.seek(frame); lastFrame = frame; }
    }
  };
  function schedule() { if (!scheduled && allowed()) scheduled = requestAnimationFrame(update); }
  function fitRail() {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    article.toggleAttribute("data-story-inline", fontSize > 24 || reduced.matches || colors.matches || !!connection?.saveData || failed);
    schedule();
  }
  for (const stage of stages) {
    stage.dataset.storyOriginalTitle = stage.querySelector("[data-story-title]").textContent;
    stage.dataset.storyOriginalCaption = stage.querySelector("[data-story-caption]").textContent;
    stage.dataset.storyOriginalDescription = stage.querySelector("[data-story-description]").textContent;
  }
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    if (!pickStage()) stop(); else schedule();
  }, { threshold: [0, .1, .5, 1] });
  stages.forEach(stage => observer.observe(stage));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", fitRail, { passive: true });
  addEventListener("hashchange", schedule);
  addEventListener("pageshow", () => { stages.forEach(stage => observer.observe(stage)); schedule(); });
  article.addEventListener("toggle", schedule, true);
  for (const button of article.querySelectorAll("[data-story-quiet]")) button.addEventListener("click", () => {
    quiet = !quiet; if (quiet) stop(); else schedule(); syncButtons();
  });
  const preferenceChanged = () => { if (!allowed()) stop(); fitRail(); syncButtons(); };
  reduced.addEventListener("change", preferenceChanged);
  colors.addEventListener("change", preferenceChanged);
  connection?.addEventListener?.("change", preferenceChanged);
  document.addEventListener("visibilitychange", preferenceChanged);
  document.fonts?.ready.then(fitRail);
  fitRail();
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(article);
  addEventListener("pagehide", () => { stop(); observer.disconnect(); });
})();
