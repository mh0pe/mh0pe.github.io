export const CONTRIBUTION_PLAYBACK_ENTRY_DELAY_MS = 240;
export const CONTRIBUTION_PLAYBACK_INTERVAL_MS = 3_200;
export const CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO = 0.12;

export function isContributionPlaybackVisible({
  isIntersecting,
  intersectionRatio,
}: Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio">) {
  return (
    isIntersecting &&
    intersectionRatio >= CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO
  );
}

export function contributionPlaybackDelay(entryPending: boolean) {
  return entryPending
    ? CONTRIBUTION_PLAYBACK_ENTRY_DELAY_MS
    : CONTRIBUTION_PLAYBACK_INTERVAL_MS;
}
