import { execFile } from "child_process";
import { constants } from "fs";
import { access, stat } from "fs/promises";
import { delimiter, isAbsolute, join, resolve } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Spawning a missing executable can crash Raycast, so resolve it to an existing file first.
async function resolveEntrypoint(entrypoint: string): Promise<string> {
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
  throw new Error(`aws-vault not found: "${entrypoint}". Set the full path to aws-vault in the extension preferences.`);
}

export async function listProfiles({ entrypoint }: Preferences): Promise<string[]> {
  const file = await resolveEntrypoint(entrypoint);
  const { stdout } = await execFileAsync(file, ["list", "--profiles"]);
  return stdout
    .split(/\n/)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export async function login(profile: string, { entrypoint, mfaPrompt }: Preferences): Promise<string> {
  const file = await resolveEntrypoint(entrypoint);
  const promptArgs = mfaPrompt === "default" ? [] : [`--prompt=${mfaPrompt}`];
  const { stdout, stderr } = await execFileAsync(file, ["login", profile, "--stdout", ...promptArgs]);
  const url = stdout.trim();
  if (url === "") {
    throw new Error(stderr.trim() || "aws-vault login returned no URL");
  }
  return url;
}
