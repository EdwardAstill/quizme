#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { program } from "commander";
import { createServer } from "vite";
import open from "open";

const rootDir = import.meta.dir;

program
  .name("quizme")
  .description("Launch a quiz in your browser")
  .argument("[file]", "path to a quiz JSON file (optional — opens file picker if omitted)")
  .option("-p, --port <number>", "port to serve on", "3000")
  .option("-t, --test", "run the built-in sample quiz")
  .option("--no-open", "don't auto-open the browser")
  .action(async (file: string | undefined, opts: { port: string; test?: boolean; open: boolean }) => {
    let quizData: unknown = null;

    if (opts.test) {
      file = join(rootDir, "examples", "sample-quiz.json");
    }

    if (file) {
      const quizPath = resolve(file);
      if (!existsSync(quizPath)) {
        console.error(`Error: file not found: ${quizPath}`);
        process.exit(1);
      }
      try {
        quizData = await Bun.file(quizPath).json();
      } catch {
        console.error("Error: could not parse JSON file.");
        process.exit(1);
      }
    }

    const port = parseInt(opts.port, 10);

    const server = await createServer({
      configFile: resolve(rootDir, "vite.config.ts"),
      server: { port },
      plugins: [
        {
          name: "quizme-api",
          configureServer(server) {
            server.middlewares.use("/api/quiz", (_req, res) => {
              if (quizData) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(quizData));
              } else {
                res.statusCode = 404;
                res.end();
              }
            });
          },
        },
      ],
    });

    await server.listen();
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

program.parse();
