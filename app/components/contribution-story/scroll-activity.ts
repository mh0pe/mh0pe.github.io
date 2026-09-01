"use client";

import { useSyncExternalStore } from "react";

const SCROLL_IDLE_DELAY_MS = 160;

let scrollActive = false;
let idleTimer: number | null = null;
let listening = false;
const listeners = new Set<() => void>();

function publishScrollActivity(nextActive: boolean) {
  if (scrollActive === nextActive) {
    return;
  }
  scrollActive = nextActive;
  if (typeof document !== "undefined") {
    if (nextActive) {
      document.documentElement.dataset.scrollActive = "true";
    } else {
      delete document.documentElement.dataset.scrollActive;
    }
  }
  listeners.forEach((listener) => listener());
}

function handleScroll() {
  publishScrollActivity(true);
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer);
  }
  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    publishScrollActivity(false);
  }, SCROLL_IDLE_DELAY_MS);
}

function startListening() {
  if (listening || typeof window === "undefined") {
    return;
  }
  listening = true;
  window.addEventListener("scroll", handleScroll, { passive: true });
}

function stopListening() {
  if (!listening || typeof window === "undefined") {
    return;
  }
  window.removeEventListener("scroll", handleScroll);
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer);
    idleTimer = null;
  }
  listening = false;
  publishScrollActivity(false);
}

function subscribeScrollActivity(listener: () => void) {
  listeners.add(listener);
  startListening();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListening();
    }
  };
}

function getScrollActivitySnapshot() {
  return scrollActive;
}

function getServerScrollActivitySnapshot() {
  return false;
}

export function useScrollActivity() {
  return useSyncExternalStore(
    subscribeScrollActivity,
    getScrollActivitySnapshot,
    getServerScrollActivitySnapshot,
  );
}
