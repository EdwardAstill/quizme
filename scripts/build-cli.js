import { build } from "esbuild";

await build({
  entryPoints: ["cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/cli.js",
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      'import { fileURLToPath as __fileURLToPath } from "node:url";',
      'import { dirname as __dirname_fn } from "node:path";',
      "const require = __createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      "const __dirname = __dirname_fn(__filename);",
    ].join("\n"),
  },
});
