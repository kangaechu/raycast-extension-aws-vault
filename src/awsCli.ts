import { execFileAsync, resolveExecutable, splitLines } from "./executable";

// https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html
const federationEndpoint = "https://signin.aws.amazon.com/federation";
const consoleUrl = "https://console.aws.amazon.com/";

interface ProcessCredentials {
  AccessKeyId?: string;
  SecretAccessKey?: string;
  SessionToken?: string;
}

export async function listProfiles({ awsCliPath }: Preferences): Promise<string[]> {
  const file = await resolveExecutable(awsCliPath, "AWS CLI");
  const { stdout } = await execFileAsync(file, ["configure", "list-profiles"]);
  return splitLines(stdout);
}

export async function login(profile: string, { awsCliPath }: Preferences): Promise<string> {
  const file = await resolveExecutable(awsCliPath, "AWS CLI");
  const { stdout } = await execFileAsync(file, [
    "configure",
    "export-credentials",
    "--profile",
    profile,
    "--format",
    "process",
  ]);
  const credentials = JSON.parse(stdout) as ProcessCredentials;
  if (!credentials.AccessKeyId || !credentials.SecretAccessKey || !credentials.SessionToken) {
    throw new Error(
      `Profile "${profile}" does not provide temporary credentials. Use an SSO or role profile, or use aws-vault.`,
    );
  }

  // POST keeps the credentials out of the request URL
  const response = await fetch(federationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      Action: "getSigninToken",
      Session: JSON.stringify({
        sessionId: credentials.AccessKeyId,
        sessionKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      }),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get a sign-in token: ${response.status} ${response.statusText}`);
  }
  const { SigninToken } = (await response.json()) as { SigninToken?: string };
  if (!SigninToken) {
    throw new Error("Failed to get a sign-in token: no SigninToken in the response");
  }

  const params = new URLSearchParams({ Action: "login", Destination: consoleUrl, SigninToken });
  return `${federationEndpoint}?${params}`;
}
