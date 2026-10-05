# Teletext

**License: MIT** — free to use, modify, distribute, and build on under the terms in [`LICENSE`](./LICENSE).

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
XAI_API_KEY=...
```

Optional:

```text
XAI_MODEL=grok-4.7
XAI_WEB_SEARCH=true
```

`X_WOEID=1` means worldwide trends.

## How the live edition works

1. Ask Grok 4.7 to inspect the current worldwide conversation using xAI's real-time X Search tool.
2. Have Grok identify the dominant fast-moving conversations rather than blindly trusting a single viral post.
3. Use xAI Web Search to verify consequential factual claims.
4. Merge duplicates, drop noise and produce 6–10 compact Teletext stories.
5. Assign pages 101 onward.
6. Cache the worldwide edition for 10 minutes using the Next/Vercel data cache.

Because the cache is demand-driven, an idle site does not continually spend API calls. The first request after expiry refreshes the edition.

Topic searches use the X recent-search API directly with a bounded 10-post sample, then ask Grok 4.7 at low reasoning to summarize only those posts. The X evidence and generated topic edition are cached for 30 minutes, and query keys are case-insensitive so repeated searches such as `OpenAI` and `openai` reuse the same work.

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

X activity determines attention, not truth. The prompt explicitly tells the editor to avoid converting unsupported X claims into facts and, when web verification is enabled, to verify consequential claims against primary or reputable sources.

## Branding

The product takes inspiration from classic Teletext UI/UX, but uses original branding and should not imply affiliation with SVT or another broadcaster.

## Search, languages and sharing

- Page `900` is a topic search. A query such as `/900?q=OpenAI&lang=sv` fetches a small recent X sample directly, then Grok 4.7 summarizes only that evidence into topic pages starting at `901`.
- The current language is encoded in the URL. Supported languages are English, Swedish, German, Spanish and French. Discovery remains global; the selected language controls the generated edition and interface.
- Live links remain live: sharing `/900?q=OpenAI&lang=sv` gives the recipient the latest version of that search.
- The Share button creates an immutable snapshot of the exact edition being read. Snapshots are Brotli-compressed into a self-contained `/s?d=...` URL, so v1 still needs no database or user account.
- Shared snapshots include a Latest link back to the corresponding live topic or front page.

## License

This project is open source under the **MIT License**. See [LICENSE](./LICENSE) for the full license text.

## Cost and latency controls

- Grok defaults to `grok-4.7` with `reasoning.effort = low`.
- Topic search fetches at most 10 recent X posts per uncached query before summarization.
- Topic evidence is cached independently of language for 30 minutes.
- Topic editions are cached by normalized query + language for 30 minutes.
- Worldwide editions are cached for 10 minutes.
- xAI `prompt_cache_key` is set for the global and topic editor prompts.
- xAI per-request usage/cost information is written to server logs for monitoring.
- Topic stories retain the exact X post IDs used to produce them, which power the clickable Sources dropdown on every story page.
