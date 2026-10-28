import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export interface AwsConfig {
  profiles: string[];
  // source_profile of each profile
  sourceProfiles: Map<string, string>;
  // Profiles signed in with `aws login`
  loginProfiles: Set<string>;
}

// Reads the AWS config file directly, since aws-vault list reads the keychain and may ask to unlock it
export async function readAwsConfig(): Promise<AwsConfig> {
  const file = process.env.AWS_CONFIG_FILE || join(homedir(), ".aws", "config");
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch {
    return { profiles: [], sourceProfiles: new Map(), loginProfiles: new Set() };
  }

  const profiles = new Set<string>();
  const sourceProfiles = new Map<string, string>();
  const loginProfiles = new Set<string>();
  let profile: string | undefined;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const section = line.match(/^\[\s*(.+?)\s*\]$/);
    if (section) {
      const name = section[1];
      profile = name === "default" ? name : name.match(/^profile\s+(.+)$/)?.[1];
      if (profile) {
        profiles.add(profile);
      }
      continue;
    }
    const sourceProfile = line.match(/^source_profile\s*=\s*(.+)$/);
    if (profile && sourceProfile) {
      sourceProfiles.set(profile, sourceProfile[1].trim());
    }
    if (profile && /^login_session\s*=/.test(line)) {
      loginProfiles.add(profile);
    }
  }
  return { profiles: [...profiles], sourceProfiles, loginProfiles };
}

// Finds the profile signed in with `aws login`, from the profile itself to its source_profile chain
export function findLoginProfile(profile: string, { sourceProfiles, loginProfiles }: AwsConfig): string | undefined {
  const visited = new Set<string>();
  for (let name: string | undefined = profile; name && !visited.has(name); name = sourceProfiles.get(name)) {
    if (loginProfiles.has(name)) {
      return name;
    }
    visited.add(name);
  }
  return undefined;
}
