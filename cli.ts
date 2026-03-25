#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { createServer } from "vite";
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

    const server = await createServer({
      configFile: resolve(__dirname, "vite.config.ts"),
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
