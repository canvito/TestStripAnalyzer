# Target ranges & corrective actions

Each reading gets a **status** for the **Tank** type chosen at the top of the app:

| Status | Meaning |
| --- | --- |
| ✓ **Normal** | Within the target range. |
| ⚠ **Low** / **High** | Outside the target. Correct it gradually; see *What to do* under the reading. |
| ⛔ **Very low** / **Very high** | Far enough out to stress or harm livestock. Act now. |

The status uses the estimated value rounded as displayed, so the label always agrees with the number on screen. For
values beyond the chart (≈, extrapolated), the status is based on that estimate.

The top of the results has:

- An overview table with the columns **Test | Reading | Status | Potential impact | Suggested mitigation**. The
  mitigation is a one-line fix, prefixed *Act now:* for Very low/high readings. Tests with two or more photos also show
  *Source* and *Timing*. On phones, each row stacks into a labelled block.
- A verdict box listing everything flagged, plus **cross-checks**:
  - High pH together with high KH: pH is held up by the buffer, so lower KH first.
  - Low pH together with low KH: raise KH first.
  - Nitrite at pH ≥ 8: test ammonia, which is far more toxic at high pH.

Each reading's card repeats the potential impact above its full step-by-step *What to do* list.

## Profiles

KH/GH are shown in °dKH/°dGH (1 °dH = 17.848 ppm as CaCO₃). The app compares in ppm, the unit the strip reports.
"Very" thresholds are in brackets.

| Tank type | pH | NO₂⁻ (ppm) | NO₃⁻ (ppm) | KH (°dKH) | GH (°dGH) |
| --- | --- | --- | --- | --- | --- |
| **Community tropical** (default freshwater) | 6.5–7.8 (< 6.0, > 8.5) | ≤ 0.2 (> 0.5) | ≤ 40 (> 80) | 3–8 (< 2) | 4–12 (< 2, > 20) |
| **Planted** | 6.5–7.5 (< 6.0, > 8.5) | ≤ 0.2 (> 0.5) | 5–30 (> 80) | 3–8 (< 1) | 4–12 (< 2, > 20) |
| **Soft water** (discus, cardinal tetras, Caridina shrimp) | 5.5–7.0 (> 7.8) | ≤ 0.2 (> 0.5) | ≤ 20 (> 40) | 1–4 (> 8) | 1–8 (> 15) |
| **African Rift Lake cichlids** | 7.8–8.6 (< 7.0, > 9.2) | ≤ 0.2 (> 0.5) | ≤ 40 (> 80) | 10–18 (< 6) | 12–20 (< 6) |
| **Marine fish-only** (default saltwater) | 8.0–8.4 (< 7.8, > 8.7) | ≤ 0.2 (> 1) | ≤ 30 (> 80) | 8–12 (< 6, > 14) | — |
| **Reef** | 8.1–8.4 (< 7.8, > 8.6) | ≤ 0.2 (> 1) | ≤ 10 (> 25) | 7–12 (< 6, > 14) | — |

Notes:

- Nitrite should be 0. The limit is 0.2 because the strip can barely tell 0 from 0.5 ppm.
- The API chart covers pH 6.0–9.0, KH ≤ 240 ppm (13 °dKH) and GH ≤ 180 ppm (10 °dGH). Targets outside that span
  (soft-water pH, cichlid KH/GH) rely on extrapolated values.
- The strip's nitrate steps (0, 20, 40 …) are too coarse for reef targets. Use a low-range nitrate test there.

