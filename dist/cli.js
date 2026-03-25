#!/usr/bin/env node

// cli.ts
import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { program } from "commander";
import open from "open";
var __dirname = dirname(fileURLToPath(import.meta.url));
program.name("quizme").description("Launch a quiz in your browser").argument("[file]", "path to a quiz JSON file (optional \u2014 opens file picker if omitted)").option("-p, --port <number>", "port to serve on", "3000").option("--no-open", "don't auto-open the browser").action(async (file, opts) => {
  let quizData = null;
  if (file) {
    const quizPath = resolve(file);
    if (!existsSync(quizPath)) {
      console.error(`Error: file not found: ${quizPath}`);
      process.exit(1);
    }
    try {
      quizData = JSON.parse(readFileSync(quizPath, "utf-8"));
    } catch {
      console.error("Error: could not parse JSON file.");
      process.exit(1);
    }
  }
  const port = parseInt(opts.port, 10);
  const clientDir = __dirname;
  if (!existsSync(join(clientDir, "index.html"))) {
    console.error("Error: built client not found. Run `bun run build` first.");
    process.exit(1);
  }
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon"
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname === "/api/quiz") {
      if (quizData) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(quizData));
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }
    const filePath = join(clientDir, url.pathname === "/" ? "index.html" : url.pathname);
    if (existsSync(filePath)) {
      const ext = filePath.slice(filePath.lastIndexOf("."));
      const contentType = mimeTypes[ext] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(readFileSync(filePath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync(join(clientDir, "index.html")));
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`
QuizMe is running at ${url}`);
    if (file) {
      console.log(`Serving quiz: ${resolve(file)}`);
    } else {
      console.log("No quiz file provided \u2014 use the file picker in the browser.");
    }
    console.log();
    if (opts.open) {
      open(url);
    }
  });
  const shutdown = () => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
program.parse();
