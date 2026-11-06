---
name: make-release
description: Create a release by bumping the version, committing, deploying to Firebase Hosting, and tagging. Use when the user says "make release", "release", "deploy", or "make-release".
---

Follow these steps in order to create a release:

## 1. Ask which version part to bump

Ask the user: "Which version to bump: **minor** or **patch**?"
Wait for their answer before continuing. Do not proceed until they reply.

## 2. Update README.md
Update the release notes section (create one when not exists)

## 3. Bump the version in package.json

- Read `package.json` and parse the current `version` field (semver: major.minor.patch).
- If the user chose **patch**, increment the patch number (e.g. 1.0.0 -> 1.0.1).
- If the user chose **minor**, increment the minor number and reset patch to 0 (e.g. 1.0.1 -> 1.1.0).
- Update the `version` field in `package.json` with the new version.

## 4. Commit and push all outstanding changes

- Stage all modified and new files (but skip `.env`, credentials, and secrets).
- Create a commit with the message: `Release v<new-version>`
- Push to the current branch's upstream remote.

## 5. Deploy to Firebase Hosting

- Run `npm run build` to build the production bundle.
- Check if `firebase.json` exists. If not, create it with this content:
  ```json
  {
    "hosting": {
      "public": "dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  }
  ```
  Also create `.firebaserc` if it doesn't exist:
  ```json
  {
    "projects": {
      "default": "last-time-b864e"
    }
  }
  ```
- Run `npx firebase-tools deploy --only hosting` to deploy.
- If the Firebase CLI asks to log in, tell the user to run `! npx firebase-tools login` in the prompt.

## 6. Tag the release in git

- Create an annotated git tag: `git tag -a v<new-version> -m "Release v<new-version>"`
- Push the tag: `git push origin v<new-version>`

## 7. Report

Print a summary:
- Version: v<new-version>
- Commit: <short hash>
- Tag: v<new-version>
- Firebase Hosting: deployed
