# FxHey!

Firefox Accounts release intelligence: live stage and production versions plus the GitHub
commits riding each FxA train.

## What it shows

- Current versions from the Firefox Accounts stage and production endpoints
- A Stage/Prod toggle that changes the status, exact deployed tag, and commit range
- Source-commit and train-tag update timestamps
- A Git-backed deploy-history timeline with original FxHey production records, public GitHub
  fallback records, and endpoint observations
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

Deploy history is stored as immutable JSON events in this repository's
`history/` directory. A scheduled GitHub Action imports the original production
deployment log from `https://fx-hey.herokuapp.com/fxa`, whose timestamps are
explicitly accurate to ±30 minutes. Public Stage and Production records from
the `mozilla/fxa` Deployments API remain as fallback evidence. The recorder also
checks both version endpoints every five minutes, appends a new event only when
an environment reports a different commit, and rebuilds the public
`data/deploy-history.json` index consumed by FxHey.

Original FxHey and historical GitHub records are labeled separately from endpoint observations.
The timeline calls the polling timestamp “first observed”; it does not claim
that this is the exact deployment start or completion time. Every history
change is auditable through Git, and no application database is required.

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
- `app/lib/deploy-history.ts` — public Git history reader and snapshot fallback
- `app/api/train/route.ts` — cached environment and train-selection API
- `app/globals.css` — responsive visual system
- `scripts/record-deployments.mjs` — original FxHey/GitHub imports, endpoint checks, and index generation
- `.github/workflows/record-deployments.yml` — five-minute scheduled recorder
- `history/` — immutable Stage and Production event files
- `data/deploy-history.json` — generated public timeline index
- `.openai/hosting.json` — Sites project configuration

The app runs on the bundled vinext/Cloudflare Worker stack. It does not require
a database or application-owned credentials for its public upstream data.
