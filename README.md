# Teletext

**License: MIT**. A classic finite-page news reader at
[x.kinvectum.com](https://x.kinvectum.com), with no infinite feed.

## Pages

- **100 — News:** one globally shared daily bulletin.
- **200 — World**, **300 — Tech**, **400 — Business**, **700 — Index**.
- **101+ — Stories**, each linked to its source X posts.
- Text-TV, accessible Web mode, five languages (EN/SV/DE/ES/FR), mobile
  swipes, keyboard navigation and shareable immutable snapshots.

**X profile lookups, custom My X pages (800–899) and free-text searches
are disabled.** Old URLs and API requests are rejected without calling
any paid provider. They cannot be re-enabled by changing client URL
parameters.

## Cost-locked architecture

A single GitHub Actions scheduled workflow runs once each UTC day, at
**06:17 UTC**. One xAI Responses API call with one X-search-backed
generation produces the whole bulletin, including all four translated
versions. It commits `data/daily-edition.json` to `main`, and Vercel
automatically deploys the static data with the website.

- **Zero xAI calls from public page views, source links, /api/edition, share,
  or retired profile URLs.**
- **One attempted provider request per UTC day** from the scheduled
  publication workflow. A durable `data/daily-attempt.json` marker is
  committed **before** the billable call; reruns on that date skip
  generation even if the first attempt fails.
- An unsuccessful generation leaves the last complete bulletin on the site.
  Until the first successful update, the site displays an unavailable
  state rather than spending on a visitor-triggered generation.
- All five languages are created in the **same** paid request, not four
  extra paid translation requests.
- Vercel preview deployments are disabled in project settings; only the
  main branch is deployed to production.
- A Git push to the repository (including the attempted-date marker)
  can still result in a Vercel *production* deployment. This is not
  a paid AI call.

## Credentials: no GitHub xAI secret required

The xAI key already in the **Vercel production project** is used only
by `POST /api/internal/daily-edition`. That route requires a short-lived
**cryptographically verified GitHub Actions OIDC token** with the exact
repository ID, main-branch workflow path, issuer and audience. There is
no public manual refresh or profile lookup endpoint.

**No `XAI_API_KEY` GitHub Actions secret needs to be configured.**
Never add the key to GitHub commits or `NEXT_PUBLIC_*`.

The daily workflow uses its built-in `GITHUB_TOKEN` and requests
`contents: write` (to commit the edition and attempt marker) and
`id-token: write` (for identity verification by Vercel). If your
repository policy overrides these permissions, permit the workflow to
write to `main` in GitHub repository Settings → Actions → General, or
allow its GitHub Actions bot through branch protection.

## Initial activation

1. Merge the PR after CI is green. Wait until the production deployment
   on Vercel includes the new private publisher endpoint.
2. In GitHub select **Actions → Publish one daily Teletext edition →
   Run workflow**. This activates the first real bulletin. It runs without
   a GitHub API key secret.
3. Verify the new `data/daily-edition.json` commit and deployed news
   pages. Further updates are automatic at 06:17 UTC.

If the initial publish fails, the attempt is already recorded; by design
no second paid attempt will happen until the next UTC day. Check the
workflow and Vercel logs. Do not remove the marker just to force a retry
without accepting that doing so can create an additional billable request.

## Development

```bash
npm ci
npm run dev
npm run test:daily
npm run typecheck
npm run build
```

The initial unpopulated snapshot returns a clear unavailable state. To
inspect an actual bulletin locally, use a successfully published daily
snapshot. No local API key is needed for reading.

## Editorial policy

X posts are signals and attributed sources, not proof. The daily prompt
requires an explicit distinction between what is verified and what is
claimed, and attempts to exclude spam and low-value trends.

## License

MIT. See [LICENSE](./LICENSE).
