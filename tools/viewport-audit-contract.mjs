export function viewportAuditFailureReasons(entry) {
  const reasons = [];
  if (entry.horizontalOverflow) reasons.push("document-horizontal-overflow");
  if ((entry.brokenImages?.length ?? 0) > 0) reasons.push("broken-images");
  if (!entry.oneH1) reasons.push("heading-count");
  if (!entry.oneMain) reasons.push("main-count");
  if (!entry.newsreaderLoaded) reasons.push("newsreader-not-loaded");
  return reasons;
}

