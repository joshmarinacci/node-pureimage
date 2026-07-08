## 2026-07-08 11:09

**Fix bug #224**: `Bitmap` constructor crash when float dimensions are passed to `make()`.

In `src/bitmap.ts`, the constructor stored `Math.floor(w/h)` into `this.width/height` but then used the original float values for both the `Uint8Array` allocation and the fill loop. This caused `setPixelRGBA` to be called with `x = Math.floor(w)`, which equals `this.width`, triggering the `validate_coords` bounds check and throwing `Invalid Index: x N >= width N`.

Fixed by using `this.width` and `this.height` consistently in place of the raw `w` and `h` floats after the floor assignment. Added `test/bugs/bug_224.test.ts` to cover this case.
