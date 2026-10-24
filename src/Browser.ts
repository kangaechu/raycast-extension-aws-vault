import { BrowserName, MfaPrompt } from "./types";
import { execFile } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

interface BrowserConfig {
  name: BrowserName;
  entrypoint: string;
  mfaPrompt: MfaPrompt;
}

export class Browser {
  readonly entrypoint: string;
  readonly mfaPrompt: MfaPrompt;
  readonly browser: string;
  readonly profileArgsFunc: (profile: string) => string[];

  constructor(config: BrowserConfig) {
    this.browser = config.name;
    this.entrypoint = config.entrypoint;
    this.mfaPrompt = config.mfaPrompt;
    const appSupport = join(homedir(), "Library", "Application Support");
    switch (config.name) {
      case "Google Chrome":
        this.profileArgsFunc = (profile) => [
          `--user-data-dir=${join(appSupport, "Google", "Chrome", "aws-vault", profile)}`,
        ];
        break;
      case "firefox":
        this.profileArgsFunc = (profile) => [
          "--profile",
          join(appSupport, "Firefox", "Profiles", "aws-vault", profile),
        ];
        break;
      case "Brave Browser":
        this.profileArgsFunc = (profile) => [
          `--user-data-dir=${join(appSupport, "BraveSoftware", "Brave-Browser", "aws-vault", profile)}`,
        ];
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
      await execFileAsync("open", ["-na", this.browser, "--args", ...this.profileArgsFunc(profile), url]);
      await toast.hide();
    } catch (error) {
      console.error(error);
      toast.style = Toast.Style.Failure;
      toast.title = `Error while opening ${this.browser}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }
}
