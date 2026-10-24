import { execFileAsync, resolveExecutable, splitLines } from "./executable";

export async function listProfiles({ entrypoint }: Preferences): Promise<string[]> {
  const file = await resolveExecutable(entrypoint, "aws-vault");
  const { stdout } = await execFileAsync(file, ["list", "--profiles"]);
  return splitLines(stdout);
}

export async function login(profile: string, { entrypoint, mfaPrompt }: Preferences): Promise<string> {
  const file = await resolveExecutable(entrypoint, "aws-vault");
  const promptArgs = mfaPrompt === "default" ? [] : [`--prompt=${mfaPrompt}`];
  const { stdout, stderr } = await execFileAsync(file, ["login", profile, "--stdout", ...promptArgs]);
  const url = stdout.trim();
  if (url === "") {
    throw new Error(stderr.trim() || "aws-vault login returned no URL");
  }
  return url;
}

// Profiles whose credentials are stored in aws-vault
export async function listCredentials({ entrypoint }: Preferences): Promise<string[]> {
  const file = await resolveExecutable(entrypoint, "aws-vault");
  const { stdout } = await execFileAsync(file, ["list", "--credentials"]);
  return splitLines(stdout);
}
