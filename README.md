# site

The Octopus Heart Software website, at https://octopusheartsoftware.com (hosted free on GitHub Pages from the `octopusheartsoftware/octopusheartsoftware.github.io` repository; the domain's DNS is at Cloudflare).

| File | What it is |
| --- | --- |
| `index.html` | Home page: intro, values, Apps (CinemAlert, coming soon) and Contact sections. |
| `privacy.html` | The website's privacy policy. App policies go in their own pages (for example `cinemalert/privacy.html`) before each release. |
| `404.html` | Friendly "page not found" page. |
| `styles.css` | Page layout. Uses only `brand.css` variables. |
| `brand.css` | A copy of `shared/brand/brand.css`. If the brand kit changes, copy it here again. |
| `octopus-mark.svg`, `favicon.svg` | Copies of the logo mark from `shared/brand/logo/`: beside the name in the header, and in the browser tab. |
| `play/testers-itdjz/` | Unlisted page for beta testers linking every beta in `play/` (hidden from search engines, linked from nowhere). When a beta is added, renamed or retired, update its card here by hand. |
| `CNAME` | Tells GitHub Pages to serve the site at octopusheartsoftware.com. |
| `sw.js` | Clears the old Flashcards site's offline cache from returning visitors' browsers. Safe to delete after a few months. |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are. |
| `tools/serve.js` | Local preview at http://localhost:4173 (the "site" entry in `.claude/launch.json`). |

The old site's files (Flashcards, Dark States, poll) are archived in `ops/archive/` and remain in this repo's Git history.

Planned later: one privacy page per app, Play Store links on app cards, and `app-ads.txt` if an app ever shows ads.
