import * as awsCli from "./awsCli";
import { readSourceProfiles } from "./awsConfig";
import * as awsVault from "./awsVault";

export type Tool = "aws-vault" | "aws-cli";

export interface Profile {
  name: string;
  tool: Tool;
}

const tools = { "aws-vault": awsVault, "aws-cli": awsCli };

export function login(profile: Profile, preferences: Preferences): Promise<string> {
  return tools[profile.tool].login(profile.name, preferences);
}

function withTool(names: string[], tool: Tool): Profile[] {
  return names.map((name) => ({ name, tool }));
}

// Uses aws-vault for profiles whose credentials (directly or via source_profile) are stored in aws-vault,
// and the AWS CLI for the others
export async function listProfiles(preferences: Preferences): Promise<Profile[]> {
  const [vault, cli] = await Promise.allSettled([awsVault.listProfiles(preferences), awsCli.listProfiles(preferences)]);
  if (vault.status === "rejected" && cli.status === "rejected") {
    throw new Error(`${errorMessage(vault.reason)}\n${errorMessage(cli.reason)}`);
  }
  if (vault.status === "rejected") {
    return withTool(cli.status === "fulfilled" ? cli.value : [], "aws-cli");
  }
  if (cli.status === "rejected") {
    return withTool(vault.value, "aws-vault");
  }

  const [credentials, sourceProfiles] = await Promise.all([
    awsVault.listCredentials(preferences).then((names) => new Set(names)),
    readSourceProfiles(),
  ]);
  const names = [...new Set([...vault.value, ...cli.value])];
  return names.map((name) => ({
    name,
    tool: hasVaultCredentials(name, credentials, sourceProfiles) ? "aws-vault" : "aws-cli",
  }));
}

function hasVaultCredentials(profile: string, credentials: Set<string>, sourceProfiles: Map<string, string>): boolean {
  const visited = new Set<string>();
  for (let name: string | undefined = profile; name && !visited.has(name); name = sourceProfiles.get(name)) {
    if (credentials.has(name)) {
      return true;
    }
    visited.add(name);
  }
  return false;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
