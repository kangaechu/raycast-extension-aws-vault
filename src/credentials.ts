import { Cache } from "@raycast/api";
import * as awsCli from "./awsCli";
import { readAwsConfig } from "./awsConfig";
import * as awsVault from "./awsVault";
import { resolveExecutable } from "./executable";

export type Tool = "aws-vault" | "aws-cli";

export interface Profile {
  name: string;
  // Guessed from the cached credentials; undefined until they are known
  tool?: Tool;
}

// Profiles whose credentials are stored in aws-vault, as of the last login
const cache = new Cache();
const credentialsKey = "aws-vault-credentials";

// Reading the keychain may ask to unlock it, and the dialog closes the Raycast window.
// So the tool is decided on login, not when listing profiles.
export async function login(
  profile: Profile,
  preferences: Preferences,
  onSignIn?: (loginProfile: string) => void,
): Promise<string> {
  const tool = await resolveTool(profile.name, preferences);
  return tool === "aws-cli"
    ? awsCli.login(profile.name, preferences, onSignIn)
    : awsVault.login(profile.name, preferences);
}

// Lists profiles without reading the keychain
export async function listProfiles(preferences: Preferences): Promise<Profile[]> {
  const [vault, cli] = await Promise.allSettled([
    resolveExecutable(preferences.entrypoint, "aws-vault").then(() => readAwsConfig()),
    awsCli.listProfiles(preferences),
  ]);
  if (vault.status === "rejected" && cli.status === "rejected") {
    throw new Error(`${errorMessage(vault.reason)}\n${errorMessage(cli.reason)}`);
  }
  if (vault.status === "rejected") {
    return withTool(cli.status === "fulfilled" ? cli.value : [], "aws-cli");
  }
  if (cli.status === "rejected") {
    return withTool(vault.value.profiles, "aws-vault");
  }

  const credentials = cachedCredentials();
  const names = [...new Set([...vault.value.profiles, ...cli.value])];
  return names.map((name) => ({
    name,
    tool: credentials && toolFor(name, credentials, vault.value.sourceProfiles),
  }));
}

async function resolveTool(profile: string, preferences: Preferences): Promise<Tool> {
  const [vault, cli] = await Promise.allSettled([
    resolveExecutable(preferences.entrypoint, "aws-vault"),
    resolveExecutable(preferences.awsCliPath, "AWS CLI"),
  ]);
  if (vault.status === "rejected") {
    return "aws-cli";
  }
  if (cli.status === "rejected") {
    return "aws-vault";
  }

  const [credentials, { sourceProfiles }] = await Promise.all([awsVault.listCredentials(preferences), readAwsConfig()]);
  cache.set(credentialsKey, JSON.stringify(credentials));
  return toolFor(profile, new Set(credentials), sourceProfiles);
}

function cachedCredentials(): Set<string> | undefined {
  const value = cache.get(credentialsKey);
  return value === undefined ? undefined : new Set(JSON.parse(value) as string[]);
}

function withTool(names: string[], tool: Tool): Profile[] {
  return names.map((name) => ({ name, tool }));
}

// Uses aws-vault for profiles whose credentials (directly or via source_profile) are stored in aws-vault,
// and the AWS CLI for the others
function toolFor(profile: string, credentials: Set<string>, sourceProfiles: Map<string, string>): Tool {
  const visited = new Set<string>();
  for (let name: string | undefined = profile; name && !visited.has(name); name = sourceProfiles.get(name)) {
    if (credentials.has(name)) {
      return "aws-vault";
    }
    visited.add(name);
  }
  return "aws-cli";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
