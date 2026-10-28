# Raycast Extension: aws-vault login

This is an extension for [Raycast](https://www.raycast.com/) which opens the AWS management console via [aws-vault](https://github.com/ByteNess/aws-vault).

This extension is transplanted from [kangaechu/aws-vault-alfred-workflow](https://github.com/kangaechu/aws-vault-alfred-workflow) which works with alfred.

# Installation

```
$ npm i
$ npm run build
```

Then import extension by Raycast command.

See more [official document](https://developers.raycast.com/basics/import-an-extension) how to import extension.

# Support browsers

* Google Chrome (default)
* Firefox
* Firefox Containers
* Brave Browser

Google Chrome and Brave Browser open each profile as a browser profile (directory `aws-<profile>`) in the running browser.
The browser profile is created on first use; rename it in the browser if you like.
Profiles created by older versions under `~/Library/Application Support/Google/Chrome/aws-vault/` or
`~/Library/Application Support/BraveSoftware/Brave-Browser/aws-vault/` are no longer used and can be deleted.

With Firefox (not Firefox Containers), the console login URL is passed to the browser as a command line argument,
so it is visible in the process list (e.g. `ps`) while the browser is running.
The URL contains a sign-in token that is valid until it expires.

## Firefox Containers

Opens each profile in a separate container tab of the same Firefox window.
Install the [Open external links in a container](https://addons.mozilla.org/firefox/addon/open-url-in-container/) add-on.

A container named after the profile is created on first use, with a color derived from the profile name.
The color is only applied when the container is created; delete the container to recreate it.

[Firefox Multi-Account Containers](https://addons.mozilla.org/firefox/addon/multi-account-containers/) is optional but handy for managing containers.

# aws-vault and AWS CLI

Profiles from both aws-vault and the AWS CLI are listed, and the tool used for each profile is shown as a tag.

* Profiles whose credentials are stored in aws-vault (`aws-vault list --credentials`), directly or via `source_profile`, are opened with aws-vault.
* The other profiles (SSO, `credential_process`, etc.) are opened with the AWS CLI.
* If only one of the tools is installed, all profiles are opened with it.

Reading the aws-vault keychain may ask to unlock it (password or Touch ID), and the dialog closes the Raycast window.
So profiles are listed from `~/.aws/config` and `aws configure list-profiles` without reading the keychain,
and the tool is decided when a profile is opened. The tag shows the tool as of the last login, and is not shown until then.

With the AWS CLI, the login URL is built from `aws configure export-credentials` and the
[AWS federation endpoint](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html).

* The profile must provide temporary credentials (IAM Identity Center (SSO), `role_arn`, `credential_process`, etc.). Long-term IAM user access keys are not supported.
* For SSO profiles, run `aws sso login` beforehand when the session has expired.
* If the profile, or its `source_profile`, is signed in with `aws login` and the session is missing or expired, the extension runs `aws login --profile <profile>`.
  The sign-in page opens in the default browser. Raycast's window closes then, so select the profile again after signing in.
* Profiles that ask for an MFA code on the terminal are not supported.

# MFA

If a profile requires MFA, a dialog asks for the MFA code (`aws-vault login --prompt=osascript`).
Set the "MFA Prompt" preference to "aws-vault default" to use `AWS_VAULT_PROMPT` or aws-vault's default prompt instead.

# aws-vault backend

Raycast does not load your shell environment, so `AWS_VAULT_BACKEND`, `AWS_VAULT_KEYCHAIN_NAME` and
`AWS_VAULT_FILE_PASSPHRASE` set in e.g. `.zshrc` are not applied. Set them in the extension preferences instead.

* "aws-vault Backend" is passed as `--backend` (keychain, file, pass, passage). "aws-vault default" passes nothing.
* "aws-vault Keychain" is passed as `--keychain` when set.
* "aws-vault File Passphrase" is passed as `AWS_VAULT_FILE_PASSPHRASE`. It is required with the "file" backend
  because aws-vault asks for the passphrase on the terminal otherwise.

## Touch ID

Enable "aws-vault Touch ID" to unlock the aws-vault keychain with Touch ID when it is locked (`--biometrics`).
It requires aws-vault 7 ([ByteNess/aws-vault](https://github.com/ByteNess/aws-vault)) and the keychain backend.

The first time Touch ID is used, aws-vault asks for the keychain password on the terminal and stores it in the login keychain.
Raycast can't show that prompt, so run this once in a terminal beforehand:

```shell
security lock-keychain aws-vault.keychain
aws-vault list --biometrics
```

How often Touch ID is requested follows the lock settings of the aws-vault keychain
(see [the aws-vault documentation](https://github.com/ByteNess/aws-vault/blob/main/docs/content/docs/backends/index.md#touch-id)).

# Session duration

The extension does not pass `--duration` to `aws-vault login`, so the duration is decided by aws-vault.
To change it, set `duration_seconds` for each profile in `~/.aws/config`.

```ini
[profile admin]
source_profile = me
role_arn = arn:aws:iam::123456789012:role/Admin
duration_seconds = 43200
```

* `duration_seconds` applies to profiles with `role_arn` (AssumeRole). The default is 1 hour.
* It can't exceed the `MaxSessionDuration` of the role (1 to 12 hours), and role chaining is limited to 1 hour.
* Profiles without `role_arn` (GetFederationToken) always use 1 hour, because `AWS_FEDERATION_TOKEN_TTL` set in the shell is not applied in Raycast.
* With the AWS CLI, the duration of SSO profiles is decided by the permission set.

# Requirements

* [aws-vault](https://github.com/ByteNess/aws-vault) or [AWS CLI v2](https://aws.amazon.com/cli/)
