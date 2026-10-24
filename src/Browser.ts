import { BrowserName, MfaPrompt } from "./types";
import { execFile } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

// Colors supported by the "Open external links in a container" add-on
const containerColors = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];

interface BrowserConfig {
  name: BrowserName;
  entrypoint: string;
  mfaPrompt: MfaPrompt;
}

export class Browser {
  readonly entrypoint: string;
  readonly mfaPrompt: MfaPrompt;
  readonly browser: string;
  readonly launchFunc: (profile: string, url: string) => Promise<void>;

  constructor(config: BrowserConfig) {
    this.browser = config.name;
    this.entrypoint = config.entrypoint;
    this.mfaPrompt = config.mfaPrompt;
    const appSupport = join(homedir(), "Library", "Application Support");
    switch (config.name) {
      case "Google Chrome":
        this.launchFunc = (profile, url) =>
          this.openNewInstance([`--user-data-dir=${join(appSupport, "Google", "Chrome", "aws-vault", profile)}`], url);
        break;
      case "firefox":
        this.launchFunc = (profile, url) =>
          this.openNewInstance(["--profile", join(appSupport, "Firefox", "Profiles", "aws-vault", profile)], url);
        break;
      case "Firefox Containers":
        // Requires the "Open external links in a container" add-on
        // https://addons.mozilla.org/firefox/addon/open-url-in-container/
        this.launchFunc = (profile, url) =>
          execFileAsync("open", [
            "-a",
            "Firefox",
            `ext+container:name=${encodeURIComponent(profile)}&color=${containerColor(profile)}&url=${encodeURIComponent(url)}`,
          ]).then(() => undefined);
        break;
      case "Brave Browser":
        this.launchFunc = (profile, url) =>
          this.openNewInstance(
            [`--user-data-dir=${join(appSupport, "BraveSoftware", "Brave-Browser", "aws-vault", profile)}`],
            url,
          );
        break;
      default:
        throw Error(`unknown browser: ${config.name}`);
    }
  }

  public async open(profile: string): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Logging in to ${profile}` });

    let url: string;
    try {
      const promptArgs = this.mfaPrompt === "default" ? [] : [`--prompt=${this.mfaPrompt}`];
      const { stdout, stderr } = await execFileAsync(this.entrypoint, ["login", profile, "--stdout", ...promptArgs]);
      url = stdout.trim();
      if (url === "") {
        throw new Error(stderr.trim() || "aws-vault login returned no URL");
      }
    } catch (error) {
      console.error(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Error while running aws-vault login";
      toast.message = error instanceof Error ? error.message : String(error);
      return;
    }

    try {
      await this.launchFunc(profile, url);
      await toast.hide();
    } catch (error) {
      console.error(error);
      toast.style = Toast.Style.Failure;
      toast.title = `Error while opening ${this.browser}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  private async openNewInstance(profileArgs: string[], url: string): Promise<void> {
    await execFileAsync("open", ["-na", this.browser, "--args", ...profileArgs, url]);
  }
}

// Picks a stable container color from the profile name
function containerColor(profile: string): string {
  let hash = 0;
  for (const c of profile) {
    hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  }
  return containerColors[hash % containerColors.length];
}
