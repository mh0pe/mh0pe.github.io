# Third-party source notices

## OriginKit Plate Stack

`app/components/v3/capability-geometry.ts`, retained from the earlier stack
candidate, adapts the shallow camera tilts
(`Math.PI / 10` and `Math.PI / 4`) from
[Plate Stack](https://www.originkit.dev/components/plate-stack), retrieved via
the OriginKit connector on September 30, 2026, into server-projected vector
blocks. The site's own bounded assembly motion uses Web Animations, with
connected, interlocking shapes settling into a flush stack. It does not use the original
component's animation loop or settling curve.

The original WebGL renderer, looping rotation, rounded-box mesh, shaders,
React hooks, and fixed minimum canvas dimensions are not included. Capability
mapping, labels, dates, selection behavior, polycube packing, contour meshing,
and color identities are site-specific.
The result is a vector interpretation, not the stock Plate Stack component.
The current `CapabilityBricks.tsx` workbench no longer renders that geometry.
It uses site-authored faceted illustrations with directly labeled inputs,
contributions and uses. The prior geometry and its attribution remain preserved.

The underlying source and design remain under
[OriginKit Licensing & Usage](https://www.originkit.dev/docs/licensing), not this
site's ISC license. The same real-site modification and redistribution limits
described below apply. No OriginKit demo media is used.

## OriginKit Satin Flow

`app/components/v3/SatinRibbon.tsx` translates the gradient-noise hash,
four-octave FBM, and three-stage domain-warp construction from
[Satin Flow](https://www.originkit.dev/components/satin-flow), retrieved through
OriginKit's component connector on September 30, 2026 (React source variant).

This site's adaptation samples six decorative SVG ribbons once before delivery.
It omits the original WebGL renderer, pointer interaction, client hooks, frame
loop, preview colors and blur overlay. It is a static vector interpretation, not
the original component or a real-time simulation. The ribbon geometry does not
represent contribution data; the overlaid project graphs do.

Underlying OriginKit source and design remain subject to
[OriginKit Licensing & Usage](https://www.originkit.dev/docs/licensing), dated
August 19, 2026, rather than this repository's ISC grant. Those component terms
permit modified components in a real open-source portfolio site and do not
require attribution. They restrict redistribution as templates, kits, or a
component catalog. No broader redistribution right or endorsement is claimed.

The earlier Topology Field, Reactive Lines, Label Slide Button and Text Colour
Sweep influences were site-specific visual adaptations without imported stock
modules. This Satin Flow translation is separately identified because it adapts
actual source mathematics. No OriginKit demo images, fonts or icons are used.

## Bklit UI

`app/components/v3/BklitModelBar.tsx` adapts the horizontal `AnimatedBar`
primitive and tween easing from Bklit UI, pinned to commit
`0dfdfc57ca068470ccfb93c4501cebc555c9054d`:

- https://github.com/bklit/bklit-ui/blob/0dfdfc57ca068470ccfb93c4501cebc555c9054d/packages/ui/src/charts/bar.tsx
- https://github.com/bklit/bklit-ui/blob/0dfdfc57ca068470ccfb93c4501cebc555c9054d/packages/ui/src/charts/animation.ts

Local changes: a fixed percentage scale, static first render, no stagger or
blur, a native CSS 360 ms transform transition instead of Motion, explicit reduced-motion handling, and HTML
buttons and values retained outside the decorative SVG. The generalized chart
provider, Visx dependencies, and commercial Studio are not included.

MIT License

Copyright (c) 2026 uixmat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
