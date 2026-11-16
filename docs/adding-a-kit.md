# Adding a kit

A kit is one JavaScript module in `js/kits/` that describes the **color table** (where every swatch is and its value)
and the **strip** (pad order and spacing). The API 5 in 1 kit ([`js/kits/api-5in1.js`](../js/kits/api-5in1.js)) is the
reference example. All commands run from the repository root after `npm install`.

## 1 · Photograph the chart

Lay the color card flat and shoot it straight down in even light, without flash. Copy the JPEG to your PC.

## 2 · Find the 4 table corners

Open the photo in any image viewer that shows pixel coordinates (e.g. Paint, GIMP, Photoshop). Note the **outer
corners of the color table** in reading orientation: top-left, top-right, bottom-right, bottom-left. Pick corners that
are easy to see and tap on a phone, such as a printed border. Users will tap these same corners.

## 3 · Straighten the table and measure swatch centers

```powershell
node tools/rectify.mjs chart.jpg --corners 2164,237 3415,196 3450,1535 2179,1545 --out rect.jpg
```

This writes `rect.jpg` (the table straightened to 1000 px wide) and `rect-grid.jpg` with a grid every 0.05. For each
swatch read its center pixel `(x, y)` in `rect.jpg` and convert it to chart coordinates `u = x / width`,
`v = y / height`. Swatches in a row share `v` and are usually evenly spaced in `u`. The command also prints the
table's aspect ratio for `chart.aspect`.

Also note one **unprinted white spot inside the table** (`chart.whitePoints`) and the swatch size in `u, v`
(`chart.swatchSize`; used by the synthetic tests).

## 4 · Write the kit module

Copy `js/kits/api-5in1.js` and edit it:

| Field | Meaning |
| --- | --- |
| `id`, `name`, `description` | Shown in the kit selector. `id` must be unique. |
| `chart.cornerHint`, `chart.cornerLabels` | How the UI describes the 4 corners to tap. |
| `chart.sampleRadius` | Sample disc radius as a fraction of the swatch pitch (0.24 keeps the disc well inside the swatch). |
| `chart.whitePoints`, `chart.refWhite` | Blank paper spot(s) `[u, v]` and its color in the reference photo (step 5). |
| `strip.padOrder` | Parameter ids from the strip's **free tip** toward the handle. |
| `strip.padPositions` | Pad centers between the tip pad (0) and the last pad (1). **Measure them on a real strip** (see below); pads are often not evenly spaced. |
| `strip.padSize` | Pad edge length as a fraction of the tip-pad-to-last-pad distance. |
| `strip.sampleRadius` | Pad sample radius as a fraction of the pad edge (0.3 keeps the disc inside the pad). |
| `strip.tapHints` | Wording for the 2 pad taps. |
| `waterTypes` | e.g. Freshwater / Saltwater. |
| `timing` | Instructions shown above the dip timer. |
| `params[]` | One per pad: `id`, `name`, `symbol`, `unit`, optional `altUnit` `{unit, factor}`, optional `decimals`, `readAfterSec` (0 = read immediately), and `scales`. |
| `params[].scales[]` | `{ water: ['fresh', …], values: [...], swatches: [[u, v], …], ref: ['#hex', …] }`. Multiple scales let one pad use a different chart row per water type. A parameter with no scale for the chosen water type is hidden. |

Register the module in [`js/kits/index.js`](../js/kits/index.js).

### Measuring the strip

Photograph a dipped strip lying straight, then note the pixel center of every pad along the strip and the pad edge
length. With `d` = distance from the tip pad to the last pad:

- `padPositions[i]` = distance from the tip pad to pad *i*, divided by `d` (for API 5 in 1: centers at 94, 293, 533,
  787, 988 px → `[0, 0.223, 0.491, 0.775, 1]`).
- `padSize` = pad edge / `d` (API: 78 px / 894 px ≈ 0.087).

Check with `node tools/analyze.mjs strip.jpg --corners … --pads tipX,tipY lastX,lastY --overlay out.jpg`. The green
circles must sit in the middle of each pad and the cyan ones on the bare strip between pads.

## 5 · Capture reference colors and verify placement

```powershell
node tools/kit-colors.mjs chart.jpg --kit my-kit --corners 2164,237 3415,196 3450,1535 2179,1545 --overlay check.jpg
```

Open `check.jpg`. Every magenta circle must sit well inside its swatch and the cyan circle on blank paper. Paste the
printed hex values into each scale's `ref` and the white into `chart.refWhite`. The `spread` numbers should be small
(about 1–3). A large spread means the circle overlaps an edge or text.

The reference colors are **not** used for the reading, which always uses the chart in the user's own photo. They are
used to auto-detect the chart orientation (so corners can be tapped in any order) and to warn when the chart doesn't
look like the expected card.

## 6 · Test

```powershell
npm test       # copy the API tests in test/analyze.test.js to render synthetic photos of your kit with known values
npm run e2e
node tools/analyze.mjs strip-photo.jpg --kit my-kit --corners ... --pads tipX,tipY lastX,lastY --overlay out.jpg
```

Then try it on a real dipped strip in the browser (`npm run serve`) and update [docs/user-guide.md](user-guide.md) if
the kit needs special instructions.
