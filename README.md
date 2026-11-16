# 🧪 Test Strip Analyzer

Read aquarium water **test strips** from a phone photo. Instead of squinting at the color chart, you photograph the
dipped strip **lying on the kit's color card**. The app then measures every pad and every chart swatch in the same photo
and reports the closest value. It also interpolates between chart steps, gives a plausible range, and says how
trustworthy each reading is.

- Runs entirely **in the browser** (phone or PC). Photos never leave your device.
- Currently supports **API 5 in 1 Test Strips** (pH, NO₂⁻, NO₃⁻, KH, GH; freshwater & saltwater pH rows).
- Rates every reading **Normal / Low / High** (or *Very* low/high) for your tank type. When a value is off target it
  shows the **potential impact** and a **suggested mitigation**, with step-by-step instructions.
- No install and no build step: a static site you can host on GitHub Pages.

> ⚠️ **For educational use only.** Results are photo-based estimates and may be inaccurate. See the [Disclaimer](DISCLAIMER.md).
>
> 📖 **Using the app?** Read the [User guide](docs/user-guide.md).
> 🎯 **Target ranges, sources, potential impacts & corrective actions:** [Targets](docs/targets.md).
> 🧩 **Adding another kit/brand?** See [Adding a kit](docs/adding-a-kit.md).

## Why it beats eyeballing

| Problem reading by eye | What the app does |
| --- | --- |
| Lighting changes how both the pad and the chart look | Compares pad and chart **in the same photo**, so both are under the same light and camera white balance. |
| Neighbouring chart colors look alike | Uses the perceptual **CIELAB / CIEDE2000 (ΔE₀₀)** color difference on hundreds of averaged pixels per spot. |
| Pads fall *between* two chart colors | Treats the chart as a color path and **interpolates** the value (e.g. pH 7.3 instead of "7.0 or 7.5?"). |
| "Is that 0 or 0.5?" | Reports a **range** of every value that's practically indistinguishable (within 2 ΔE₀₀), so you can see when the chart itself can't tell them apart. |
| "Is that OK, and what do I do?" | Compares each value with the target range for your **tank type** (community, planted, soft water, Rift Lake cichlids, marine fish-only, reef) explains the **potential impact** of off-target values, and lists **corrective actions**, including cross-checks like "pH is high because KH is high". |
| Glare, shadows, wrong timing | Warns about glare/over-exposure, uneven lighting, misplaced markers and early/late readings (with the built-in dip timer). |

## Quick start

**On your phone:** open **<https://canvo.com/TestStripAnalyzer/>** → *Take photo* → tap the 4 corners of the color
table → tap the tip pad and the last pad of the strip → read the results. Full walkthrough: [docs/user-guide.md](docs/user-guide.md).

**On this PC (development):**

```powershell
npm install          # dev tools only (JPEG decoder for CLI/tests, Playwright driver for the browser test)
npm run serve        # http://localhost:8080 (also prints a LAN URL you can open from a phone on the same Wi-Fi)
```

## How it works

1. **Chart geometry.** You tap the 4 outer corners of the chart's color table in any order. A planar homography maps the
   kit's measured swatch layout onto the photo. The app tries all 4 rotations and keeps the one whose colors best match
   the reference card, so corner order and photo orientation don't matter. **Auto-align** then nudges the corners until
   every sample disc sits inside a uniform swatch, which corrects imprecise taps.
2. **Strip geometry.** You tap the pad at the strip's tip and the pad nearest the handle. The middle pads are placed
   at the kit's measured pad positions (API pads are *not* evenly spaced), and auto-align snaps each sample disc to
   the middle of its pad. You can drag any pad marker.
3. **Robust sampling.** Each disc is averaged in linear light after dropping clipped pixels and trimming the darkest 10%
   and brightest 20% (texture, specks, glare). Colors are kept in **Display P3** when the browser supports it, so
   saturated reds/purples aren't clipped.
4. **Matching.** Chart swatches of a parameter form a piecewise-linear path in CIELAB. The pad's reading is the closest
   point on that path by ΔE₀₀, and the value is interpolated between the two neighbouring swatches. The *range* covers
   positions within 2 ΔE₀₀ of the best fit. *Color match* is the distance to the path: good ≤ 3, fair ≤ 6, poor > 6.
   If the pad's color goes **past the first or last swatch**, the path is extended up to one chart step along the
   chart's color trend. The app still gives an estimate (e.g. `≈ 259 ppm`), clearly marked as *extrapolated*.
   Concentration scales never go below 0.
5. **Targets.** The estimate is rated Normal / Low / High / Very low / Very high against the selected tank type's
   ranges, with corrective actions and cross-parameter checks (see [docs/targets.md](docs/targets.md)).
6. **Quality checks.** These cover non-uniform samples (marker on an edge or on text), glare/clipping, strip-vs-chart
   lighting mismatch, a chart that doesn't look like the expected card, and read timing.

### Accuracy notes & limitations

- The result can only be as good as the **printed chart**. The app removes human color-perception error, not the chart's
  own coarse steps (e.g. NO₂⁻ 0 vs 0.5 are nearly identical on the API card, so expect a range like 0–0.6).
- Printed ink and a wet pad never match perfectly, so a *fair* color match on some pads is normal. Values beyond the
  chart (e.g. `≈ 259 ppm — above chart (max 240 ppm), extrapolated`) are best-effort estimates. Confirm them with a
  liquid test if they matter.
- Validated on a real dipped API 5 in 1 strip photographed on its card: pad and swatch samples land correctly from
  sloppy taps, and the readings agree with careful visual inspection while adding ranges and match quality.
