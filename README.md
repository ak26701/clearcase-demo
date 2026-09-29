# Clearcase

A working identity-verification support copilot prototype. Choose a synthetic case, classify the blocker, retrieve the relevant mock policy, edit the next step, and record a human review decision.

**[Open the live demo](https://clearcase-demo.vercel.app)**

## Run locally

Requires Node.js 20 or newer. No dependencies or API keys are needed.

```sh
git clone https://github.com/ak26701/clearcase-demo.git
cd clearcase-demo
npm start
```

Open http://localhost:4173.

```sh
npm test       # Policy precedence and review-gate checks
npm run build # Produces a deployable static site in dist/
```

## Demo walkthrough

1. Open Jordan Lee's glare case and select **Analyze case**.
2. Open **POL-01** to inspect the policy source.
3. Edit the proposed customer response, enter a reviewer name, and approve it.
4. Open Taylor Chen's three-attempt liveness case. The retry limit requires escalation.
5. Add a synthetic case with conflicting evidence. The system routes it for investigation.
6. Open the review log and export the decisions as JSON.

## What works

- Ten fictional cases covering glare, expiration, name mismatch, liveness, unsupported documents, session expiration, blocked camera access, unknown errors, blur, and network interruption.
- Searchable case queue and review filters.
- Explicit classification from synthetic session error codes.
- Policy retrieval by signal with retry-limit and uncertainty precedence.
- Policy citations, editable response drafts, and approve / reject / escalate actions.
- Review records with reviewer name, timestamp, edited response, notes, policy version, and policy identifiers.
- Custom synthetic cases and JSON export.
- Responsive interface, keyboard navigation, and browser-local persistence.

## Scope and limitations

This is a deterministic workflow demo, not an LLM integration. The classifier evaluates structured session signals and failed-attempt counts. Free-text messages are shown to the reviewer but not automatically interpreted. All policies are fictional and do not represent any company or jurisdiction.

No identity documents are uploaded or processed. No verification decision is made, no customer message is sent, and no specialist queue is contacted. Approving a response only records a local demo decision.

The review gate is a browser interaction, not a server-enforced security boundary. Reviewer names are self-entered; records are mutable browser-local data, not a tamper-proof audit trail. There is no authentication, shared database, or cross-device sync. Use synthetic information only.

## Implementation

- `src/data.js`: synthetic cases, mock policy text, and error-code labels.
- `src/engine.js`: classification, policy selection, precedence rules, and review validation.
- `src/app.js`: case queue, policy viewer, review flow, local storage, and export.
- `styles.css`: responsive visual design.
- `tests/engine.test.mjs`: Node built-in tests for policy routing and the human gate.
- `server.mjs`: dependency-free local static server.
- `vercel.json`: static deployment and security headers.

## A production extension

Keep the policy and reviewer boundary while replacing synthetic session records with an authenticated provider integration. Add server-side authorization, durable append-only review records, policy versioning, and a controlled outbound messaging step. If adding an LLM for free-text diagnosis, validate its structured output and require source-backed recommendations, with an explicit escalation path when evidence is insufficient.
