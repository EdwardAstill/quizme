#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { program } from "commander";
import open from "open";

const __dirname = dirname(fileURLToPath(import.meta.url));

program
  .name("quizme")
  .description("Launch a quiz in your browser")
  .argument("[file]", "path to a quiz JSON file (optional — opens file picker if omitted)")
  .option("-p, --port <number>", "port to serve on", "3000")
  .option("--no-open", "don't auto-open the browser")
  .action(async (file: string | undefined, opts: { port: string; open: boolean }) => {
    let quizData: unknown = null;

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
    const clientDir = join(__dirname, "dist");

    if (!existsSync(clientDir)) {
      console.error("Error: built client not found. Run `bun run build` first.");
      process.exit(1);
    }

    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
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

      // Try serving static file
      const filePath = join(clientDir, url.pathname === "/" ? "index.html" : url.pathname);
      if (existsSync(filePath)) {
        const ext = filePath.slice(filePath.lastIndexOf("."));
        const contentType = mimeTypes[ext] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(readFileSync(filePath));
        return;
      }

      // SPA fallback
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(readFileSync(join(clientDir, "index.html")));
    });

    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`\nQuizMe is running at ${url}`);
      if (file) {
        console.log(`Serving quiz: ${resolve(file)}`);
      } else {
        console.log("No quiz file provided — use the file picker in the browser.");
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
