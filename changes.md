## 2026-07-13 13:40

**Fix font string parsing**: replaced the naive two-token font parser with a proper CSS font shorthand parser.

The old `set font` split on the first space, so any string containing style/weight keywords (e.g. `"bold 12px Arial"`) would set `size = NaN` and store the full remainder as the family name.

The new `parseFontString` function in `src/context.ts` iterates tokens left-to-right, recognising `style` (`italic`, `oblique`), `variant` (`small-caps`), `weight` (`bold`, `lighter`, `bolder`, and numeric 100–900) before the required size token (`<number><unit>`, where unit is `px`, `pt`, `em`, `rem`, etc.). Everything after the size token becomes the family name, with surrounding quotes stripped. Invalid or unrecognised input leaves `_font` unchanged rather than corrupting it.

The `get font` getter is updated to reconstruct the full CSS font string from the stored properties (style → variant → weight → `${size}px` → family).

Added `test/font-parsing.test.ts` with 39 unit tests covering: basic size/family (px, pt, em, rem, decimal sizes, quoted and space-separated family names), weight keywords and numeric weights, style keywords, variant, all combinations, getter round-trips, and edge cases (empty string, size-only, `normal` keyword, whitespace).

## 2026-07-08 11:09

**Fix bug #224**: `Bitmap` constructor crash when float dimensions are passed to `make()`.

In `src/bitmap.ts`, the constructor stored `Math.floor(w/h)` into `this.width/height` but then used the original float values for both the `Uint8Array` allocation and the fill loop. This caused `setPixelRGBA` to be called with `x = Math.floor(w)`, which equals `this.width`, triggering the `validate_coords` bounds check and throwing `Invalid Index: x N >= width N`.

Fixed by using `this.width` and `this.height` consistently in place of the raw `w` and `h` floats after the floor assignment. Added `test/bugs/bug_224.test.ts` to cover this case.

## 2026-11-11 12:00

**WPT canvas test runner**: added `test/wpt/run.mjs` (`npm run wpt`), which runs the web-platform-tests `html/canvas/offscreen/**/*.worker.js` conformance tests against PureImage.

Each file runs in a `vm` context with a minimal testharness shim (`async_test`, `promise_test`, `test`, `assert_*`) and an `OffscreenCanvas` that subclasses `Bitmap`. Prints pass/fail/error/timeout per category, `--verbose` for failure messages, `--json` for raw results. `test/wpt/baseline.json` records the 226 of 1041 test files that pass today; `--check` exits non-zero on regressions and `--update-baseline` rewrites it. README documents setup.

## 2026-11-11 12:30

**`npm run wpt-init`**: sparse-clones web-platform-tests (`html/canvas`, `resources`) into `output/wpt` (skipped if present). The WPT runner now defaults to that directory, so `npm run wpt` works with no arguments.

## 2026-11-11 14:00

**Canvas state/host/context fixes found by the WPT suite** (WPT passes 226 -> 345 of 1041; `the-canvas-state` 20/20, `canvas-host` 31/35, `reset` 17/29).

- `save()`/`restore()` now cover fill/stroke style, line width, `globalAlpha`, font, text align/baseline, `imageSmoothingEnabled`, plus new stored `lineCap`, `lineJoin`, `miterLimit`, `shadow*` and `globalCompositeOperation` (spec defaults set; not yet used when drawing). Previously only the clip and transform were saved.
- Initial `fillStyle`/`strokeStyle` getters return `#000000` instead of `""`.
- `path` starts as an empty array, so `moveTo`/`lineTo`/`clip`/`fill`/`stroke` before `beginPath()` no longer throw; `closePath()`/`fill()` on an empty path are no-ops.
- New `ctx.reset()`: clears the bitmap to transparent black and restores all state.
- `Bitmap.width`/`height` are now accessors: setting either (even to the same value) reallocates the bitmap, clears it to transparent and resets the context; invalid values throw `TypeError`. `getContext()` with no argument throws `TypeError`. New bitmaps are still opaque black, for backwards compatibility.
- `encodePNG/JPEG` argument checks use `in` instead of own-property checks, since width/height are now accessors.
- `Transform.asDomMatrix()` was missing `f`.
- Known side effect: WPT `canvas-host/2d.canvas.host.size.large` (width = 2^31-1) no longer passes, because resizing now really allocates; removed from the baseline.
- Tests: new `test/state.test.ts` and `test/bitmap.test.ts`; `test/context.test.ts` extended.
