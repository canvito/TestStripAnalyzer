# Disclaimer

**For educational use only.** Test Strip Analyzer turns a photo of a test strip into estimated readings with computer
vision. The results **may be inaccurate**. They depend on how the photo is taken (lighting, focus, glare, shadows,
camera), the condition and timing of the strip, and the printed chart. Don't rely on this tool alone: **confirm
important results with a liquid test kit** before treating your water or animals.

1. **Educational and informational use only.** This tool is not professional, veterinary or water-treatment advice.
2. **Estimates, not measurements.** Results are computed from a photograph by comparing colors and may be inaccurate
   or wrong. They depend on:
   - the photo (lighting, white balance, focus, glare, shadows, angle);
   - the device and browser;
   - where the markers are placed;
   - the test strip (expired, contaminated or badly stored strips, read timing);
   - the printed color chart.

   Test strips themselves have limited precision.
3. **Targets and advice are general guidance.** Target ranges, status labels, potential impacts and suggested
   mitigations come from common hobby references (see [docs/targets.md](docs/targets.md)) and may not suit your
   species or setup.
4. **Verify before acting.** Confirm results with a quality liquid test kit or a professional before changing water
   chemistry, dosing products or medicating, and make changes gradually.
5. **No warranty.** The tool is provided "as is", without warranty of any kind, as stated in its [MIT license](LICENSE).
6. **Limitation of liability.** To the fullest extent permitted by law, the authors and contributors are not liable
   for any loss or damage, including loss of fish, invertebrates, plants, equipment or property, arising from the use
   of, or reliance on, this tool. You use it at your own risk and remain responsible for the care of your animals.
7. **No affiliation.** Not affiliated with, endorsed or sponsored by API®, Mars Fishcare or any test-kit manufacturer.
   Trademarks belong to their owners.
8. **Privacy.** Photos are processed on your device and never uploaded. History stays in your browser.

---

*Maintainers:* the same text appears in the app (`index.html`, `#disclaimer`). Keep both in sync. If you change the
meaning, bump `DISCLAIMER_KEY` in `js/app.js` (e.g. `tsa.disclaimer.v2`) so every user sees the full notice again and
re-acknowledges it.
