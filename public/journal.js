(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const figures = [...document.querySelectorAll("[data-journal-figure]")];
  const visible = new Set();
  const pending = new Set(figures);
  const hasObserver = "IntersectionObserver" in window;
  const motionAllowed = () => !reduceMotion.matches && navigator.connection?.saveData !== true && !document.hidden;

  function play(figure, replay = false) {
    if (!motionAllowed() || (hasObserver && !visible.has(figure)) || (!replay && !pending.has(figure))) return;
    pending.delete(figure);
    if (replay) {
      figure.removeAttribute("data-figure-play");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (motionAllowed() && (!hasObserver || visible.has(figure))) figure.setAttribute("data-figure-play", "");
      }));
    } else {
      figure.setAttribute("data-figure-play", "");
    }
  }

  function syncMotion() {
    const staticMode = reduceMotion.matches || navigator.connection?.saveData === true;
    root.toggleAttribute("data-journal-static", staticMode);
    for (const figure of figures) {
      const replay = figure.querySelector("[data-figure-replay]");
      if (!replay) continue;
      replay.hidden = staticMode;
      replay.disabled = staticMode;
      if (!motionAllowed()) figure.removeAttribute("data-figure-play");
      else if (visible.has(figure)) play(figure);
    }
  }

  if (hasObserver) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.add(entry.target);
          play(entry.target);
        } else {
          visible.delete(entry.target);
          entry.target.removeAttribute("data-figure-play");
        }
      }
    }, { threshold: 0.18 });
    for (const figure of figures) observer.observe(figure);
  }
  for (const figure of figures) {
    figure.querySelector("[data-figure-replay]")?.addEventListener("click", () => play(figure, true));
  }
  reduceMotion.addEventListener("change", syncMotion);
  navigator.connection?.addEventListener?.("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  syncMotion();

  const journal = document.querySelector("[data-journal]");
  if (!journal) return;
  const topicLinks = [...journal.querySelectorAll("[data-journal-topic]")];
  const groups = [...journal.querySelectorAll("[data-journal-group]")];
  const tagControl = journal.querySelector("[data-journal-tag]");
  const tagValues = new Set([...tagControl.options].map((option) => option.value));
  const topicValues = new Set(groups.map((group) => group.dataset.journalGroup));
  const status = journal.querySelector("[data-journal-status]");
  const empty = journal.querySelector("[data-journal-empty]");
  let topic = "all";
  let tag = "";

  function filter() {
    let count = 0;
    for (const group of groups) {
      let groupCount = 0;
      for (const entry of group.querySelectorAll("[data-journal-entry]")) {
        const tags = JSON.parse(entry.dataset.journalTags);
        entry.hidden = (topic !== "all" && topic !== group.dataset.journalGroup) || (tag !== "" && !tags.includes(tag));
        if (!entry.hidden) groupCount += 1;
      }
      group.hidden = groupCount === 0;
      count += groupCount;
    }
    for (const link of topicLinks) {
      if (link.dataset.journalTopic === topic) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    tagControl.value = tag;
    empty.hidden = count !== 0;
    status.textContent = count + (count === 1 ? " essay" : " essays") + (tag ? " with a focus on " + tag.toLowerCase() : topic !== "all" ? " in " + topicLinks.find((link) => link.dataset.journalTopic === topic).textContent.toLowerCase() : " to explore");
  }

  function readLocation() {
    const parameters = new URLSearchParams(location.search);
    const requestedTopic = parameters.get("topic");
    topic = topicValues.has(requestedTopic) ? requestedTopic : "all";
    const requestedTag = parameters.get("tag");
    tag = tagValues.has(requestedTag) ? requestedTag : "";
    filter();
  }

  function writeLocation(fragment) {
    const url = new URL(location.href);
    if (topic === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", topic);
    if (!tag) url.searchParams.delete("tag");
    else url.searchParams.set("tag", tag);
    url.hash = fragment;
    history.pushState(null, "", url.pathname + url.search + url.hash);
    filter();
  }

  for (const link of topicLinks) {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      topic = link.dataset.journalTopic;
      writeLocation(topic === "all" ? "articles" : "topic-" + topic);
      const target = document.getElementById(topic === "all" ? "articles" : "topic-" + topic);
      if (target && !target.hidden) target.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }
  tagControl.addEventListener("change", () => {
    tag = tagControl.value;
    writeLocation("articles");
  });
  for (const reset of journal.querySelectorAll("[data-journal-reset]")) {
    reset.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      topic = "all";
      tag = "";
      writeLocation("articles");
      if (reset.dataset.journalReset === "empty") {
        topicLinks.find((link) => link.dataset.journalTopic === "all")?.focus();
      }
    });
  }
  window.addEventListener("popstate", readLocation);
  journal.querySelector("[data-journal-tag-control]").hidden = false;
  tagControl.disabled = false;
  readLocation();
})();
