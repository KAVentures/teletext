# Teletext

A deliberately simple, live Teletext-style news reader. The default edition is driven by what is currently trending on X, then edited into a finite set of short pages.

## Product idea

- X is the discovery signal: what people are talking about right now.
- AI is the editor: remove noise, merge duplicates, rank what matters, and write compact pages.
- Web verification can be used for consequential claims before publication.
- The interface is intentionally finite and Teletext-like: page numbers, fixed-width text, bright semantic colours, no infinite feed.
- No accounts or database in v1.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/100`.

Without credentials the app runs in a safe demo mode.

## Live credentials

Add these server-side environment variables in Vercel:

```text
X_BEARER_TOKEN=...
OPENAI_API_KEY=...
```

Optional:

```text
X_WOEID=1
X_MAX_TRENDS=6
X_POST_SAMPLE_SIZE=20
X_LANGUAGE=en
OPENAI_MODEL=gpt-5
OPENAI_WEB_SEARCH=true
```

`X_WOEID=1` means worldwide trends.

## How the live edition works

1. Read the current X trends for the configured WOEID.
2. Make one combined recent-search request across the leading trends. This deliberately avoids one X search per trend and keeps API consumption bounded.
3. Feed the trends and a small representative post sample to the AI editor.
4. Optionally let the editor verify important claims with web search.
5. Produce 6–10 short stories and assign pages 101 onward.
6. Cache the edition for 15 minutes using the Next/Vercel data cache.

Because the cache is demand-driven, an idle site does not continually spend API calls. The first request after expiry refreshes the edition.

## Pages

- `100` — News
- `200` — World
- `300` — Tech
- `400` — Business
- `700` — Index
- `101+` — current stories

Navigation supports links, arrow buttons, a numeric page box, keyboard arrows and mobile swipes.

## Why there is no database yet

The initial product only needs the current edition. Vercel's data cache is enough for this validation stage. Add durable storage when the product gains archives, accounts, personalization, or shareable user-specific editions.

## Editorial safety

X determines attention, not truth. The prompt explicitly tells the editor to avoid converting unsupported X claims into facts and, when web verification is enabled, to verify consequential claims against primary or reputable sources.

## Branding

The product takes inspiration from classic Teletext UI/UX, but uses original branding and should not imply affiliation with SVT or another broadcaster.
