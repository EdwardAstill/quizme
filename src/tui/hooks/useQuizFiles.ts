import { useState, useCallback } from "react";
import { readdirSync, unlinkSync, existsSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_ROOT, ensureConfigRoot, folderNameToPath, configDirForCwd } from "../utils/configDir.js";

export type ViewMode = "local" | "config";

const LOCAL_DIR = join(process.cwd(), ".quizme");

export interface QuizFile {
  name: string;
  filename: string;
  path: string;
  folder: string;
  folderLabel: string;
  source: ViewMode;
}

export interface FolderInfo {
  name: string;
  label: string;
  path: string;
  hasSpec: boolean;
  quizCount: number;
  source: ViewMode;
}

function scanLocalQuizzes(): QuizFile[] {
  if (!existsSync(LOCAL_DIR)) return [];
  try {
    return readdirSync(LOCAL_DIR)
      .filter((f) => f.endsWith(".quiz.md"))
      .sort()
      .map((filename) => ({
        name: filename.replace(/\.quiz\.md$/, ""),
        filename,
        path: join(LOCAL_DIR, filename),
        folder: "local",
        folderLabel: ".quizme/",
        source: "local" as ViewMode,
      }));
  } catch {
    return [];
  }
}

function scanLocalFolder(): FolderInfo | null {
  if (!existsSync(LOCAL_DIR)) return null;
  try {
    const files = readdirSync(LOCAL_DIR);
    const quizCount = files.filter((f) => f.endsWith(".quiz.md")).length;
    if (quizCount === 0) return null;
    return {
      name: "local",
      label: ".quizme/",
      path: LOCAL_DIR,
      hasSpec: files.some((f) => f.endsWith(".quizspec")),
      quizCount,
      source: "local",
    };
  } catch {
    return null;
  }
}

function scanConfigQuizzes(): QuizFile[] {
  ensureConfigRoot();
  const results: QuizFile[] = [];
  try {
    const folders = readdirSync(CONFIG_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const folder of folders) {
      const folderPath = join(CONFIG_ROOT, folder);
      const files = readdirSync(folderPath).filter((f) => f.endsWith(".quiz.md")).sort();
      const label = folderNameToPath(folder).replace(/^\/home\/[^/]+\//, "~/");
      for (const filename of files) {
        results.push({
          name: filename.replace(/\.quiz\.md$/, ""),
          filename,
          path: join(folderPath, filename),
          folder,
          folderLabel: label,
          source: "config",
        });
      }
    }
  } catch {
    // config dir doesn't exist yet
  }
  return results;
}

function scanConfigFolders(): FolderInfo[] {
  ensureConfigRoot();
  try {
    return readdirSync(CONFIG_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const folderPath = join(CONFIG_ROOT, d.name);
        const files = readdirSync(folderPath);
        return {
          name: d.name,
          label: folderNameToPath(d.name).replace(/^\/home\/[^/]+\//, "~/"),
          path: folderPath,
          hasSpec: files.some((f) => f.endsWith(".quizspec")),
          quizCount: files.filter((f) => f.endsWith(".quiz.md")).length,
          source: "config" as ViewMode,
        };
      })
      .filter((f) => f.quizCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function useQuizFiles() {
  const [viewMode, setViewMode] = useState<ViewMode>("local");
  const [folders, setFolders] = useState<FolderInfo[]>(() =>
    viewMode === "local" ? (scanLocalFolder() ? [scanLocalFolder()!] : []) : scanConfigFolders()
  );
  const [allQuizzes, setAllQuizzes] = useState<QuizFile[]>(() =>
    viewMode === "local" ? scanLocalQuizzes() : scanConfigQuizzes()
  );

  const refresh = useCallback((mode?: ViewMode) => {
    const m = mode ?? viewMode;
    if (m === "local") {
      const local = scanLocalFolder();
      setFolders(local ? [local] : []);
      setAllQuizzes(scanLocalQuizzes());
    } else {
      setFolders(scanConfigFolders());
      setAllQuizzes(scanConfigQuizzes());
    }
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "local" ? "config" : "local";
      // refresh with the new mode
      if (next === "local") {
        const local = scanLocalFolder();
        setFolders(local ? [local] : []);
        setAllQuizzes(scanLocalQuizzes());
      } else {
        setFolders(scanConfigFolders());
        setAllQuizzes(scanConfigQuizzes());
      }
      return next;
    });
  }, []);

  const deleteQuiz = useCallback((quizPath: string) => {
    try {
      unlinkSync(quizPath);
    } catch {
      // file already gone
    }
    // clean up .quizme/ if it's now empty of quizzes
    if (viewMode === "local" && existsSync(LOCAL_DIR)) {
      try {
        const remaining = readdirSync(LOCAL_DIR).filter((f) => f.endsWith(".quiz.md"));
        if (remaining.length === 0) {
          rmSync(LOCAL_DIR, { recursive: true });
        }
      } catch {
        // already gone
      }
    }
    refresh();
  }, [refresh, viewMode]);

  const moveToConfig = useCallback((quiz: QuizFile) => {
    const destDir = configDirForCwd(process.cwd());
    mkdirSync(destDir, { recursive: true });
    const destPath = join(destDir, quiz.filename);
    copyFileSync(quiz.path, destPath);
    unlinkSync(quiz.path);
    // clean up .quizme/ if no quiz files remain
    try {
      const remaining = readdirSync(LOCAL_DIR).filter((f) => f.endsWith(".quiz.md"));
      if (remaining.length === 0) {
        rmSync(LOCAL_DIR, { recursive: true });
      }
    } catch {
      // already gone
    }
    refresh();
  }, [refresh]);

  const moveToLocal = useCallback((quiz: QuizFile) => {
    mkdirSync(LOCAL_DIR, { recursive: true });
    const destPath = join(LOCAL_DIR, quiz.filename);
    copyFileSync(quiz.path, destPath);
    unlinkSync(quiz.path);
    refresh();
  }, [refresh]);

  return { viewMode, folders, allQuizzes, deleteQuiz, moveToConfig, moveToLocal, toggleViewMode, refresh };
}
