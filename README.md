# RavenShield

**Free deception security for the AI era.** Plant decoys, catch leaks, firewall prompt injection, bait attackers, and seal everything into a tamper-evident evidence chain. 100% free, with free accounts, and runs entirely in the browser.

## Features

### Deception suite
| Tool | What it does |
|---|---|
| **RavenVault** (`vault.html`) | Unlimited decoy identities: tripwire email aliases (`you+rs-xxxx@gmail.com`), passwords, AWS-style keys, GitHub-style tokens, API keys, DB URLs, JWTs. Bait-pack export (.env, AWS credentials, CSV) and a **Leak Matcher** that traces any sighting back to the exact decoy. |
| **RavenRAG** (`rag.html`) | Invisible zero-width fingerprints and fictitious **trap facts** for documents. Detects verbatim and paraphrased leaks in AI output. |
| **RavenShield Firewall** (`shield.html`) | 3-layer prompt-injection firewall (rules, heuristic analyzer, sanitizer). Decodes hidden Unicode-tag text and base64. Adjustable thresholds and a safety wrapper. |
| **RavenHoneypot** (`honeypot.html`) | Decoy AI assistant. Classifies intent (jailbreak, extraction, probing, normal), hands out traceable bait credentials, fingerprints the client, and seals session reports. |
| **RavenAudit** (`audit.html`) | SHA-256 hash-chained action log for AI agents. Bulk JSONL import, public anchors, and an independent verifier for any export. |
| **RavenAgent** (`agent.html`) | Agent skill/plugin scanner, risk-scored action-timeline replay, and endpoint heartbeat monitoring. |

### Extra tools
- **Secret Scanner**: 28 provider detectors plus entropy analysis. Scans files and folders; exports a redacted copy and a CSV.
- **Password Forge**: pattern-aware strength estimate, HIBP k-anonymity breach check, and a password/passphrase generator.
- **Phish Lens**: offline URL dissection (lookalikes, homoglyphs, punycode, brand impersonation, shorteners and more).
- **Integrity Hasher**: SHA-256/384/512/1 for files and text, checksum compare, SHA256SUMS export, and notarization.
- **Evidence Console** (`dashboard.html`): a single timeline across every tool, with chain verification, filters, chart, JSON/CSV/PDF export, import and desktop alerts.

### The logo
The raven logo is animated live. Its eyelids open and close at random, with a glowing slit-pupil iris that follows your cursor. Light leaks through the seam when the eye is shut, and it opens with a lens-flare burst and pulse rings. The hero adds a sweeping searchlight beam from the eye, an orbiting aura, 3D tilt, a shine sweep and occasional glitch frames. The preloader opens the eye on first visit, and page navigation "blinks" the whole screen shut and open again.

## Run locally
```bash
npx serve .
# or
python -m http.server 8080
```
Open http://localhost:8080. Use a local server rather than opening files directly, so the service worker and clipboard work.

## Deploy (all free)
- **Netlify:** drag this folder onto https://app.netlify.com/drop. `netlify.toml` sets the security headers and the 404 page.
- **Vercel:** run `npx vercel` in this folder. `vercel.json` is included.
- **GitHub Pages:** push to a repo, then Settings → Pages → Deploy from branch (root). `.nojekyll` is included.
- **Cloudflare Pages:** connect the repo, leave the build command empty, and set the output directory to `/`.

Contact: nirjala8462@gmail.com. To show the LinkedIn, GitHub, LeetCode and arXiv cards, paste the URLs into the commented block in `about.html` (search for `LINKEDIN_URL`).

## Project structure
```
index.html            Home (hero, live demo, suite, evidence demo, FAQ)
dashboard.html        Evidence Console
vault|rag|shield|honeypot|audit|agent.html     Deception suite
secrets|password|phishing|integrity.html       Extra tools
docs.html, about.html, 404.html
assets/css/main.css   Design system + logo animation
assets/js/core.js     Logo engine, preloader, blink transitions, nav, evidence chain
assets/js/lib/shield-engine.js   Standalone injection engine (browser + Node)
assets/js/pages/*.js  One script per page
sw.js, manifest.webmanifest      PWA / offline
```

## Privacy
Everything is stored in the browser's `localStorage`, and there is no backend and no analytics. The only outbound calls are the optional HIBP breach check (5-character SHA-1 prefix only) and heartbeat checks to URLs you add.

## Author
Created by **Jarpula Nirjala**.

## License
Free to use, host and modify. Use deception tools only on systems you own or are authorized to protect.
