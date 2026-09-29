# Clearcase

A personal helper for getting unstuck on identity verification.

**[Open the app](https://clearcase-demo.vercel.app)**

Enter the app or website asking you to verify, choose the problem you see, and get a short checklist plus an editable support message. No account or API key required.

## What it does

- Guides you through camera issues, rejected photos, incomplete selfies, unsupported or expired documents, name mismatches, expired sessions, pending reviews, lockouts, and unknown failures.
- Adjusts camera instructions for your device and skips troubleshooting you already tried.
- Links to official provider help, with a distinction between your selected provider and general reference material.
- Drafts a support message with your error wording and attempted steps.
- Lets you copy the message, download notes, mark the problem resolved, or optionally save progress on your device.
- Keeps form entries in the browser. Nothing is sent automatically.

## Run locally

Node.js 20 or newer; no dependencies.

```sh
git clone https://github.com/ak26701/clearcase-demo.git
cd clearcase-demo
npm start
```

Open http://localhost:4173.

```sh
npm test
npm run build
```

## How it works

`src/guide.js` contains the troubleshooting paths, official source links, and support-message templates. `src/app.js` handles the form, checklist, draft editing, optional browser storage, and export. The production app is a static site.

This is a guided troubleshooter, not an AI diagnosis service. The selected problem determines the plan. Free-text errors are included in the support draft but not automatically interpreted. The helper cannot inspect an account, submit ID documents, remove restrictions, approve verification, or contact support.

Your service’s instructions take priority. There is no universal retry count, wait period, or accepted-document list in this app. Official references were checked on September 28, 2026 and may change.

## Privacy

No ID uploads. Do not enter ID numbers, passwords, or account secrets. Form entries stay in page memory until you choose “Save on this device,” which writes to localStorage. Nothing is automatically sent to a server or model. “Start over” removes the app’s saved personal-helper record after confirmation. Downloaded notes and clipboard contents remain under your control. Hosting providers still handle ordinary page requests; official help links open external websites.

## Project history

The initial version was a synthetic support-operations demo. The current version replaces that workflow with a personal troubleshooting tool. The original prototype remains in Git history.
