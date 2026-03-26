import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";

export const CONFIG_ROOT = join(homedir(), ".config", "quizme");

/** Convert CWD to a folder name: ~/projects/physics → projects--physics */
export function cwdToFolderName(cwd: string): string {
  const rel = relative(homedir(), cwd);
  return rel.replace(/\//g, "--");
}

/** Reverse: folder name back to absolute path */
export function folderNameToPath(folderName: string): string {
  return join(homedir(), folderName.replace(/--/g, "/"));
}

/** Get the config folder path for a given CWD */
export function configDirForCwd(cwd: string): string {
  return join(CONFIG_ROOT, cwdToFolderName(cwd));
}

export function ensureConfigRoot(): void {
  mkdirSync(CONFIG_ROOT, { recursive: true });
}

export function ensureConfigDir(cwd: string): string {
  const dir = configDirForCwd(cwd);
  mkdirSync(dir, { recursive: true });
  return dir;
}
