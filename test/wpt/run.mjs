#!/usr/bin/env node
// Runs the Web Platform Tests canvas suite (html/canvas/offscreen/**/*.worker.js)
// against PureImage. The worker variants are plain JS with no DOM, so each file is
// executed in a vm context with a minimal testharness shim and an OffscreenCanvas
// backed by PureImage's Bitmap.
//
// usage: node test/wpt/run.mjs --wpt <path-to-wpt-checkout> [filter] [options]
//   --wpt <dir>         WPT checkout (or WPT_DIR env; default output/wpt from `npm run wpt-init`). Needs html/canvas/offscreen
//                       and html/canvas/resources/canvas-tests.js
//   [filter]            only run test files whose path contains this substring
//   --verbose           print failure messages for every failing test
//   --json <file>       write per-test results to a json file
//   --check             exit 1 if a test listed in baseline.json no longer passes
//   --update-baseline   rewrite baseline.json with the currently passing tests
//   --timeout <ms>      per-file timeout (default 3000)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const BASELINE = path.join(here, "baseline.json");

// ---------- args ----------
const args = process.argv.slice(2);
const opts = { verbose: false, check: false, updateBaseline: false, timeout: 3000 };
let wptDir = process.env.WPT_DIR ?? path.join(root, "output/wpt"); // default: `npm run wpt-init`
let filter = null;
let jsonOut = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--wpt") wptDir = args[++i];
  else if (a === "--json") jsonOut = args[++i];
  else if (a === "--timeout") opts.timeout = Number(args[++i]);
  else if (a === "--verbose") opts.verbose = true;
  else if (a === "--check") opts.check = true;
  else if (a === "--update-baseline") opts.updateBaseline = true;
  else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
  else filter = a;
}
const offscreenDir = path.join(wptDir, "html/canvas/offscreen");
const canvasTestsJs = path.join(wptDir, "html/canvas/resources/canvas-tests.js");
for (const p of [offscreenDir, canvasTestsJs]) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}; run "npm run wpt-init" or pass --wpt <dir>`);
}

// ---------- load PureImage from source ----------
const bundle = path.join(root, "output/wpt-pureimage.mjs");
await build({
  entryPoints: [path.join(root, "src/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: bundle,
  external: ["pngjs", "opentype.js", "jpeg-js"],
  logLevel: "error",
});
const PImage = await import(bundle);

// ---------- testharness shim ----------
const LEGACY_DOM_ERRORS = {
  INDEX_SIZE_ERR: "IndexSizeError",
  INVALID_STATE_ERR: "InvalidStateError",
  SYNTAX_ERR: "SyntaxError",
  NOT_SUPPORTED_ERR: "NotSupportedError",
  SECURITY_ERR: "SecurityError",
};
function fail(msg) {
  const e = new Error(msg);
  e.name = "AssertionError";
  return e;
}
const fmt = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));

const asserts = {
  assert_true: (a, d) => { if (a !== true) throw fail(`${d ?? ""} expected true got ${fmt(a)}`); },
  assert_false: (a, d) => { if (a !== false) throw fail(`${d ?? ""} expected false got ${fmt(a)}`); },
  assert_equals: (a, e, d) => {
    if (!Object.is(a, e)) throw fail(`${d ?? ""} expected ${fmt(e)} got ${fmt(a)}`);
  },
  assert_not_equals: (a, e, d) => {
    if (Object.is(a, e)) throw fail(`${d ?? ""} got disallowed value ${fmt(a)}`);
  },
  assert_approx_equals: (a, e, eps, d) => {
    if (typeof a !== "number" || Math.abs(a - e) > eps) {
      throw fail(`${d ?? ""} expected ${e} +/- ${eps} got ${fmt(a)}`);
    }
  },
  assert_greater_than: (a, e, d) => { if (!(a > e)) throw fail(`${d ?? ""} ${fmt(a)} not > ${fmt(e)}`); },
  assert_less_than: (a, e, d) => { if (!(a < e)) throw fail(`${d ?? ""} ${fmt(a)} not < ${fmt(e)}`); },
  assert_array_equals: (a, e, d) => {
    if (!a || a.length !== e.length) throw fail(`${d ?? ""} length ${a?.length} != ${e.length}`);
    for (let i = 0; i < e.length; i++) {
      if (!Object.is(a[i], e[i])) throw fail(`${d ?? ""} [${i}] expected ${fmt(e[i])} got ${fmt(a[i])}`);
    }
  },
  assert_in_array: (a, arr, d) => { if (!arr.includes(a)) throw fail(`${d ?? ""} ${fmt(a)} not in array`); },
  assert_regexp_match: (a, re, d) => { if (!re.test(a)) throw fail(`${d ?? ""} ${fmt(a)} !~ ${re}`); },
  assert_unreached: (d) => { throw fail(`unreached: ${d ?? ""}`); },
  assert_own_property: (o, p, d) => {
    if (!Object.prototype.hasOwnProperty.call(o, p)) throw fail(`${d ?? ""} missing own property ${p}`);
  },
  // Errors from PureImage come from the host realm, not the vm realm, so compare by name.
  assert_throws_js: (ctor, fn, d) => {
    try { fn(); } catch (e) {
      if (e?.name !== ctor.name) throw fail(`${d ?? ""} expected ${ctor.name} got ${e?.name}: ${e?.message}`);
      return;
    }
    throw fail(`${d ?? ""} expected ${ctor.name} but nothing was thrown`);
  },
  assert_throws_dom: (type, fn, d) => {
    try { fn(); } catch (e) {
      // tests name DOMExceptions by legacy code constant (e.g. "SYNTAX_ERR") or by name
      if (e?.name !== type && e?.name !== LEGACY_DOM_ERRORS[type]) throw fail(`${d ?? ""} expected DOMException ${type} got ${e?.name}: ${e?.message}`);
      return;
    }
    throw fail(`${d ?? ""} expected DOMException ${type} but nothing was thrown`);
  },
};

// One OffscreenCanvas implementation: a Bitmap already has width/height/getContext("2d").
class OffscreenCanvas extends PImage.Bitmap {
  constructor(width, height) {
    super(width, height);
    // Canvas surfaces begin transparent even though a bare Bitmap stays opaque black.
    this.data.fill(0);
  }

  get [Symbol.toStringTag]() {
    return "OffscreenCanvas";
  }
}

// Tests may patch the context prototype (e.g. 2d.canvas.context.type.replace overrides
// fillRect). Every file shares the bundle's Context class, so snapshot its prototype
// and restore it after each file to keep files isolated.
const contextProto = PImage.Context.prototype;
const contextProtoSnapshot = Object.getOwnPropertyDescriptors(contextProto);
function restoreContextPrototype() {
  for (const key of Reflect.ownKeys(contextProto)) {
    if (!(key in contextProtoSnapshot)) delete contextProto[key];
  }
  Object.defineProperties(contextProto, contextProtoSnapshot);
}

// ---------- image loading shims ----------
// Worker tests load fixtures with fetch('/images/x.png') + createImageBitmap(blob).
// fetch is not part of canvas, so it is shimmed here to read files from the WPT checkout.

/** Resolve a test URL to a file inside the WPT checkout, or null if it escapes it. */
function resolveWptUrl(url, testFile) {
  // relative URLs resolve against the test file's own location on the WPT server
  const base = new URL(path.relative(wptDir, testFile).split(path.sep).join("/"), "http://wpt.local/");
  const resolved = path.resolve(wptDir, "." + decodeURIComponent(new URL(url, base).pathname));
  return resolved.startsWith(path.resolve(wptDir) + path.sep) ? resolved : null;
}

function makeFetch(testFile) {
  return async function fetch(input) {
    const url = typeof input === "string" ? input : input?.url;
    const file = resolveWptUrl(String(url), testFile);
    if (!file || !fs.existsSync(file)) return new Response(null, { status: 404, statusText: "Not Found" });
    const type = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" }[path.extname(file).toLowerCase()];
    return new Response(fs.readFileSync(file), { status: 200, headers: type ? { "content-type": type } : {} });
  };
}

class ImageBitmap extends PImage.Bitmap {
  close() {
    this.width = 0;
    this.height = 0;
    this.data = new Uint8Array(0);
  }

  get [Symbol.toStringTag]() {
    return "ImageBitmap";
  }
}

/** Copy straight RGBA pixels (a Bitmap, OffscreenCanvas or ImageData) into a new ImageBitmap. */
function bitmapFromPixels(src) {
  const out = new ImageBitmap(src.width, src.height);
  out.data.set(src.data.subarray(0, out.data.length));
  return out;
}

async function decodeImage(bytes, type) {
  const stream = Readable.from([Buffer.from(bytes)]);
  if (type === "image/png") return PImage.decodePNGFromStream(stream);
  if (type === "image/jpeg") return PImage.decodeJPEGFromStream(stream);
  throw new DOMException(`createImageBitmap: unsupported image type ${type || "(none)"}`, "InvalidStateError");
}

async function createImageBitmap(source) {
  if (source instanceof Blob) {
    const bytes = new Uint8Array(await source.arrayBuffer());
    // sniff the format rather than trusting the blob type, as browsers do
    const type = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : source.type;
    return bitmapFromPixels(await decodeImage(bytes, type));
  }
  // a Bitmap/OffscreenCanvas, or ImageData-like pixels
  if (source && Number.isInteger(source.width) && Number.isInteger(source.height) && source.data?.length >= source.width * source.height * 4) {
    return bitmapFromPixels(source);
  }
  throw new TypeError("createImageBitmap: unsupported source");
}

// ---------- geometry shim ----------
// roundRect tests pass DOMPoint radii. DOMPoint is a Geometry Interfaces API, not canvas,
// and roundRect only reads its x and y, so a plain data class is enough.
class DOMPoint {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = +x;
    this.y = +y;
    this.z = +z;
    this.w = +w;
  }
}

// ---------- font loading shim ----------
// Text tests load fonts with new FontFace(family, "url('/fonts/x.ttf')") and self.fonts.
// Both are CSS Font Loading APIs, not canvas, so they are shimmed on top of registerFont().

function makeFontFaceApi(testFile) {
  const pending = new Set();

  class FontFace {
    constructor(family, source) {
      this.family = String(family);
      this.status = "unloaded";
      const m = /^\s*url\(\s*(['"]?)(.*?)\1\s*\)\s*$/.exec(String(source));
      this._file = m ? resolveWptUrl(m[2], testFile) : null;
      this.loaded = new Promise((res, rej) => {
        this._resolve = res;
        this._reject = rej;
      });
      this.loaded.catch(() => {}); // a failed load is reported through load()/fonts.ready
    }

    load() {
      if (this.status !== "unloaded") return this.loaded;
      this.status = "loading";
      const done = (async () => {
        if (!this._file || !fs.existsSync(this._file)) throw new DOMException(`font not found: ${this.family}`, "NetworkError");
        await PImage.registerFont(this._file, this.family).load();
      })().then(
        () => { this.status = "loaded"; this._resolve(this); },
        (e) => { this.status = "error"; this._reject(e); },
      );
      pending.add(done);
      done.finally(() => pending.delete(done));
      return this.loaded;
    }
  }

  const faces = new Set();
  const fonts = {
    add(face) { faces.add(face); return fonts; },
    delete(face) { return faces.delete(face); },
    has(face) { return faces.has(face); },
    clear() { faces.clear(); },
    // resolves once every font load started so far has settled
    get ready() { return Promise.allSettled([...pending]).then(() => fonts); },
    [Symbol.iterator]() { return faces.values(); },
  };
  return { FontFace, fonts };
}

// Fonts registered by a test file stay in PureImage's global registry; remove them after each
// file so later files see the same (empty) registry they would on their own.
const fontRegistry = PImage.debug_list_of_fonts;
const initialFonts = new Set(Object.keys(fontRegistry));
function restoreFontRegistry() {
  for (const family of Object.keys(fontRegistry)) {
    if (!initialFonts.has(family)) delete fontRegistry[family];
  }
}

function runFile(file) {
  return new Promise((resolve) => {
    const subtests = []; // {name, status, message}
    let pending = 0;
    let doneCalled = false;
    let settled = false;
    let timeoutTimer;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      resolve(result);
    };
    let chain = Promise.resolve(); // promise_tests run sequentially
    const finish = () => {
      if (!settled && doneCalled && pending === 0) {
        settle({ subtests });
      }
    };
    const record = (sub, status, message) => {
      if (sub.status) return; // first result wins
      sub.status = status;
      sub.message = message;
      pending--;
      finish();
    };
    const newSub = (name) => {
      const sub = { name, status: null, message: null };
      subtests.push(sub);
      pending++;
      return sub;
    };
    const guard = (sub, fn, self, fnArgs) => {
      try {
        return fn.apply(self, fnArgs);
      } catch (e) {
        record(sub, "FAIL", `${e?.name}: ${e?.message}`);
      }
    };
    const makeT = (sub) => {
      const t = {
        step: (fn, self, ...a) => guard(sub, fn, self ?? t, a),
        step_func: (fn, self) => (...a) => guard(sub, fn, self ?? t, a),
        step_func_done: (fn, self) => (...a) => {
          const r = guard(sub, fn ?? (() => {}), self ?? t, a);
          t.done();
          return r;
        },
        unreached_func: (d) => () => record(sub, "FAIL", `unreached: ${d}`),
        done: () => record(sub, "PASS", null),
        add_cleanup: () => {},
        name: sub.name,
      };
      return t;
    };

    const ctx = vm.createContext({
      OffscreenCanvas,
      OffscreenCanvasRenderingContext2D: PImage.Context,
      CanvasPattern: PImage.CanvasPattern,
      CanvasGradient: PImage.CanvasGradient,
      fetch: makeFetch(file),
      createImageBitmap,
      ImageBitmap,
      Blob,
      Response,
      ImageData: PImage.ImageData,
      Path2D: PImage.Path2D,
      DOMMatrix: PImage.DOMMatrix,
      DOMPoint,
      console,
      ...asserts,
      importScripts(p) {
        if (p.endsWith("testharness.js")) return;
        if (p.endsWith("canvas-tests.js")) {
          vm.runInContext(fs.readFileSync(canvasTestsJs, "utf8"), ctx, { filename: p });
          return;
        }
        throw new Error(`importScripts: unsupported ${p}`);
      },
      async_test(a, b) {
        const [fn, name] = typeof a === "function" ? [a, b] : [null, a];
        const t = makeT(newSub(name));
        if (fn) t.step(fn, t, t);
        return t;
      },
      test(fn, name) {
        const sub = newSub(name);
        const t = makeT(sub);
        t.step(fn, t, t);
        t.done();
      },
      promise_test(fn, name) {
        const sub = newSub(name);
        const t = makeT(sub);
        chain = chain.then(async () => {
          if (sub.status) return;
          try {
            await fn.call(t, t);
            t.done();
          } catch (e) {
            record(sub, "FAIL", `${e?.name}: ${e?.message}`);
          }
        });
      },
      done() {
        doneCalled = true;
        finish();
      },
    });
    ctx.self = ctx;
    const fontApi = makeFontFaceApi(file);
    ctx.FontFace = fontApi.FontFace;
    ctx.fonts = fontApi.fonts;

    // Start the timeout before executing the file. Clearing it as soon as the
    // file settles lets its VM context and test data be reclaimed immediately
    // instead of retaining one closure per file for another 3 seconds.
    timeoutTimer = setTimeout(() => {
      if (settled) return;
      for (const s of subtests) if (!s.status) { s.status = "TIMEOUT"; s.message = "did not complete"; }
      settle({ subtests });
    }, opts.timeout);

    try {
      vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file, timeout: opts.timeout });
    } catch (e) {
      // script-level failure (e.g. missing global, or a sync infinite loop): fail anything not yet resolved
      const msg = `${e?.name}: ${e?.message}`;
      if (subtests.length === 0) subtests.push({ name: "(script)", status: "ERROR", message: msg });
      for (const s of subtests) if (!s.status) { s.status = "ERROR"; s.message = msg; }
      return settle({ subtests });
    }
    if (subtests.length === 0 && doneCalled) {
      return settle({ subtests: [{ name: "(none)", status: "ERROR", message: "no tests registered" }] });
    }
  });
}

// ---------- discover + run ----------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "manual") out.push(...walk(p)); }
    else if (e.name.endsWith(".worker.js")) out.push(p);
  }
  return out.sort();
}
// This WPT sets width and height to 2^31-1. Bitmap eagerly allocates and
// clears pixel storage on resize, so running it can exhaust the host's memory.
// It is intentionally excluded from the baseline for the same reason.
const resourceExhaustionTests = new Set(["canvas-host/2d.canvas.host.size.large"]);
const files = walk(offscreenDir).filter((f) => {
  const rel = path.relative(offscreenDir, f).replace(/\.worker\.js$/, "");
  return !resourceExhaustionTests.has(rel) && (!filter || f.includes(filter));
});
console.log(`skipping ${resourceExhaustionTests.size} resource-exhaustion WPT file(s)`);
console.log(`running ${files.length} WPT canvas test files from ${offscreenDir}`);

const results = {}; // relative name -> {status, message}
const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
  const rel = path.relative(offscreenDir, files[i]).replace(/\.worker\.js$/, "");
  const { subtests } = await runFile(files[i]);
  restoreContextPrototype();
  restoreFontRegistry();
  const bad = subtests.find((s) => s.status !== "PASS");
  results[rel] = bad ? { status: bad.status, message: bad.message } : { status: "PASS", message: null };
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${files.length} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ---------- report ----------
const byDir = {};
for (const [name, r] of Object.entries(results)) {
  const d = name.split("/")[0];
  byDir[d] ??= { PASS: 0, FAIL: 0, ERROR: 0, TIMEOUT: 0 };
  byDir[d][r.status]++;
}
console.log("\ncategory".padEnd(42) + "pass  fail  error timeout");
const total = { PASS: 0, FAIL: 0, ERROR: 0, TIMEOUT: 0 };
for (const [d, c] of Object.entries(byDir)) {
  console.log(d.padEnd(41) + [c.PASS, c.FAIL, c.ERROR, c.TIMEOUT].map((n) => String(n).padStart(5)).join(" "));
  for (const k of Object.keys(total)) total[k] += c[k];
}
console.log("TOTAL".padEnd(41) + Object.values(total).map((n) => String(n).padStart(5)).join(" "));

if (opts.verbose) {
  console.log("");
  for (const [name, r] of Object.entries(results)) {
    if (r.status !== "PASS") console.log(`${r.status} ${name}: ${r.message}`);
  }
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));

const passing = Object.keys(results).filter((n) => results[n].status === "PASS");
if (opts.updateBaseline) {
  if (filter) throw new Error("--update-baseline needs a full run (no filter)");
  fs.writeFileSync(BASELINE, JSON.stringify(passing, null, 2) + "\n");
  console.log(`\nwrote ${passing.length} passing tests to ${path.relative(root, BASELINE)}`);
}
if (opts.check) {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  const regressions = baseline.filter((n) => (!filter || n.includes(filter)) && results[n]?.status !== "PASS");
  if (regressions.length) {
    console.log(`\n${regressions.length} regression(s) vs baseline:`);
    for (const n of regressions) console.log(`  ${n}: ${results[n]?.message ?? "not run"}`);
    process.exit(1);
  }
  console.log(`\nno regressions vs baseline (${baseline.length} tests)`);
}
