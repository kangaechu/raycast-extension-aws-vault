import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// Reads source_profile of each profile from the AWS config file
export async function readSourceProfiles(): Promise<Map<string, string>> {
  const file = process.env.AWS_CONFIG_FILE || join(homedir(), ".aws", "config");
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch {
    return new Map();
  }

  const sourceProfiles = new Map<string, string>();
  let profile: string | undefined;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const section = line.match(/^\[\s*(.+?)\s*\]$/);
    if (section) {
      const name = section[1];
      profile = name === "default" ? name : name.match(/^profile\s+(.+)$/)?.[1];
      continue;
    }
    const sourceProfile = line.match(/^source_profile\s*=\s*(.+)$/);
    if (profile && sourceProfile) {
      sourceProfiles.set(profile, sourceProfile[1].trim());
    }
  }
  return sourceProfiles;
}
