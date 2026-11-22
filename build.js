import { build } from "esbuild";

async function go() {
  const sharedConfig = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: true,
  };

  await build({
    ...sharedConfig,
    platform: "node",
    outfile: "dist/index.cjs",
  });

  await build({
    ...sharedConfig,
    platform: "neutral",
    format: "esm",
    outfile: "dist/index.esm.js",
    external: ["pngjs", "opentype.js", "jpeg-js", "node:*"],
  });
}

go()
  .then(() => console.log("done"))
  .catch((e) => console.log(e));
