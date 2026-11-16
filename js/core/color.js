// Color science helpers: 8-bit RGB (sRGB or Display P3) -> linear -> XYZ (D65) -> CIELAB, plus CIEDE2000.
// Both supported RGB spaces share the sRGB transfer curve and D65 white point.

const RGB_TO_XYZ = {
  srgb: [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.072175],
    [0.0193339, 0.119192, 0.9503041],
  ],
  'display-p3': [
    [0.4865709, 0.2656677, 0.1982173],
    [0.2289746, 0.6917385, 0.0792869],
    [0.0, 0.0451134, 1.0439444],
  ],
};

export const COLOR_SPACES = Object.keys(RGB_TO_XYZ);
const WHITE_D65 = [0.95047, 1.0, 1.08883];

export function decodeChannel(v8) {
  const c = v8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function encodeChannel(lin) {
  const c = Math.min(1, Math.max(0, lin));
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return v * 255;
}

/** Lookup table: 8-bit encoded value -> linear light. */
export const LINEAR_LUT = Float64Array.from({ length: 256 }, (_, i) => decodeChannel(i));

function matrixFor(space) {
  const m = RGB_TO_XYZ[space];
  if (!m) throw new Error(`Unsupported color space: ${space}`);
  return m;
}

export function linearRgbToXyz([r, g, b], space = 'srgb') {
  const m = matrixFor(space);
  return [
    m[0][0] * r + m[0][1] * g + m[0][2] * b,
    m[1][0] * r + m[1][1] * g + m[1][2] * b,
    m[2][0] * r + m[2][1] * g + m[2][2] * b,
  ];
}

const EPS = (6 / 29) ** 3;
const f = (t) => (t > EPS ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);

export function xyzToLab([x, y, z]) {
  const fx = f(x / WHITE_D65[0]);
  const fy = f(y / WHITE_D65[1]);
  const fz = f(z / WHITE_D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function linearRgbToLab(rgbLin, space = 'srgb') {
  return xyzToLab(linearRgbToXyz(rgbLin, space));
}

export function labToXyz([L, a, b]) {
  const fy = (L + 16) / 116;
  const inv = (t) => (t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29));
  return [WHITE_D65[0] * inv(fy + a / 500), WHITE_D65[1] * inv(fy), WHITE_D65[2] * inv(fy - b / 200)];
}

const XYZ_TO_RGB = {};
function inverseMatrix(space) {
  if (!XYZ_TO_RGB[space]) {
    const [[a, b, c], [d, e, f2], [g, h, i]] = matrixFor(space);
    const A = e * i - f2 * h;
    const B = -(d * i - f2 * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    XYZ_TO_RGB[space] = [
      [A / det, -(b * i - c * h) / det, (b * f2 - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f2 - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  }
  return XYZ_TO_RGB[space];
}

/** Lab -> linear RGB (unclamped). */
export function labToLinearRgb(lab, space = 'srgb') {
  const m = inverseMatrix(space);
  const [x, y, z] = labToXyz(lab);
  return [m[0][0] * x + m[0][1] * y + m[0][2] * z, m[1][0] * x + m[1][1] * y + m[1][2] * z, m[2][0] * x + m[2][1] * y + m[2][2] * z];
}

/** Lab -> 8-bit encoded RGB (clamped to gamut). */
export function labToRgb8(lab, space = 'srgb') {
  return labToLinearRgb(lab, space).map(encodeChannel);
}

export function rgb8ToLab([r, g, b], space = 'srgb') {
  return linearRgbToLab([decodeChannel(r), decodeChannel(g), decodeChannel(b)], space);
}

export function deltaE76(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const POW25_7 = 25 ** 7;

function hueDeg(b, a) {
  if (a === 0 && b === 0) return 0;
  const h = deg(Math.atan2(b, a));
  return h < 0 ? h + 360 : h;
}

/** CIEDE2000 color difference (Sharma, Wu & Dalal 2005). */
export function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = hueDeg(b1, a1p);
  const h2p = hueDeg(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2;
  else hbp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hbp - 30)) +
    0.24 * Math.cos(rad(2 * hbp)) +
    0.32 * Math.cos(rad(3 * hbp + 6)) -
    0.2 * Math.cos(rad(4 * hbp - 63));
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Cbp7 = Cbp ** 7;
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + POW25_7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  const l = dLp / SL;
  const c = dCp / SC;
  const h = dHp / SH;
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}

export function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** CSS color string for an encoded 8-bit triple in the given space. */
export function cssColor([r, g, b], space = 'srgb') {
  if (space === 'display-p3') {
    const c = (v) => (Math.min(255, Math.max(0, v)) / 255).toFixed(4);
    return `color(display-p3 ${c(r)} ${c(g)} ${c(b)})`;
  }
  const c = (v) => Math.round(Math.min(255, Math.max(0, v)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}
