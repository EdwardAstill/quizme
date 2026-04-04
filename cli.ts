#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve, join, dirname, sep } from "node:path";
import { program } from "commander";
import { createServer } from "vite";
import open from "open";
import { parseQuiz } from "./src/parsers";

const rootDir = import.meta.dir;

interface ServerOpts {
  port: string;
  open: boolean;
}

async function startQuizServer(file: string, opts: ServerOpts) {
  const quizPath = resolve(file);
  if (!existsSync(quizPath)) {
    console.error(`Error: file not found: ${quizPath}`);
    process.exit(1);
  }

  let quizData: unknown = null;
  try {
    const content = await Bun.file(quizPath).text();
    quizData = parseQuiz(content, quizPath);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : "could not parse quiz file."}`);
    process.exit(1);
  }

  const port = parseInt(opts.port, 10);

  const server = await createServer({
    root: rootDir,
    configFile: resolve(rootDir, "vite.config.ts"),
    server: { port },
    plugins: [
      {
        name: "quizme-api",
        configureServer(server) {
          server.middlewares.use("/api/quiz", (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(quizData));
          });

          const quizDir = dirname(quizPath);
          const imagesRoot = join(quizDir, "images");
          const MIME: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            svg: "image/svg+xml",
            webp: "image/webp",
          };

          server.middlewares.use("/quiz-images", async (req, res) => {
            // req.url has the prefix stripped, e.g. "/diagram.png"
            const filename = (req.url?.replace(/^\//, "") ?? "").split("?")[0];
            if (!filename) {
              res.statusCode = 404;
              res.end();
              return;
            }

            const imagePath = resolve(join(imagesRoot, filename));

            // Path traversal guard
            if (!imagePath.startsWith(imagesRoot + sep)) {
              res.statusCode = 403;
              res.end();
              return;
            }

            if (!existsSync(imagePath)) {
              res.statusCode = 404;
              res.end();
              return;
            }

            const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
            const contentType = MIME[ext];
            if (!contentType) {
              res.statusCode = 415;
              res.end();
              return;
            }

            res.setHeader("Content-Type", contentType);
            const buf = await Bun.file(imagePath).arrayBuffer();
            res.end(Buffer.from(buf));
          });
        },
      },
    ],
  });

  await server.listen();
  const url = `http://localhost:${port}`;
  console.log(`\nQuizMe is running at ${url}`);
  console.log(`Serving quiz: ${quizPath}`);
  console.log();

  if (opts.open) {
    open(url);
  }
}

program
  .name("quizme")
  .description("Launch a quiz in your browser, or manage quizzes interactively")
  .argument("[file]", "path to a .quiz, .json, or .quiz.md quiz file (optional — opens TUI if omitted)")
  .option("-p, --port <number>", "port to serve on", "3000")
  .option("-t, --test", "run the built-in sample quiz")
  .option("--no-open", "don't auto-open the browser")
  .action(async (file: string | undefined, opts: { port: string; test?: boolean; open: boolean }) => {
    if (opts.test) {
      file = join(rootDir, "examples", "sample.quiz.md");
    }

    if (!file) {
      const { launchTUI } = await import("./src/tui/index.tsx");
      await launchTUI(async (quizPath: string) => {
        await startQuizServer(quizPath, { port: opts.port, open: opts.open });
      });
      process.exit(0);
    }

    await startQuizServer(file, { port: opts.port, open: opts.open });
  });

program.parse();
