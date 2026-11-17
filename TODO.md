# Major Canvas features to implement

This checklist tracks substantial Canvas API gaps. It is a starting point, not a complete conformance list.

- [ ] **Canvas patterns** — implement `createPattern()`, repetition modes, and pattern drawing. WPT currently reports this in canvas-host and fill-and-stroke-styles.
- [ ] **Shadows** — render `shadowColor`, `shadowBlur`, `shadowOffsetX`, and `shadowOffsetY` for supported drawing operations.
- [ ] **Line dashes** — implement `setLineDash()` and `getLineDash()`, then apply the dash array and `lineDashOffset` while stroking paths and rectangles.
- [ ] **`arcTo()` geometry** — replace the current no-op with the tangent-arc path behavior.
- [ ] **Path hit testing** — implement `isPointInPath()` and `isPointInStroke()`.
- [ ] **Composite operations** — support the Canvas compositing modes beyond the currently implemented source-over behavior.
- [ ] **ImageData creation** — add `createImageData()` and the required typed-array/color-space forms.
- [ ] **Canvas filters and layers** — implement the `filter` drawing behavior and the `beginLayer()`/`endLayer()` API where supported by the target spec.
