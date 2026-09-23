# Third-party source notices

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
