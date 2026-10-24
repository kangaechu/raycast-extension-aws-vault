import { execFile } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";
import { login } from "./awsVault";

const execFileAsync = promisify(execFile);

type BrowserName = Preferences["browserName"];
type Launcher = (profile: string, url: string) => Promise<void>;

const appSupport = join(homedir(), "Library", "Application Support");

// Colors supported by the "Open external links in a container" add-on
const containerColors = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];

const launchers: Record<BrowserName, Launcher> = {
  "Google Chrome": (profile, url) =>
    openNewInstance(
      "Google Chrome",
      [`--user-data-dir=${join(appSupport, "Google", "Chrome", "aws-vault", profile)}`],
      url,
    ),
  firefox: (profile, url) =>
    openNewInstance("Firefox", ["--profile", join(appSupport, "Firefox", "Profiles", "aws-vault", profile)], url),
  // Requires the "Open external links in a container" add-on
  // https://addons.mozilla.org/firefox/addon/open-url-in-container/
  "Firefox Containers": async (profile, url) => {
    const params = `name=${encodeURIComponent(profile)}&color=${containerColor(profile)}&url=${encodeURIComponent(url)}`;
    await execFileAsync("open", ["-a", "Firefox", `ext+container:${params}`]);
  },
  "Brave Browser": (profile, url) =>
    openNewInstance(
      "Brave Browser",
      [`--user-data-dir=${join(appSupport, "BraveSoftware", "Brave-Browser", "aws-vault", profile)}`],
      url,
    ),
};

export async function openConsole(profile: string, preferences: Preferences): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Logging in to ${profile}` });

  let url: string;
  try {
    url = await login(profile, preferences);
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Error while running aws-vault login";
    toast.message = errorMessage(error);
    return;
  }

  try {
    const launch = launchers[preferences.browserName];
    if (!launch) {
      throw new Error(`unknown browser: ${preferences.browserName}`);
    }
    await launch(profile, url);
    await toast.hide();
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = `Error while opening ${preferences.browserName}`;
    toast.message = errorMessage(error);
  }
}

async function openNewInstance(app: string, profileArgs: string[], url: string): Promise<void> {
  await execFileAsync("open", ["-na", app, "--args", ...profileArgs, url]);
}

// Picks a stable container color from the profile name
function containerColor(profile: string): string {
  let hash = 0;
  for (const c of profile) {
    hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  }
  return containerColors[hash % containerColors.length];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
