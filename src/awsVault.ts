import { execFileAsync, resolveExecutable, splitLines } from "./executable";

// Raycast does not load the shell environment, so pass the backend settings explicitly
async function run(args: string[], { entrypoint, backend, keychain, filePassphrase, biometrics }: Preferences) {
  const file = await resolveExecutable(entrypoint, "aws-vault");
  const globalArgs = [
    ...(backend === "default" ? [] : [`--backend=${backend}`]),
    ...(keychain?.trim() ? [`--keychain=${keychain.trim()}`] : []),
    // Only passed when enabled, since aws-vault 6 doesn't know the flag
    ...(biometrics ? ["--biometrics"] : []),
  ];
  const env = filePassphrase ? { ...process.env, AWS_VAULT_FILE_PASSPHRASE: filePassphrase } : process.env;
  return execFileAsync(file, [...globalArgs, ...args], { env });
}

export async function listProfiles(preferences: Preferences): Promise<string[]> {
  const { stdout } = await run(["list", "--profiles"], preferences);
  return splitLines(stdout);
}

export async function login(profile: string, preferences: Preferences): Promise<string> {
  const { mfaPrompt } = preferences;
  const promptArgs = mfaPrompt === "default" ? [] : [`--prompt=${mfaPrompt}`];
  const { stdout, stderr } = await run(["login", profile, "--stdout", ...promptArgs], preferences);
  const url = stdout.trim();
  if (url === "") {
    throw new Error(stderr.trim() || "aws-vault login returned no URL");
  }
  return url;
}

// Profiles whose credentials are stored in aws-vault
export async function listCredentials(preferences: Preferences): Promise<string[]> {
  const { stdout } = await run(["list", "--credentials"], preferences);
  return splitLines(stdout);
}
