#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = resolve(__dirname, "..", "cli.ts");
const tsx = resolve(__dirname, "..", "node_modules", ".bin", "tsx");

try {
  execFileSync(tsx, [cli, ...process.argv.slice(2)], { stdio: "inherit" });
} catch (e) {
  process.exit(e.status ?? 1);
}
