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

Add this server-side environment variable in Vercel:

```text
XAI_API_KEY=...
```

Optional:

```text
XAI_MODEL=grok-4.7
```

Secrets must remain server-side. Do not expose them through `NEXT_PUBLIC_*`.

## Cost model

The app is deliberately biased toward low spend.

- Grok uses `grok-4.7` with `reasoning.effort = low`.
- Tool-backed calls use one agent turn and `parallel_tool_calls = false`.
- The global edition is shared across everyone and refreshed at most once every **24 hours**.
- Non-English global editions reuse the same evidence and only run a no-tool translation.
- Each X profile is fetched independently and shared across all users for **7 days**.
- My X fetches at most **two posts per profile** and supports at most **five profiles** per edition.
- A personal edition is assembled locally from already-cached profile results; there is **no extra Grok summarization call for the combination**.
- Profile post text stays in its original language to avoid paid translation per custom combination.
- xAI request cost fields are logged server-side for monitoring.

This structure targets an average operating cost below roughly **$0.50/day at modest usage**, but it is not a mathematically hard spend ceiling against unlimited users adding unlimited new unique profiles. A provider-level xAI spend cap is the appropriate absolute backstop.

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
