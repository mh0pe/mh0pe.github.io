(() => {
  "use strict";
  const article = document.querySelector("[data-motion-story]");
  if (!article) return;
  const stages = [...article.querySelectorAll("[data-story-stage]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = matchMedia("(forced-colors: active)");
  const connection = navigator.connection;
  let quiet = false, failed = false, imported = false, loading = false, pageActive = true;
  let active = null, handle = null, scheduled = 0, lastFrame = -1;
  let stageReady = false, readingScroll = false, originY = 0, originFrame = 70, framePerPixel = 0, scrollPosition = scrollY, positioning = 0;
  let focusOrigin = null;
  const visible = new Set();
  const checkpoints = new Map(), originalDrawings = new Map();
  const allowed = () => pageActive && !quiet && !failed && !reduced.matches && !colors.matches && !connection?.saveData && !document.hidden;
  const clamp = (n, low = 0, high = 1) => Math.min(high, Math.max(low, n));
  const restoreCaption = stage => {
    if (stage?.dataset.storyOriginalTitle) stage.querySelector("[data-story-title]").textContent = stage.dataset.storyOriginalTitle;
    if (stage?.dataset.storyOriginalCaption) stage.querySelector("[data-story-caption]").textContent = stage.dataset.storyOriginalCaption;
    if (stage?.dataset.storyOriginalDescription) stage.querySelector("[data-story-description]").textContent = stage.dataset.storyOriginalDescription;
    if (stage?.dataset.storyOriginalChapter) stage.dataset.storyChapter = stage.dataset.storyOriginalChapter;
  };
  const stop = (preserve = false) => {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = 0;
    if (preserve && active && active.dataset.storyStage !== "rail" && stageReady && originalDrawings.has(active)) {
      const checkpoint = handle?.checkpoint?.();
      const [start, end] = inlineRange(active);
      if (checkpoint && Number.isInteger(checkpoint.frame) && checkpoint.frame >= start && checkpoint.frame <= end) {
        active.querySelector(".article-story__still").replaceChildren(checkpoint.svg);
        checkpoints.set(active, checkpoint.frame);
      }
    }
    active?.removeAttribute("data-story-ready");
    handle?.destroy();
    restoreCaption(active);
    handle = null; active = null; lastFrame = -1; stageReady = false; readingScroll = false;
    if (!preserve) {
      for (const stage of checkpoints.keys()) {
        stage.querySelector(".article-story__still").replaceChildren(originalDrawings.get(stage));
        restoreCaption(stage);
      }
      checkpoints.clear();
    }
  };
  const fail = () => { failed = true; stop(); fitRail(); };
  const syncButtons = () => {
    for (const button of article.querySelectorAll("[data-story-quiet]")) {
      button.hidden = !imported || reduced.matches || colors.matches || !!connection?.saveData || failed;
      button.textContent = "Still view for all illustrations";
      button.setAttribute("aria-pressed", String(quiet));
    }
    if (!positioning) restoreHiddenFocus();
  };
  const railFrameFor = () => {
    const names = ["overview", article.dataset.storyFocus, article.dataset.storyResolve, "takeaway"];
    const anchors = names.map(name => document.getElementById(name));
    if (anchors.some(node => !node)) return 70;
    const positions = anchors.map(node => node.getBoundingClientRect().top + scrollY);
    const at = scrollY + innerHeight * .4;
    const frames = [70, 430, 820, 900];
    for (let i = 0; i < positions.length - 1; i++) {
      if (at <= positions[i + 1]) return frames[i] + (frames[i + 1] - frames[i]) * clamp((at - positions[i]) / Math.max(1, positions[i + 1] - positions[i]));
    }
    return 900;
  };
  const artworkBox = stage => stage.querySelector(".article-story__viewport")?.getBoundingClientRect?.() ?? stage.getBoundingClientRect();
  const rebase = (stage, frame) => {
    originY = scrollY; originFrame = frame;
    const [, end] = inlineRange(stage);
    // A safe reverse prefix expands the seek interval, not forward pacing.
    framePerPixel = (end - authoredFrame(stage)) / Math.max(1, artworkBox(stage).height * .65 + innerHeight * .15);
    scrollPosition = scrollY;
    readingScroll = false;
  };
  const authoredFrame = stage => {
    const frame = Number(stage.dataset.storyFrame);
    return Number.isFinite(frame) ? clamp(Math.round(frame), 0, 900) : stage.dataset.storyStage === "middle" ? 430 : stage.dataset.storyStage === "ending" ? 820 : 70;
  };
  const inlineRange = stage => {
    const end = Number(stage.dataset.storyEndFrame);
    const authored = authoredFrame(stage);
    const rawAuthored = Number(stage.dataset.storyFrame);
    const start = Number(stage.dataset.storyStartFrame);
    const floor = Number(stage.dataset.storyReverseFloor);
    const safeReverse = stage.dataset.storyFrame?.trim() && stage.dataset.storyStartFrame?.trim() && stage.dataset.storyReverseFloor?.trim()
      && [start, floor, rawAuthored, end].every(Number.isInteger) && rawAuthored === authored
      && 0 <= start && start <= floor && floor < authored && authored < end && end <= 900;
    return [safeReverse ? floor : authored, Number.isFinite(end) ? end : stage.dataset.storyStage === "opening" ? 250 : stage.dataset.storyStage === "middle" ? 600 : 900];
  };
  const frameFor = stage => {
    if (stage.dataset.storyStage === "rail") return Math.round(railFrameFor());
    const [start, end] = inlineRange(stage);
    // Scroll supplies the clock; StoryScene applies the visual easing once.
    // Preserve signed displacement and slope when resize rebases the clock.
    return Math.round(clamp(originFrame + (scrollY - originY) * framePerPixel, start, end));
  };
  const pickStage = () => {
    const candidates = [...visible].filter(stage => {
      const box = artworkBox(stage);
      return box.width > 0 && box.height > 0 && box.bottom > 90 && box.top < innerHeight;
    });
    const rail = candidates.find(stage => stage.dataset.storyStage === "rail");
    if (rail) return rail;
    return candidates.sort((a, b) => {
      const score = node => { const r = artworkBox(node); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 90); };
      return score(b) - score(a);
    })[0] ?? null;
  };
  const load = () => {
    if (loading || imported || !allowed()) return;
    loading = true;
    const script = document.createElement("script");
    script.src = article.dataset.storyRuntime || "/article-motion.js";
    script.onload = () => { loading = false; imported = typeof window.mountArticleStory === "function"; if (!imported) return fail(); syncButtons(); schedule(); };
    script.onerror = fail;
    document.head.append(script);
  };
  const update = () => {
    scheduled = 0;
    const advanced = readingScroll; readingScroll = false;
    if (!allowed()) { stop(); return; }
    const next = pickStage();
    if (!next) { stop(true); return; }
    if (!imported) { load(); return; }
    if (next !== active) {
      stop(true); active = next;
      const mount = next.querySelector("[data-story-mount]");
      // The still and first live commit use exactly the same authored pose.
      // Loading, layout and preference changes are not reading progress.
      const frame = checkpoints.get(next) ?? authoredFrame(next);
      const mountedStage = next;
      lastFrame = frame;
      rebase(next, frame);
      handle = window.mountArticleStory(mount, next.dataset.storySlug, frame,
        () => { if (active === mountedStage && allowed()) { stageReady = true; rebase(mountedStage, frame); mountedStage.setAttribute("data-story-ready", "true"); } }, fail);
      if (!handle) return fail();
    } else if (stageReady && advanced) {
      const frame = frameFor(next);
      if (frame !== lastFrame) { handle?.seek(frame); lastFrame = frame; }
    }
  };
  function schedule() { if (!scheduled && allowed()) scheduled = requestAnimationFrame(update); }
  function rememberFocus(target) {
    const stage = target?.closest?.("[data-story-stage]");
    focusOrigin = stages.includes(stage) ? { node: target, stage } : null;
  }
  function focusChanged(event) { rememberFocus(event.target); }
  function restoreHiddenFocus() {
    if (document.hidden || !pageActive) return;
    if (article.isConnected === false) { focusOrigin = null; return; }
    let focused = document.activeElement;
    let stage = focused?.closest?.("[data-story-stage]");
    let fromOrigin = false;
    if (!stages.includes(stage)) {
      const neutral = !focused || focused === document.body || focused === document.documentElement;
      if (!neutral) { focusOrigin = null; return; }
      if (!focusOrigin) return;
      // Browsers may blur a newly hidden control before change/resize runs.
      ({ node: focused, stage } = focusOrigin);
      fromOrigin = true;
    }
    if (stage.isConnected === false || focused.isConnected === false) { focusOrigin = null; return; }
    const visible = node => {
      const box = node.getBoundingClientRect?.();
      const style = getComputedStyle(node);
      if (node.hidden || !(box?.width > 0 && box.height > 0) || style.display === "none" || style.visibility === "hidden") return false;
      if (node.checkVisibility?.({ checkVisibilityCSS: true }) === false) return false;
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.inert || ancestor.hasAttribute?.("inert")) return false;
        if (ancestor !== node && ancestor.tagName === "DETAILS" && !ancestor.open) {
          const summary = [...ancestor.children].find(child => child.tagName === "SUMMARY");
          if (node !== summary && !summary?.contains(node)) return false;
        }
      }
      return true;
    };
    if (visible(stage) && visible(focused)) {
      if (fromOrigin) focusOrigin = null;
      return;
    }
    const inView = node => { const box = node.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight; };
    const controls = stages.filter(visible).map(node => node.querySelector("[data-story-quiet]")).filter(node => node && visible(node) && inView(node));
    const links = [...article.querySelectorAll(".article-reading a[href], .article-reading button, .article-reading [tabindex]")].filter(node => visible(node) && inView(node));
    const candidates = controls.length ? controls : links;
    const nearest = nodes => nodes.sort((a, b) => Math.abs(a.getBoundingClientRect().top - innerHeight * .35) - Math.abs(b.getBoundingClientRect().top - innerHeight * .35))[0];
    let replacement = nearest(candidates);
    if (!replacement) {
      replacement = nearest([...article.querySelectorAll(".article-reading h2, .article-reading h3, .article-reading p")].filter(node => !node.closest?.("[data-story-stage]") && visible(node) && inView(node)))
        ?? nearest(stages.filter(node => visible(node) && inView(node)));
      replacement?.setAttribute("tabindex", "-1");
    }
    if (replacement) {
      replacement.focus({ preventScroll: true });
      rememberFocus(document.activeElement);
    }
  }
  function preserveReadingPosition(change) {
    const line = innerHeight * .35;
    const candidates = [...article.querySelectorAll(".article-reading p, .article-reading h2, .article-reading h3")]
      .filter(node => !node.closest?.("[data-story-stage]"))
      .map(node => ({ node, box: node.getBoundingClientRect?.() }))
      .filter(item => item.box?.width > 0 && item.box.height > 0);
    const anchor = candidates.sort((a, b) => Math.abs(a.box.top - line) - Math.abs(b.box.top - line))[0];
    positioning += 1;
    try { change(); } finally { positioning -= 1; }
    if (anchor?.node.isConnected) {
      const delta = anchor.node.getBoundingClientRect().top - anchor.box.top;
      if (delta) window.scrollBy({ top: delta, behavior: "instant" });
    }
    scrollPosition = scrollY;
    if (active && stageReady) rebase(active, lastFrame);
    if (!positioning) restoreHiddenFocus();
  }
  function fitRail() {
    // A resize may arrive between a real scroll event and its scheduled frame.
    // Apply that reading displacement before rebasing the resized clock.
    if (active && stageReady && readingScroll && allowed()) {
      const frame = frameFor(active);
      if (frame !== lastFrame) { handle?.seek(frame); lastFrame = frame; }
    }
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const inline = article.dataset.storyLayout === "inline" || quiet || fontSize > 24 || reduced.matches || colors.matches || !!connection?.saveData || failed;
    if (article.hasAttribute("data-story-inline") !== inline) preserveReadingPosition(() => article.toggleAttribute("data-story-inline", inline));
    if (active && stageReady) rebase(active, lastFrame);
    syncButtons();
    schedule();
  }
  for (const stage of stages) {
    const drawing = stage.querySelector(".article-story__still")?.firstElementChild;
    if (drawing) originalDrawings.set(stage, drawing);
    stage.dataset.storyOriginalTitle = stage.querySelector("[data-story-title]").textContent;
    stage.dataset.storyOriginalCaption = stage.querySelector("[data-story-caption]").textContent;
    stage.dataset.storyOriginalDescription = stage.querySelector("[data-story-description]").textContent;
    stage.dataset.storyOriginalChapter = stage.dataset.storyChapter ?? String(stage.dataset.storyStage === "middle" ? 1 : stage.dataset.storyStage === "ending" ? 2 : 0);
  }
  if (!("IntersectionObserver" in window)) { failed = true; fitRail(); syncButtons(); return; }
  document.addEventListener("focusin", focusChanged);
  rememberFocus(document.activeElement);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    if (!pickStage()) stop(allowed()); else schedule();
  }, { threshold: [0, .1, .5, 1] });
  stages.forEach(stage => observer.observe(stage));
  addEventListener("scroll", () => { if (scrollY !== scrollPosition) { scrollPosition = scrollY; readingScroll = true; schedule(); } }, { passive: true });
  addEventListener("resize", fitRail, { passive: true });
  addEventListener("hashchange", schedule);
  addEventListener("pageshow", () => { pageActive = true; document.addEventListener("focusin", focusChanged); rememberFocus(document.activeElement); stages.forEach(stage => observer.observe(stage)); resizer?.observe(article); schedule(); });
  article.addEventListener("toggle", schedule, true);
  for (const button of article.querySelectorAll("[data-story-quiet]")) button.addEventListener("click", () => {
    preserveReadingPosition(() => { quiet = !quiet; stop(); fitRail(); });
  });
  const preferenceChanged = () => preserveReadingPosition(() => { if (!allowed()) stop(); fitRail(); });
  reduced.addEventListener("change", preferenceChanged);
  colors.addEventListener("change", preferenceChanged);
  connection?.addEventListener?.("change", preferenceChanged);
  document.addEventListener("visibilitychange", preferenceChanged);
  document.fonts?.ready.then(fitRail);
  fitRail();
  const resizer = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
  resizer?.observe(article);
  addEventListener("pagehide", () => { pageActive = false; focusOrigin = null; document.removeEventListener("focusin", focusChanged); stop(); observer.disconnect(); resizer?.disconnect(); });
})();
