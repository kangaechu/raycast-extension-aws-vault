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

Except for Firefox Containers, the console login URL is passed to the browser as a command line argument,
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

With the AWS CLI, the login URL is built from `aws configure export-credentials` and the
[AWS federation endpoint](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html).

* The profile must provide temporary credentials (IAM Identity Center (SSO), `role_arn`, `credential_process`, etc.). Long-term IAM user access keys are not supported.
* For SSO profiles, run `aws sso login` beforehand when the session has expired.
* Profiles that ask for an MFA code on the terminal are not supported.

# MFA

If a profile requires MFA, a dialog asks for the MFA code (`aws-vault login --prompt=osascript`).
Set the "MFA Prompt" preference to "aws-vault default" to use `AWS_VAULT_PROMPT` or aws-vault's default prompt instead.

# Requirements

* [aws-vault](https://github.com/ByteNess/aws-vault) or [AWS CLI v2](https://aws.amazon.com/cli/)