- Reading **time** matters: API says read KH & GH immediately and pH/NO₂⁻/NO₃⁻ after 30 s. Use the timer and, for best
  results, take two photos (the app picks the best-timed photo per parameter).
- Strip test kits are screening tools. Confirm alarming results with a liquid test kit.

## Project layout

```
index.html, css/, icon.svg, manifest.webmanifest   static web app (no build step)
js/core/      color science (CIELAB, ΔE2000), homography, sampling, matching, auto-align, analysis pipeline,
              targets.js (tank-type target ranges, status, corrective actions)
js/kits/      kit definitions (chart layout, values, strip pad order, timing) – one file per kit
js/ui/        browser UI: photo editor (tap/drag + loupe), results, dip timer, history (localStorage, CSV)
tools/        Node CLIs: analyze.mjs, rectify.mjs, kit-colors.mjs, serve.mjs
test/         unit tests (node:test) incl. synthetic photos with known truth; test/e2e/smoke.mjs browser test
docs/         user guide, targets & actions, adding a kit
```

## Development

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: color math (incl. published CIEDE2000 reference data), homography, matching, and full analysis on synthetic photos with perspective, rotation, color casts, noise, shadows and sloppy taps. |
| `npm run e2e` | Browser smoke test in headless **Edge** (`BROWSER_CHANNEL=chrome` for Chrome): uploads a synthetic photo, taps markers, checks readings, history and saltwater mode. `SCREENSHOT=out.png` saves a screenshot. |
| `npm run serve` | Local static server on port 8080 (`PORT` env or first arg to change). |
| `node tools/analyze.mjs photo.jpg --corners x,y x,y x,y x,y --pads x,y x,y [--water salt] [--overlay out.jpg] [--json]` | Analyze a photo from the command line with the same engine (pixel coordinates of the full-size photo). |
| `node tools/rectify.mjs chart.jpg --corners TL TR BR BL` | Straighten a chart table and draw a measurement grid (used when adding kits). |
| `node tools/kit-colors.mjs chart.jpg --corners TL TR BR BL --overlay check.jpg` | Print reference swatch colors for a kit file and draw the sample spots for checking. |

Node 20+ is required for the tools and tests. The app itself needs only a modern browser (Safari 15+, Chrome/Edge 100+).

## Deploying

**Live app: <https://canvo.com/TestStripAnalyzer/>**. The account's GitHub Pages custom domain is `canvo.com`;
`canvito.github.io/TestStripAnalyzer` redirects there. On iPhone, open it in Safari → Share → *Add to Home Screen* to use
it like an app.

The site is plain static files. `.github/workflows/pages.yml` publishes `index.html`, `css/`, `js/`, `icon.svg` and
`manifest.webmanifest` to **GitHub Pages** on every push to `main`, and `.github/workflows/ci.yml` runs `npm test`.
Pages is already enabled (repository **Settings → Pages → Source: GitHub Actions**), so pushing to `main` updates the
live app within a minute or two. Check progress under the repository's **Actions** tab. To redeploy without a code
change, run the *Deploy to GitHub Pages* workflow manually (*Run workflow*).

Saved history lives in the browser's local storage for the `canvo.com` origin, which every Pages site on that domain
shares. The app namespaces its keys (`tsa.*`) and treats stored data as untrusted.

### Hosting & architecture

The live app runs on **GitHub Pages only**. There is no backend, and **no Azure** or other cloud service is involved.

| Piece | Where | Notes |
| --- | --- | --- |
| App code | This repo, `main` branch | Static HTML/CSS/JS only: no server code, database, API keys, analytics or third-party calls. |
| Build & deploy | GitHub Actions (`.github/workflows/pages.yml`) | Copies the static files to GitHub Pages on every push to `main`. |
| Hosting & CDN | GitHub Pages, served through GitHub's CDN (Fastly) | Responses carry `Server: GitHub.com` and `X-GitHub-Request-Id`. |
| Domain | `canvo.com`, the custom domain of the user-site repo `canvito/canvito.github.io` (its Pages settings) | Project sites appear under it automatically, so this one is `canvo.com/TestStripAnalyzer/`. GitHub Pages issues the HTTPS certificate, and **Enforce HTTPS** is on for this repo, so `http://` redirects to `https://`. |
| DNS | Google Cloud DNS (`ns-cloud-c1…c4.googledomains.com`) | `canvo.com` A records → `185.199.108–111.153` (GitHub Pages); `www.canvo.com` CNAME → `canvito.github.io`. |
| User data | The user's browser | Photos are analyzed on the device and never uploaded. History is in local storage. |

Changing the custom domain of `canvito/canvito.github.io` or the `canvo.com` DNS records also changes this app's URL.

To verify the hosting at any time:

```powershell
Resolve-DnsName canvo.com -Type A                                                     # 185.199.108–111.153 = GitHub Pages
(Invoke-WebRequest https://canvo.com/TestStripAnalyzer/ -Method Head).Headers.Server  # GitHub.com
gh api repos/canvito/canvito.github.io/pages --jq .cname                              # canvo.com
```

## Disclaimer

For educational use only. Readings are computer-vision estimates whose accuracy depends on the photo, the strip and
the printed chart. They are not professional advice, come with no warranty, and should be confirmed with a liquid test
kit before acting. Full text: [DISCLAIMER.md](DISCLAIMER.md). The app shows it at the top of the home page until the
user taps *I understand*, then keeps a one-line reminder; the footer links back to it.

## License

MIT, see [LICENSE](LICENSE). Kit charts are measured from the manufacturer's printed card for interoperability. Brand
names belong to their owners.
