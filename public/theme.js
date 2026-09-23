(() => {
  const storageKey = "mhs-color-theme";
  const root = document.documentElement;
  const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
  let transientPreference = null;
  const boundControls = new WeakSet();
  let controlsReady = false;
  let headerGuard = null;

  function savedPreference() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved === "light" || saved === "dark" ? saved : null;
    } catch {
      return null;
    }
  }

  function resolvedTheme() {
    return savedPreference() ?? transientPreference ?? (systemPreference.matches ? "dark" : "light");
  }

  function synchronizeControls(theme) {
    const action = theme === "dark" ? "light" : "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((control) => {
      control.setAttribute("aria-label", `Switch to ${action} mode`);
      control.setAttribute("title", `Switch to ${action} mode`);
    });
  }

  function applyTheme(theme) {
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    if (controlsReady && !root.classList.contains("theme-ready")) root.classList.add("theme-ready");
    if (root.style.colorScheme !== theme) root.style.colorScheme = theme;
    synchronizeControls(theme);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", theme === "dark" ? "#111714" : "#f3efe6");
    });
  }

  function attachControls() {
    document.querySelectorAll("[data-theme-toggle]").forEach((control) => {
      if (boundControls.has(control)) return;
      boundControls.add(control);
      control.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        transientPreference = nextTheme;
        try {
          window.localStorage.setItem(storageKey, nextTheme);
        } catch {
          // The visual choice still applies when storage is unavailable.
        }
        applyTheme(nextTheme);
      });
    });
  }

  function bindControls() {
    controlsReady = true;
    attachControls();
    applyTheme(resolvedTheme());
    if (!headerGuard) {
      const header = document.querySelector(".site-header__inner, .not-found__utility");
      if (header) {
        headerGuard = new MutationObserver(() => {
          attachControls();
          synchronizeControls(resolvedTheme());
        });
        headerGuard.observe(header, { childList: true, subtree: true });
      }
    }
  }

  const hydrationGuard = new MutationObserver(() => {
    const theme = resolvedTheme();
    if (
      root.dataset.theme !== theme ||
      (controlsReady && !root.classList.contains("theme-ready")) ||
      root.style.colorScheme !== theme
    ) {
      applyTheme(theme);
    } else {
      attachControls();
    }
  });
  hydrationGuard.observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  } else {
    bindControls();
  }

  window.addEventListener("load", bindControls, { once: true });
  window.addEventListener("pageshow", bindControls);

  systemPreference.addEventListener("change", () => {
    if (!savedPreference() && !transientPreference) applyTheme(resolvedTheme());
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) {
      transientPreference = null;
      applyTheme(resolvedTheme());
    }
  });
})();
