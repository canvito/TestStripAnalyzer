// API 5 in 1 Test Strips (pH, NO2-, NO3-, KH, GH) - flat color card shipped in the box.
//
// Chart coordinates are normalized to the OUTER corners of the blue-bordered color table:
// u = 0 (left edge) .. 1 (right edge), v = 0 (top edge, nitrate row) .. 1 (bottom edge, GH row).
// Swatch centers were measured from a rectified photo of the card (see docs/adding-a-kit.md).
// `ref` colors are Display-P3 hex values from that reference photo; they are only used as a
// sanity check / preview, never for the reading itself (the reading uses the chart in YOUR photo).

const NO3_NO2_U = [0.275, 0.388, 0.5005, 0.6135, 0.7265, 0.8395];
const PH_U = [0.1868, 0.2995, 0.412, 0.525, 0.6392, 0.754, 0.8665];
const KH_U = [0.299, 0.4125, 0.5255, 0.639, 0.7525, 0.866];
const GH_U = [0.2945, 0.408, 0.5215, 0.6355, 0.75];

const at = (us, v) => us.map((u) => [u, v]);

export default {
  id: 'api-5in1',
  name: 'API 5 in 1 Test Strips',
  description: 'pH · Nitrite (NO₂⁻) · Nitrate (NO₃⁻) · Carbonate hardness (KH) · General hardness (GH)',
  chart: {
    cornerHint: 'outer corners of the blue-bordered color table',
    cornerLabels: ['top-left (next to “NO₃”)', 'top-right', 'bottom-right', 'bottom-left (next to “GH”)'],
    aspect: 0.956,
    swatchSize: [0.092, 0.082],
    // Sample disc radius as a fraction of the distance between neighbouring swatch centers.
    sampleRadius: 0.24,
    // Unprinted paper inside the table (empty slot at the end of the GH row).
    whitePoints: [[0.866, 0.888]],
    refWhite: '#bbbab2',
  },
  strip: {
    // Pad order starting from the free tip of the strip (farthest from where you hold it).
    padOrder: ['no3', 'no2', 'ph', 'kh', 'gh'],
    // Relative pad center positions between the first and last pad (0 = tip pad, 1 = pad nearest the handle).
    padPositions: [0, 0.25, 0.5, 0.75, 1],
    // Sample disc radius as a fraction of the distance between neighbouring pad centers.
    sampleRadius: 0.18,
    tapHints: ['the pad at the free tip of the strip (Nitrate)', 'the pad nearest the handle (GH)'],
  },
  waterTypes: [
    { id: 'fresh', name: 'Freshwater' },
    { id: 'salt', name: 'Saltwater' },
  ],
  timing: 'Dip, swirl 2×, remove pads up — do not shake. Read KH & GH immediately; read pH, NO₂⁻ and NO₃⁻ after 30 seconds.',
  params: [
    {
      id: 'no3',
      name: 'Nitrate',
      symbol: 'NO₃⁻',
      unit: 'ppm',
      readAfterSec: 30,
      scales: [
        {
          water: ['fresh', 'salt'],
          values: [0, 20, 40, 80, 160, 200],
          swatches: at(NO3_NO2_U, 0.0675),
          ref: ['#b2a997', '#a9998e', '#a48b83', '#99716d', '#8c5358', '#86454f'],
        },
      ],
    },
    {
      id: 'no2',
      name: 'Nitrite',
      symbol: 'NO₂⁻',
      unit: 'ppm',
      readAfterSec: 30,
      scales: [
        {
          water: ['fresh', 'salt'],
          values: [0, 0.5, 1, 3, 5, 10],
          swatches: at(NO3_NO2_U, 0.2368),
          ref: ['#bab1a1', '#b7ad9c', '#ae9990', '#a27676', '#996364', '#85404a'],
        },
      ],
    },
    {
      id: 'ph',
      name: 'pH',
      symbol: 'pH',
      unit: '',
      decimals: 1,
      readAfterSec: 30,
      scales: [
        {
          water: ['fresh'],
          values: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0],
          swatches: at(PH_U, 0.403),
          ref: ['#b28d27', '#a27524', '#9e6222', '#90431e', '#7a2f20', '#73201c', '#7b1c23'],
        },
        {
          water: ['salt'],
          values: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0],
          swatches: at(PH_U, 0.5543),
          ref: ['#a77823', '#a16222', '#9a4e21', '#943d21', '#781921', '#661028', '#540f2e'],
        },
      ],
    },
    {
      id: 'kh',
      name: 'Carbonate hardness',
      symbol: 'KH',
      unit: 'ppm',
      altUnit: { unit: '°dKH', factor: 1 / 17.848 },
      readAfterSec: 0,
      scales: [
        {
          water: ['fresh', 'salt'],
          values: [0, 40, 80, 120, 180, 240],
          swatches: at(KH_U, 0.719),
          ref: ['#aea357', '#919556', '#66835b', '#5a7d5d', '#486f5c', '#31655e'],
        },
      ],
    },
    {
      id: 'gh',
      name: 'General hardness',
      symbol: 'GH',
      unit: 'ppm',
      altUnit: { unit: '°dGH', factor: 1 / 17.848 },
      readAfterSec: 0,
      scales: [
        {
          water: ['fresh'],
          values: [0, 30, 60, 120, 180],
          swatches: at(GH_U, 0.8876),
          ref: ['#4c796e', '#396f6d', '#38606e', '#2d4b63', '#283053'],
        },
      ],
    },
  ],
};
