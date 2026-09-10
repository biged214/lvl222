# lvl222

Public company and SC Companion product site for https://lvl222.com.

## Current hosting: Vercel

The existing Vercel project is `lvl222/lvl222`, connected locally through ignored `.vercel/project.json`. `vercel.json` overrides the previous Node preset with a static site plus small API functions. `npm run build:vercel` creates `dist`. Never deploy `.env.local`, signing credentials, or the local `data` mirror.

Public installer bytes are held in the connected `sc-companion-downloads` Blob store. The `/downloads/sc-companion/*` rewrite serves them through lvl222.com without an HTTP redirect and without putting large files through a Function. Legal pages are static. The catalog, source/download listings, and updater manifest are read from Blob. Redeploys no longer erase installer history.

Vercel Cron checks for a new stable release daily at 09:00 UTC, using `/api/sync` authenticated by `CRON_SECRET`. This replaces the old persistent-server 15-minute loop. Publish immediately during a release rollout with `npm run sync:releases` followed by `npm run publish:downloads` from an authenticated local workspace; it does not require a website redeploy. Automated sync retains the previous catalog on failure. Do not run overlapping manual/cron publishes. Files from versions already mirrored are retained; old releases predating this migration are not automatically imported.

The SDK reads ignored local credentials from `.env.local` for manual publishing. Production credentials are injected by the connected Blob store. Never put these credentials in public scripts or GitHub commits. Blob storage, CDN, and transfer usage can incur charges; monitor Vercel usage. No plan upgrade is required by this code.

The website repo's Git integration should remain connected for automatic deployments from main. Cloudflare currently manages DNS: point the root A record to the value provided by Vercel and configure www as shown in Vercel Domains. Preserve MX/TXT email records. Verify domain HTTPS and direct downloads before using Store URLs or migrating desktop updater endpoints. Microsoft Store editions continue using Store updates.

The GoDaddy instructions below describe the optional original self-hosted Node mode, not the active Vercel deployment. Its privacy copy would need updating before switching hosting providers again.

## GoDaddy Node.js Hosting

Connect GitHub repository `biged214/lvl222`, branch `main`. Use the repository root as the application directory, Node.js 22 or later, `npm install` as the install command, `npm run build` as the build command, and `npm start` as the start command. The server uses GoDaddy's `PORT` environment variable and listens on `0.0.0.0`. Associate lvl222.com in the hosting dashboard and enable HTTPS there.

The app has no runtime dependencies or required secrets. Do not set a fixed PORT on GoDaddy. `/health` is available for a process health check. Normal pushes to main can deploy through GoDaddy's GitHub integration.

## Local preview

Requires Node.js 22 or later. Run `npm install`, then `npm start`, and open http://localhost:3000. Run `npm test` for server tests.

## Downloads and content

The server mirrors the latest stable GitHub release at startup, then checks every 15 minutes. Windows EXE/MSI, Linux AppImage/DEB/RPM, signatures, and source archives are stored on the hosting server. Browser downloads stream those local bytes directly with HTTP 200/206, never a redirect or a runtime proxy to GitHub. A version is advertised only after all files pass size and available GitHub SHA-256 checks and updater targets resolve. Installer bytes and updater signatures remain unchanged. Partial/incomplete builds retain the previous working release; an empty mirror displays a preparation message and returns 503 for updater checks.

Configure `DOWNLOAD_DIR` to a **persistent writable directory** provided by GoDaddy, outside a replaceable deployment folder. Default: `data/releases` beside server.mjs. Allow at least 1 GB initially plus room for retained releases, and confirm plan bandwidth/disk limits. Persistence across redeploys is a hosting requirement, not guaranteed by this code. Old version URLs remain available only while their files and catalog are retained. With temporary storage, each restart must download again and historical links may be lost. Do not delete the catalog or old release files while users depend on them. If this hosting plan does not support durable storage, arrange it before relying on versioned URLs for distribution.

`npm run sync:releases` seeds or refreshes the mirror manually. No GitHub token is required for the public repo. `SYNC_RELEASES=false` disables automatic sync for local tests. Files are excluded from Git; do not commit installers or signing keys. This repo and GitHub Actions remain the development/build infrastructure, not the public installer host.

The current stable release is mirrored first; historical releases from before this migration are not imported automatically. Retained releases appear on `/downloads`. Store MSIX upload artifacts are not public end-user installers and are not mirrored from Actions. Submit those packages directly to Partner Center; Store users update via Microsoft Store.

## Public URLs and migration

- `/privacy`: privacy policy with support@lvl222.com contact
- `/terms`: fan-project, data, and trademark notices
- `/license`: license overview; `/licenses/gpl-3.0.txt`: verbatim app GPL v3
- `/support`: support email and guidance
- `/source`: direct source archives, including current Store source
- `/downloads`: versioned file links, SHA-256 checksums, and release notes
- `/updates/sc-companion/latest.json`: updater manifest referencing only lvl222.com downloads

Keep existing GitHub releases and the old updater endpoint available. Do **not** release an app endpoint change until the hosted domain, TLS, full downloads, range requests, and signatures have been verified in production. The desktop app currently still checks GitHub. The website endpoint is prepared for the next app release but no desktop release is part of this change. Microsoft Store update behavior is unchanged.

Legal copy is a draft based on the current app behavior and repository license. Review before using it in the Store. The privacy policy must be kept current if telemetry, hosting, or data providers change. This site does not add analytics, accounts, or installation tracking; hosting infrastructure may set technical cookies and maintain request logs. Downloads through this site no longer count as individual end-user GitHub asset downloads.

Edit `public/index.html` for page copy and `public/styles.css` for styling. Real app screenshots are in `public/images`. To refresh them, start the SC Companion web preview at port 1421 and run `node scripts/capture-app.mjs` with Chrome installed. Only use an isolated browser profile with no private session data.

This repository is independent of the desktop app. A website deployment does not publish an app update.

## Search discoverability

The homepage and all six information/download pages have server-rendered descriptions, canonical URLs, and Open Graph/Twitter previews. The homepage includes SoftwareApplication microdata identifying the free Windows/Linux app and its publisher. No ratings or reviews are invented. Canonicals prefer https://lvl222.com without redirecting installer URLs. Machine endpoints and installer files use noindex; the download page remains indexable.

Keep public/sitemap.xml and seo.mjs current when adding pages. Run npm test to check metadata coverage. In Google Search Console, verify ownership of lvl222.com and submit https://lvl222.com/sitemap.xml, then request indexing of the homepage. This is an account-owner step; deployment alone does not submit the site or guarantee indexing, rankings, or rich results. No analytics or tracking were added.
