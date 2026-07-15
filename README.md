# FxHey!

Firefox Accounts release intelligence: live stage and production versions plus the GitHub
commits riding each FxA train.

## What it shows

- Current versions from the Firefox Accounts stage and production endpoints
- A Stage/Prod toggle that changes the status, exact deployed tag, and commit range
- Source-commit and train-tag update timestamps
- A durable deploy-history timeline based on observed public endpoint changes
- Recent train selection with the full GitHub comparison range
- Searchable GitHub commit history with merged pull-request links when available
- Jira links only when a ticket key appears in a public commit message
- A verified fallback snapshot when a public upstream is unavailable or rate-limited

## Data model

Environment versions come from:

- `https://accounts.stage.mozaws.net/__version__`
- `https://api.accounts.firefox.com/__version__`

Production is selected by default. Switching environments changes the page
header and commit comparison to the exact tag reported by that environment's
version endpoint. Update times come from the corresponding source commit in
`mozilla/fxa`.

Deploy history is stored in D1. FxHey records a new event only when an
environment's public version endpoint reports a different commit from its most
recent observation. The timeline labels that detection time as “first
observed”; it does not claim to know the exact deployment start time.

Train contents come from `mozilla/fxa` tags and GitHub comparisons. For train
`N`, FxHey compares `v1.(N-1).0` with the newest available `v1.N.patch` tag.
Merged PR numbers are extracted from GitHub commit messages. Jira keys (`FXA-*`,
`PAY-*`, and `ENT-*`) are shown only as optional links on the commits that
already reference them; they are not promoted into a separate issue inventory.

## Development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
```

`npm test` runs the production build and verifies the server-rendered dashboard
and its accessible train inventory.

## Structure

- `app/FxHeyDashboard.tsx` — interactive release dashboard
- `app/lib/fxa-data.ts` — production and GitHub data aggregation
- `app/api/train/route.ts` — cached environment and train-selection API
- `app/globals.css` — responsive visual system
- `db/deploy-history.ts` — endpoint-change observation and timeline queries
- `db/schema.ts` and `drizzle/` — deploy-history schema and migrations
- `.openai/hosting.json` — Sites project binding

The app runs on the bundled vinext/Cloudflare Worker stack with D1 for deploy
history. It does not require application-owned credentials for its public
upstream data.
