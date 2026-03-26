import { spawn } from "node:child_process";
import { platform } from "node:os";

export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cmd: string;
    let args: string[];

    if (platform() === "darwin") {
      cmd = "pbcopy";
      args = [];
    } else if (process.env.WAYLAND_DISPLAY) {
      cmd = "wl-copy";
      args = [];
    } else {
      cmd = "xclip";
      args = ["-selection", "clipboard"];
    }

    try {
      const proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
      proc.stdin?.write(text);
      proc.stdin?.end();
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}
