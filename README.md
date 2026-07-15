# FxHey!

Firefox Accounts release intelligence: live production versions plus the Jira
work, pull requests, and commits riding each FxA train.

## What it shows

- Current versions from the four public Firefox Accounts production endpoints
- The exact production-update and train-tag timestamps
- Recent train selection with the full GitHub comparison range
- Jira work items and merged pull requests derived from commit history
- Searchable, area-filtered commit history
- A verified fallback snapshot when a public upstream is unavailable or rate-limited

## Data model

Production versions come from:

- `https://accounts.firefox.com/ver.json`
- `https://api.accounts.firefox.com/__version__`
- `https://profile.accounts.firefox.com/__version__`
- `https://oauth.accounts.firefox.com/__version__`

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
