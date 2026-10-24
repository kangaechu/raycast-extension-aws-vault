import { Action, ActionPanel, Detail, Icon, List, getPreferenceValues } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { openConsole } from "./Browser";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Index>();

  const { isLoading, data, error, revalidate } = useExec(preferences.entrypoint, ["list", "--profiles"], {
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
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Error while running aws-vault list\n\n\`\`\`\n${error.message}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
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
              <Action title="Open Browser" icon={Icon.Globe} onAction={() => openConsole(profile, preferences)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
