import { execFile } from "child_process";
import { constants } from "fs";
import { access, stat } from "fs/promises";
import { delimiter, isAbsolute, join, resolve } from "path";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

// Spawning a missing executable can crash Raycast, so resolve it to an existing file first.
export async function resolveExecutable(entrypoint: string, name: string): Promise<string> {
  const candidates = entrypoint.includes("/")
    ? [isAbsolute(entrypoint) ? entrypoint : resolve(entrypoint)]
    : (process.env.PATH ?? "")
        .split(delimiter)
        .filter((dir) => dir !== "")
        .map((dir) => join(dir, entrypoint));

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) {
        await access(candidate, constants.X_OK);
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error(`${name} not found: "${entrypoint}". Set the full path to ${name} in the extension preferences.`);
}

export function splitLines(stdout: string): string[] {
  return stdout
    .split(/\n/)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}