Sources: [LiveAquaria – proper water parameters](https://www.liveaquaria.com/blogs/water-quality/proper-water-parameters-for-home-aquariums),
[Fast Aquatics – ideal parameters](https://fastaquatics.com/ideal-parameters/),
[Aquarium Toolbox – freshwater parameters](https://aquariumtoolbox.com/guides/freshwater-parameters),
[FishCare AI – water parameters guide](https://www.fishcareai.com/guides/aquarium-water-parameters/),
[Aquapacity – water parameter reference](https://aquapacity.com/articles/aquarium-water-parameters).
The "very" thresholds and the actions are conservative general guidance distilled from these. They are not
species-specific veterinary advice.

## Potential impact

Shown for every reading outside its target. The *Very* wording is used when the value is past the danger threshold.

| Reading | Freshwater — High/Low → Very | Saltwater — High/Low → Very |
| --- | --- | --- |
| pH high | Stress for soft-water species; ammonia more toxic → gill, skin and eye damage, ammonia highly toxic, can be fatal after a sudden swing. | Tied to heavy alkalinity dosing, precipitation risk → stress, precipitation strips Ca/alkalinity, more toxic ammonia. |
| pH low | Stress, weaker immunity, biofilter slows below ~6.5 → acid damage to gills and skin, biofilter largely stops below ~6, crash risk. | Slower coral calcification → corals may bleach or recede, fish stressed. |
| Nitrite high | "Brown blood": less oxygen transport, gasping, lethargy → severe oxygen starvation, deaths within hours to days. | Disturbed biofilter, invertebrates stressed → biofilter failure likely, ammonia present, invertebrates and corals at risk. |
| Nitrate high | Chronic stress, lower immunity, algae → sensitive fish and shrimp lethargic or dying, heavy algae. | Nuisance algae, coral browning → coral tissue loss, heavy algae, chronic fish stress. |
| Nitrate low (planted) | Plants starve of nitrogen; algae win. | — |
| KH high | pH stuck high; soft-water species stressed → failed breeding, shrimp molting problems. | Burnt coral tips, precipitation → coral tissue loss, calcium crash. |
| KH low | pH can crash suddenly → pH crash can stall the biofilter and kill fish overnight. | Slower coral growth, unstable pH → coral tissue loss, pH crashes. |
| GH high | Osmotic stress and failed breeding for soft-water species → shorter lifespan, molting problems. | — |
| GH low | Shrimp and snails can't molt or build shells; plant deficiencies → failed molts, shrimp deaths, eroding shells. | — |

## Corrective actions (summary)

The overview table's *Suggested mitigation* column shows a one-line version of these, and each reading's card shows the
full steps.

The full wording lives in [`js/core/targets.js`](../js/core/targets.js). Freshwater and saltwater have separate advice.

| Reading | Freshwater | Saltwater |
| --- | --- | --- |
| pH high | Find the source (tap water, calcareous rock or substrate). Lower ≤ 0.3/day with RO/distilled/rain water mixed into water changes, plus driftwood or almond leaves. Avoid pH-down chemicals while KH is high. | Usually alkalinity or kalkwasser overdosing: reduce it, do a water change, check KH. |
| pH low | Water change and cleanup. Raise KH first, then raise pH ≤ 0.3/day (crushed coral or buffer). Reduce CO₂ if injecting. | Excess CO₂: more gas exchange and ventilation. Fix alkalinity. Refugium on a reverse light cycle. |
| Nitrite high | 25–50 % water change daily until 0. Feed less. Protect the biofilter (bacteria product). Aquarium salt for nitrite protection (not with salt-sensitive animals). Test ammonia. | Water change, feed less, bacteria product, no new livestock. Test ammonia. |
| Nitrate high | 25–50 % water changes (several small ones if very high). Check tap nitrate. Feed less and clean more. Plants. Weekly changes. | RO/DI water changes. Less feeding, clean filter socks, tune the skimmer. Refugium or denitrification. |
| Nitrate low (planted) | Dose a nitrogen fertilizer. | — |
| KH high | Not toxic by itself. Dilute with RO/distilled/rain water; remove calcareous decor. | Stop or reduce alkalinity dosing; avoid sudden drops. |
| KH low | Raise ~1 °dKH/day: crushed coral, a buffer, or baking soda (≈ ¼ tsp per 10 US gal / 38 L ≈ +1 °dKH). Remineralize RO water. | Alkalinity supplement ≤ 1 °dKH/day. Check calcium and magnesium. Water changes. |
| GH high | Mainly matters for soft-water species. Dilute with RO/distilled/rain water. | — |
| GH low | GH booster or remineralizer, raised gradually. Always remineralize RO/rain water. | — |

## Changing targets or adding a tank type

Edit `PROFILES` in [`js/core/targets.js`](../js/core/targets.js). Each profile has `id`, `water` (`fresh`/`salt`),
`name`, `description`, optional `notes`, and `ranges` per parameter id (`ph`, `no2`, `no3`, `kh`, `gh`) with any of
`min`, `max`, `dangerBelow`, `dangerAbove`. Write KH/GH with `dh(°dH)` so they're stored in ppm. Actions live in
`ACTIONS[water][param][low|high]` (full steps), one-line table text in `MITIGATION[water][param][low|high]`, impacts
in `IMPACTS[water][param][low|high][caution|danger]`, and cross-checks in `INSIGHTS`. `npm test` verifies that every
out-of-range direction of every profile has actions, an impact and a mitigation. Update the tables above when you
change a profile.
