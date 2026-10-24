import { Action, ActionPanel, List, Detail, getPreferenceValues } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { BrowserName, MfaPrompt } from "./types";
import { Browser } from "./Browser";

interface Preferences {
  browserName: BrowserName;
  entrypoint: string;
  mfaPrompt: MfaPrompt;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const browser = new Browser({
    name: preferences.browserName,
    ...preferences,
  });

  const { isLoading, data, error } = useExec(preferences.entrypoint, ["list", "--profiles"], {
    parseOutput: ({ stdout, stderr, exitCode, error }) => {
      if (error) throw error;
      if (exitCode !== 0) throw new Error(stderr || `aws-vault exited with code ${exitCode}`);
      return stdout
        .split(/\n/)
        .map((v) => v.trim())
        .filter((v) => v !== "");
    },
    failureToastOptions: { title: "Error while running aws-vault list" },
  });

  if (error) {
    return <Detail markdown={error.message} />;
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No profiles found" description="Configure profiles in ~/.aws/config" />
      {data?.map((profile) => (
        <List.Item
          key={profile}
          icon="management-console.png"
          title={profile}
          actions={
            <ActionPanel>
              <Action title="Open Browser" onAction={() => browser.open(profile)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
