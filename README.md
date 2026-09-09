# lvl222

Public company and SC Companion product site for https://lvl222.com.

## GoDaddy Node.js Hosting

Connect GitHub repository `biged214/lvl222`, branch `main`. Use the repository root as the application directory, Node.js 22 or later, `npm install` as the install command, and `npm start` as the start command. No build command is required. The server uses GoDaddy's `PORT` environment variable and listens on `0.0.0.0`. Associate lvl222.com in the hosting dashboard and enable HTTPS there.

The app has no runtime dependencies, secrets, database, or environment file. Do not set a fixed PORT on GoDaddy. `/health` is available for a health check. Normal pushes to main can deploy through GoDaddy's GitHub integration.

## Local preview

Requires Node.js 22 or later. Run `npm install`, then `npm start`, and open http://localhost:3000. Run `npm test` for server tests.

## Downloads and content

Windows and Linux links resolve from the latest public stable release of `biged214/sccompanion` and are cached for 15 minutes. If GitHub is unreachable or a platform asset is missing, links fall back to the release page. There is no GitHub token requirement. This site does not add analytics, accounts, cookies, or install tracking. Hosting providers may maintain request logs.

Edit `public/index.html` for page copy and `public/styles.css` for styling. Real app screenshots are in `public/images`. To refresh them, start the SC Companion web preview at port 1421 and run `node scripts/capture-app.mjs` with Chrome installed. Only use an isolated browser profile with no private session data.

This repository is independent of the desktop app. A website deployment does not publish an app update.
