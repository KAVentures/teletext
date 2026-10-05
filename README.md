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
X_DIRECT_TOPIC_SEARCH=false
```


## How the live edition works

1. Build one canonical English worldwide edition from X with Grok 4.7.
2. The live search call uses low reasoning, a single agent turn, and parallel tool calls are disabled, so one refresh can execute at most one search-tool call.
3. Produce only 4–6 compact Teletext stories.
4. Cache that canonical worldwide edition for **4 hours**.
5. Swedish, German, Spanish and French reuse the same evidence and run a no-tool translation only; changing language does not search X again.
6. Topic searches use one x.com-restricted search-tool call, produce only 1–3 stories, and are cached for **24 hours** by normalized query.
7. Exact x.com post/status URLs are retained per story and shown in the expandable Sources section.

The cache is demand-driven: no visitors means no model calls. Article navigation stays on the already-loaded edition rather than regenerating it.

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

- Model: `grok-4.7`, always with `reasoning.effort = low`.
- Tool-backed requests use `max_turns = 1` and `parallel_tool_calls = false`, mechanically limiting a refresh to one search-tool call.
- Global source discovery is shared across all languages and cached for **4 hours**.
- Topic source discovery is shared across languages and cached for **24 hours**.
- Non-English rendering is a no-tool translation of cached evidence.
- Topic output is limited to 1–3 stories; global output is limited to 4–6.
- Query keys are normalized case-insensitively, so `OpenAI`, `openai`, and ` OPENAI ` reuse the same edition.
- xAI exact per-request cost and tool-usage fields are logged server-side.
- The code includes optional Vercel Firewall generation-budget hooks (`teletext-global-generation` and `teletext-topic-generation`). The project Firewall must be initialized in Vercel before those hard counters can be enforced.
- Topic stories retain the exact X post URLs used to produce them, powering the clickable Sources dropdown.

The intended operating target is **under $2/day**, but an absolute dollar guarantee requires either the Vercel Firewall budget rules to be enabled or an xAI account spending cap. Caching and tool-call caps alone make spend bounded per refresh, not globally bounded against unlimited unique searches.
