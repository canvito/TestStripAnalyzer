# User guide

How to test your aquarium water with the Test Strip Analyzer. This guide uses the API 5 in 1 kit, but other kits work the same way.

## What you need

- The test strips and the kit's **flat color card** (the leaflet in the box, not the bottle label).
- A phone with a camera. Open **<https://canvo.com/TestStripAnalyzer/>** in Safari or Chrome. On iPhone: Share →
  *Add to Home Screen* for one-tap access.
- Good, even light. Daylight near a window (not direct sun) is ideal. **Avoid flash.**

## 1 · Set up (once)

At the top of the app pick the **Kit** and **Freshwater / Saltwater**. Saltwater uses the saltwater pH row, and GH is
hidden because the API card has no saltwater GH scale. The app remembers these settings.

## 2 · Dip & time

1. Lay the color card flat where you'll take the photo.
2. Dip the strip into the tank, swirl 2×, and pull it out pads up. **Don't shake off the water.**
3. Tap **▶ Start timer** the moment the strip leaves the water (optional but recommended).
4. Lay the strip **on the card**, right next to the color table, pads up. Both must be under the same light.

The timer beeps and tells you when to shoot:

| Time after dipping | Read | Why |
| --- | --- | --- |
| 0–15 s | **KH, GH** | These pads keep changing; API says read immediately. |
| 25 s – 2 min | **pH, NO₂⁻, NO₃⁻** | API says wait 30 s. |

For the most accurate result take **two photos**: one right away (for KH/GH), then *Add another photo* at 30 s. The
app tags each photo with its time and uses the best-timed photo per parameter in the **Combined reading**. One photo at
about 30 s is fine for a quick check, but KH/GH will be marked *late*.

## 3 · Take the photo

- Shoot **straight down**, filling the frame with the color table and the strip.
- No shadows from your phone or hand. No shiny glare spots on the wet pads.
- Make sure the table and all pads are sharp. Tap to focus on the card.

## 4 · Mark the chart & strip

1. Tap the **4 outer corners of the blue-bordered color table**, in any order. Press and slide to fine-tune; the
   magnifier shows exactly where the marker is.
2. Tap the center of the **pad at the free tip of the strip** (Nitrate on the API strip).
3. Tap the center of the **pad nearest the end you hold** (GH on the API strip). The pads in between are placed
   automatically.
4. Check the overlay. White circles sit on the chart swatches and green circles sit on the pads. **Drag any marker** to
   adjust it. If you move an end pad, the middle pads follow (unless you've moved them yourself).

*Auto-align markers* (on by default) fits the table outline (cyan) so every white circle sits inside its swatch, and
snaps every green circle to the middle of its pad, even if your taps were a bit off. Your own markers stay where you
put them, and alignment always starts from them, so turning it off uses your exact taps. *Show sample spots* toggles the
circles.

## 5 · Read the results

Each parameter shows:

- **Big number.** The interpolated reading, e.g. `7.3`. KH/GH also show °dKH/°dGH.
- **Range in brackets.** All values whose chart color is practically indistinguishable from your pad (within 2 ΔE₀₀).
  A wide range means the chart itself can't separate those steps, not that the app failed.
- **Color bar.** The chart swatches *as captured in your photo*. The outlined box is the range and ▲ is the reading.
  The square chip next to the name is your pad's color.
- **Match** quality: *good* (ΔE ≤ 3), *fair* (≤ 6), *poor* (> 6). Poor means the pad doesn't look like any chart
  color. Check glare, shadows, marker position, and timing.
- **Timing tag** (when the timer was used): ✓ on time, *early*, or *late*.

### Warnings and what to do

| Warning | Fix |
| --- | --- |
| *pad sample is not uniform* | Drag the green marker to the middle of the pad. |
| *chart swatch … overlaps an edge or text* | Adjust the table corners (or turn on *Auto-align markers*). |
| *glare / over-exposure* | Tilt the card slightly or move away from direct light. No flash. |
| *Strip and chart look unevenly lit* | Put the strip on the card and remove shadows. |
| *chart … does not look like the … card* | The corners aren't on the color table's outer corners, or the wrong kit is selected. |
| *pad color is far from every chart color* | Usually timing (too late), glare, or an expired/contaminated strip. |

## 6 · Save & track

- **💾 Save to history** stores the (combined) reading in this browser on this device.
- **⬇ Export CSV** downloads every saved reading (value, low, high, quality per parameter) for a spreadsheet.
- **New test** clears the photos and timer for the next strip.

History lives in the browser's local storage. Clearing site data or using a different browser/device starts empty.
Export CSV regularly if you want a backup.

## Troubleshooting

- **Photo won't open.** On iPhone the photo is converted to JPEG automatically. On other devices pick a JPEG/PNG.
- **Markers are hard to place on a small screen.** Take the photo closer so the table fills more of the frame, then
  press, hold and slide using the magnifier.
- **Readings look off.** Compare the white circles with the swatches. If they're misaligned, re-tap the corners.
  Also re-check the water type setting.
