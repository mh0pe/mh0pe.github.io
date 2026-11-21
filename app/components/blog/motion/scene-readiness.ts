export function canRevealStoryScene(mount: HTMLElement, svg: SVGSVGElement | null, container: HTMLDivElement | null, disposed: boolean): svg is SVGSVGElement {
  if (disposed || !svg || svg.namespaceURI !== "http://www.w3.org/2000/svg" || svg.localName !== "svg" || !svg.isConnected || !mount.contains(svg)) return false;
  if (!container || !container.isConnected || !mount.contains(container) || !container.contains(svg)) return false;
  // Remotion commits its SVG before its fitted Player root stops being transparent.
  // Inherited visibility is intentionally hidden until this handoff succeeds.
  const view = container.ownerDocument.defaultView;
  if (!view || Number(view.getComputedStyle(container).opacity) !== 1) return false;
  const bounds = container.getBoundingClientRect();
  const { width, height } = svg.getBoundingClientRect();
  return [width, height, bounds.width, bounds.height].every(size => Number.isFinite(size) && size > 0);
}
