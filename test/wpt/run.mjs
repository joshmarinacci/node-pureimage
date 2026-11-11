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
      if (e?.name !== type) throw fail(`${d ?? ""} expected DOMException ${type} got ${e?.name}: ${e?.message}`);
      return;
    }
    throw fail(`${d ?? ""} expected DOMException ${type} but nothing was thrown`);
  },
};

// One OffscreenCanvas implementation: a Bitmap already has width/height/getContext("2d").
class OffscreenCanvas extends PImage.Bitmap {}

function runFile(file) {
  return new Promise((resolve) => {
    const subtests = []; // {name, status, message}
    let pending = 0;
    let doneCalled = false;
    let settled = false;
    let chain = Promise.resolve(); // promise_tests run sequentially
    const finish = () => {
      if (!settled && doneCalled && pending === 0) {
        settled = true;
        resolve({ subtests });
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
      ImageData: PImage.ImageData,
      Path2D: PImage.Path2D,
      DOMMatrix: PImage.DOMMatrix,
      DOMPoint: PImage.DOMPoint,
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

    try {
      vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file, timeout: opts.timeout });
    } catch (e) {
      // script-level failure (e.g. missing global, or a sync infinite loop): fail anything not yet resolved
      const msg = `${e?.name}: ${e?.message}`;
      if (subtests.length === 0) subtests.push({ name: "(script)", status: "ERROR", message: msg });
      for (const s of subtests) if (!s.status) { s.status = "ERROR"; s.message = msg; }
      settled = true;
      return resolve({ subtests });
    }
    if (subtests.length === 0 && doneCalled) {
      settled = true;
      return resolve({ subtests: [{ name: "(none)", status: "ERROR", message: "no tests registered" }] });
    }
    setTimeout(() => {
      if (settled) return;
      settled = true;
      for (const s of subtests) if (!s.status) { s.status = "TIMEOUT"; s.message = "did not complete"; }
      resolve({ subtests });
    }, opts.timeout);
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
const files = walk(offscreenDir).filter((f) => !filter || f.includes(filter));
console.log(`running ${files.length} WPT canvas test files from ${offscreenDir}`);

const results = {}; // relative name -> {status, message}
const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
  const rel = path.relative(offscreenDir, files[i]).replace(/\.worker\.js$/, "");
  const { subtests } = await runFile(files[i]);
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
