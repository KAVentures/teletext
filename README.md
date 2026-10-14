# Teletext

**License: MIT** — free to use, modify, distribute, and build on under the terms in [`LICENSE`](./LICENSE).

A deliberately simple, live Teletext-style news reader built around a finite page model rather than an infinite feed.

## Product

- **100 — News:** one shared worldwide X-derived edition.
- **800 — My X:** add up to five X profiles and turn their recent posts into a personal Teletext.
- Individual My X stories start at page **801**.
- No arbitrary free-text search. It was removed because open-ended queries created unpredictable API cost.
- Sources remain clickable and point back to the X posts used.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/100`.

Without credentials, local development can use the safe demo data.

## Live credentials

The **daily worldwide news** publisher reads `XAI_API_KEY` from a **GitHub Actions
repository secret**, not from a page request. Vercel does not need this key to
serve pages 100–799. The **My X** feature still needs the server-side
`XAI_API_KEY` variable in Vercel to fetch newly requested profiles.

The publisher defaults to `grok-4.7`. Never expose API keys through
`NEXT_PUBLIC_*`, commits or browser code.

## Daily news publication and API costs

**The shared news pages are static and make zero paid xAI calls on visitor requests.**
A GitHub Actions workflow at `.github/workflows/daily-edition.yml` generates one
worldwide bulletin and all four translations at **06:17 UTC each day**.
The workflow commits `data/daily-edition.json`, and Vercel's Git integration
deploys the new static snapshot. All visitors read the same edition, irrespective
of traffic spikes, deployment regions or Next.js cache misses.

### One-time setup (required before merging)

1. In the **KAVentures/teletext GitHub repository**, go to **Settings → Secrets and variables → Actions**. Add a repository secret named **XAI_API_KEY** (the same xAI API key currently used by the Vercel app). Do not put the secret in a commit or chat.
2. Ensure GitHub Actions is allowed to create commits: **Settings → Actions → General → Workflow permissions → Read and write permissions**, if this setting is available.
3. Merge the PR, open **Actions → Publish one daily Teletext edition**, then run **Run workflow** once to publish the first edition immediately. Confirm the resulting commit and Vercel production deployment. Further updates are automatic, daily.

Until the first successful workflow, live news pages show a clearly labelled unavailable state rather than silently generating paid content. A failed daily job keeps the last successfully published snapshot; traffic can never force a paid retry.

### Limits and remaining costs

- The shared daily bulletin uses **one X-search-backed Grok call** plus **four no-tool translation calls** per successful day. Additional paid calls can occur if a run fails after some calls; check the Actions run and xAI dashboard rather than assuming a hard financial limit.
- A complete already-published UTC-day snapshot skips generation, including manually rerun workflows.
- **My X (page 800) is separate**: adding a previously uncached X account still triggers an on-demand paid xAI profile request, cached for seven days. Up to five X accounts can be selected. My X remains supported; it is **not** covered by the strict once-per-day global-news guarantee.
- Free-text search remains disabled, and API usage is logged server-side for My X.
- For a hard total-spend limit, set a budget cap in the xAI account. A GitHub scheduled workflow is not a financial quota.

`npm run test:daily` tests date-based deduplication and snapshot validation.
Generation uses Node 24's native TypeScript type stripping and requires an
`XAI_API_KEY` **only** in the scheduled GitHub Actions job, not for ordinary news readers.

## My X and sharing

My X is represented directly in the URL:

```text
/800?u=sama,karpathy,OpenAI&lang=sv
```

That means **a database is not required for sharing**. Copying the live URL shares the same profile selection and language.

The Share button also supports an **exact immutable snapshot**. The edition is Brotli-compressed into a self-contained `/s?d=...` URL, so the recipient sees exactly the same pages and sources even if the live edition later changes.

The browser remembers the user's selected profiles locally using `localStorage`; no account or server-side user profile is required.

A database could be useful later for accounts, cloud-synced profile lists, archives, analytics, or stricter global budget accounting, but it is not needed for the current sharing model.

## Navigation

- `100` — News
- `200` — World
- `300` — Tech
- `400` — Business
- `700` — Index
- `800` — My X
- `101+` — shared news stories
- `801+` — My X stories

Navigation supports links, arrow buttons, a numeric page box, keyboard arrows and mobile swipes.

## Editorial model

X is a discovery/source layer, not automatic truth. The global edition keeps attribution and uncertainty explicit. My X is even simpler: it primarily turns selected accounts' own recent posts into a finite Teletext reading experience rather than asking an agent to infer an open-ended news answer.

## Branding

The product takes inspiration from classic Teletext UI/UX, but uses original branding and does not imply affiliation with SVT or another broadcaster.

## License

This project is open source under the **MIT License**. See [LICENSE](./LICENSE).
