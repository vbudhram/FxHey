# FxHey!

Firefox Accounts release intelligence: live stage and production versions plus the Jira
work, pull requests, and commits riding each FxA train.

## What it shows

- Current versions from the Firefox Accounts stage and production endpoints
- Source-commit and train-tag update timestamps
- Recent train selection with the full GitHub comparison range
- Jira work items and merged pull requests derived from commit history
- Searchable, area-filtered commit history
- A verified fallback snapshot when a public upstream is unavailable or rate-limited

## Data model

Environment versions come from:

- `https://accounts.stage.mozaws.net/__version__`
- `https://api.accounts.firefox.com/__version__`

Production determines the deployed train. Stage can be on a newer patch without
changing the production train shown in the page header. Update times come from
the corresponding source commit in `mozilla/fxa`.

Train contents come from `mozilla/fxa` tags and GitHub comparisons. For train
`N`, FxHey compares `v1.(N-1).0` with the newest available `v1.N.patch` tag.
Jira keys (`FXA-*`, `PAY-*`, and `ENT-*`) and merged PR numbers are extracted
from those commit messages.

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
- `app/api/train/route.ts` — cached train-selection API
- `app/globals.css` — responsive visual system
- `.openai/hosting.json` — Sites project binding

The app runs on the bundled vinext/Cloudflare Worker stack and does not require
a database or application-owned credentials for its public upstream data.
