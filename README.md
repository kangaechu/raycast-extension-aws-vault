# Raycast Extension: aws-vault login

This is an extension for [Raycast](https://www.raycast.com/) which opens the AWS management console via [aws-vault](https://github.com/99designs/aws-vault).

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
* Brave Browser

# MFA

If a profile requires MFA, a dialog asks for the MFA code (`aws-vault login --prompt=osascript`).
Set the "MFA Prompt" preference to "aws-vault default" to use `AWS_VAULT_PROMPT` or aws-vault's default prompt instead.

# Requirements

* [aws-vault](https://github.com/99designs/aws-vault)
