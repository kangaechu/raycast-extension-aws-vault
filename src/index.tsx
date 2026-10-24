import { Action, ActionPanel, Detail, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listProfiles } from "./credentials";
import { openConsole } from "./Browser";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Index>();

  const { isLoading, data, error, revalidate } = useCachedPromise(listProfiles, [preferences], {
    failureToastOptions: { title: "Error while listing profiles" },
  });

  if (error) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Error while listing profiles\n\n\`\`\`\n${error.message}\n\`\`\``}
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
          key={profile.name}
          icon="management-console.png"
          title={profile.name}
          accessories={[{ tag: profile.tool === "aws-vault" ? "aws-vault" : "AWS CLI" }]}
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
