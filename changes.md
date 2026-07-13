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
