import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export interface AwsConfig {
  profiles: string[];
  // source_profile of each profile
  sourceProfiles: Map<string, string>;
}

// Reads the AWS config file directly, since aws-vault list reads the keychain and may ask to unlock it
export async function readAwsConfig(): Promise<AwsConfig> {
  const file = process.env.AWS_CONFIG_FILE || join(homedir(), ".aws", "config");
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch {
    return { profiles: [], sourceProfiles: new Map() };
  }

  const profiles = new Set<string>();
  const sourceProfiles = new Map<string, string>();
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
  }
  return { profiles: [...profiles], sourceProfiles };
}
