// Target ranges per tank type, status (low / normal / high) and corrective actions.
// General guidance compiled from common hobby references (see docs/targets.md); species needs vary.
// KH/GH ranges are written in German degrees and stored in ppm (as CaCO3), the unit the strips report.

const DH = 17.848; // ppm CaCO3 per °dH
const dh = (degrees) => degrees * DH;

/** Range fields: min/max = normal band; dangerBelow/dangerAbove = "very low/high" (act now). */
export const PROFILES = [
  {
    id: 'fw-community',
    water: 'fresh',
    name: 'Community tropical',
    description: 'Most tetras, rasboras, corydoras, danios, gouramis, livebearers, bettas',
    ranges: {
      ph: { min: 6.5, max: 7.8, dangerBelow: 6.0, dangerAbove: 8.5 },
      no2: { max: 0.2, dangerAbove: 0.5 },
      no3: { max: 40, dangerAbove: 80 },
      kh: { min: dh(3), max: dh(8), dangerBelow: dh(2) },
      gh: { min: dh(4), max: dh(12), dangerBelow: dh(2), dangerAbove: dh(20) },
    },
    notes: ['Captive-bred community fish adapt to a wide range — a stable value matters more than a perfect one.'],
  },
  {
    id: 'fw-planted',
    water: 'fresh',
    name: 'Planted',
    description: 'Planted community tank, with or without CO₂ injection',
    ranges: {
      ph: { min: 6.5, max: 7.5, dangerBelow: 6.0, dangerAbove: 8.5 },
      no2: { max: 0.2, dangerAbove: 0.5 },
      no3: { min: 5, max: 30, dangerAbove: 80 },
      kh: { min: dh(3), max: dh(8), dangerBelow: dh(1) },
      gh: { min: dh(4), max: dh(12), dangerBelow: dh(2), dangerAbove: dh(20) },
    },
    notes: ['With CO₂ injection pH drops by up to ~1 during the light period; that swing is normal.'],
  },
  {
    id: 'fw-soft',
    water: 'fresh',
    name: 'Soft water',
    description: 'Discus, cardinal tetras, wild bettas, Caridina shrimp',
    ranges: {
      ph: { min: 5.5, max: 7.0, dangerAbove: 7.8 },
      no2: { max: 0.2, dangerAbove: 0.5 },
      no3: { max: 20, dangerAbove: 40 },
      kh: { min: dh(1), max: dh(4), dangerAbove: dh(8) },
      gh: { min: dh(1), max: dh(8), dangerAbove: dh(15) },
    },
    notes: ['The strip chart starts at pH 6.0, so lower pH values are extrapolated.'],
  },
  {
    id: 'fw-rift-cichlid',
    water: 'fresh',
    name: 'African Rift Lake cichlids',
    description: 'Lake Malawi / Tanganyika cichlids',
    ranges: {
      ph: { min: 7.8, max: 8.6, dangerBelow: 7.0, dangerAbove: 9.2 },
      no2: { max: 0.2, dangerAbove: 0.5 },
      no3: { max: 40, dangerAbove: 80 },
      kh: { min: dh(10), max: dh(18), dangerBelow: dh(6) },
      gh: { min: dh(12), max: dh(20), dangerBelow: dh(6) },
    },
    notes: ['The strip chart tops out at KH 240 ppm (13 °dKH) and GH 180 ppm (10 °dGH); higher values are extrapolated.'],
  },
  {
    id: 'sw-fish',
    water: 'salt',
    name: 'Marine fish-only',
    description: 'Fish-only or fish with live rock (FOWLR)',
    ranges: {
      ph: { min: 8.0, max: 8.4, dangerBelow: 7.8, dangerAbove: 8.7 },
      no2: { max: 0.2, dangerAbove: 1 },
      no3: { max: 30, dangerAbove: 80 },
      kh: { min: dh(8), max: dh(12), dangerBelow: dh(6), dangerAbove: dh(14) },
    },
    notes: [],
  },
  {
    id: 'sw-reef',
    water: 'salt',
    name: 'Reef',
    description: 'Corals and invertebrates',
    ranges: {
      ph: { min: 8.1, max: 8.4, dangerBelow: 7.8, dangerAbove: 8.6 },
      no2: { max: 0.2, dangerAbove: 1 },
      no3: { max: 10, dangerAbove: 25 },
      kh: { min: dh(7), max: dh(12), dangerBelow: dh(6), dangerAbove: dh(14) },
    },
    notes: ['The strip’s nitrate scale (0, 20, 40 …) is too coarse for reef targets — use a low-range nitrate test to fine-tune.'],
  },
];

const ACTIONS = {
  fresh: {
    ph: {
      high: [
        'Find the source: test your tap water and remove limestone, crushed coral, shells or other calcareous rock and substrate.',
        'Lower pH gradually (no more than ~0.3 per day) with partial water changes using softer water — mix RO, distilled or rain water into tap water.',
        'Driftwood, Indian almond (catappa) leaves or aquarium peat in the filter lower pH gently.',
        'Avoid “pH down” chemicals while KH is high: the buffer pushes pH back up, and the swings stress fish more than a stable high pH.',
      ],
      low: [
        'Do a 25–30 % water change and clean the gravel and filter — built-up waste acidifies the water.',
        'Check KH: low KH lets pH drift down. Raise KH first (see Carbonate hardness).',
        'Raise pH slowly (≤ 0.3 per day) with crushed coral or aragonite in the filter, or a KH buffer.',
        'With CO₂ injection, reduce the CO₂ rate if fish gasp at the surface.',
      ],
    },
    no2: {
      high: [
        'Nitrite is toxic: change 25–50 % of the water today (dechlorinated, same temperature) and repeat daily until it reads 0.',
        'Feed very lightly or skip 1–2 days of feeding; remove uneaten food and any dead fish or decaying plants.',
        'Protect the biofilter: don’t replace filter media or rinse it in tap water (use old tank water); a nitrifying-bacteria product can help. Don’t add fish until nitrite stays at 0.',
        'Aquarium salt (chloride) reduces nitrite uptake by the gills — follow the product dose, but skip it with salt-sensitive animals (scaleless fish, shrimp, snails, many plants).',
        'Usual causes: tank not fully cycled, overstocking or overfeeding, a stopped or over-cleaned filter, or medication that harmed the bacteria. Test ammonia too (not on this strip).',
      ],
    },
    no3: {
      high: [
        'Do a 25–50 % water change. If nitrate is very high, do several smaller changes over a few days rather than one big one, so fish adjust.',
        'Test your tap water’s nitrate — if it is high too, use RO water or a nitrate-removing resin.',
        'Cut the source: feed less, vacuum the gravel, rinse mechanical filter media regularly, avoid overstocking.',
        'Fast-growing or floating plants absorb nitrate. Keep up weekly 25–30 % water changes.',
      ],
      low: ['Plants need some nitrogen: dose a fertilizer containing nitrogen (follow the label) and re-test in a few days.'],
    },
    kh: {
      high: [
        'High KH is not toxic by itself — it mainly keeps pH high and very stable.',
        'Lower it gradually by mixing RO, distilled or rain water into your water changes.',
        'Remove calcareous decor and substrate (limestone, crushed coral, shells, some “holey” rock).',
      ],
      low: [
        'Low KH means weak buffering: pH can crash suddenly.',
        'Raise slowly (about 1 °dKH per day) with crushed coral or aragonite in the filter, a KH buffer, or baking soda — ≈ ¼ teaspoon per 10 US gal (38 L) raises KH by about 1 °dKH; dissolve it first.',
        'If you use RO or rain water, remineralize it before use.',
      ],
    },
    gh: {
      high: [
        'Mostly a concern for soft-water species (discus, cardinal tetras, Caridina shrimp); livebearers and many cichlids like hard water.',
        'Lower gradually by mixing RO, distilled or rain water into water changes, and remove calcareous rock or substrate.',
      ],
      low: [
        'Fish, plants and especially shrimp and snails need calcium and magnesium (molting, shells, osmoregulation).',
        'Add a GH booster / remineralizer (or crushed coral) per the product dose, raising it gradually.',
        'If you use RO or rain water, always remineralize it.',
      ],
    },
  },
  salt: {
    ph: {
      high: [
        'Usually caused by overdosing alkalinity or kalkwasser — pause or reduce that dosing.',
        'Do a water change with properly mixed salt water, and check alkalinity (KH).',
      ],
      low: [
        'Usually excess CO₂: increase surface agitation and gas exchange; ventilate the room (or feed the skimmer with outside air).',
        'Bring alkalinity (KH) into range.',
        'A refugium lit on a reverse cycle steadies night-time pH.',
      ],
    },
    no2: {
      high: [
        'Nitrite in an established marine tank means the biofilter is disturbed: do a water change, feed less, consider a nitrifying-bacteria product, and add no livestock until it reads 0.',
        'Test ammonia too (not on this strip).',
      ],
    },
    no3: {
      high: [
        'Do water changes with nitrate-free (RO/DI) water.',
        'Feed less, change filter socks/sponges often, and keep the protein skimmer tuned.',
        'Add nutrient export: a refugium with macroalgae, denitrifying media, or carbon dosing (advanced — go slowly).',
      ],
    },
    kh: {
      high: [
        'Stop or reduce alkalinity dosing and let the system use it up — avoid sudden drops.',
        'Very high alkalinity can cause precipitation and burnt coral tips.',
      ],
      low: [
        'Dose an alkalinity supplement (two-part, soda ash or baking soda), raising it by no more than ~1 °dKH per day.',
        'Check calcium and magnesium too (not on this strip) — they are used up together with alkalinity.',
        'Regular water changes with a quality salt mix replenish alkalinity.',
      ],
    },
  },
};

/** Cross-parameter hints, given statuses and values keyed by parameter id. */
const INSIGHTS = [
  {
    when: (s, v, water) => water === 'fresh' && s.ph?.level === 'high' && s.kh?.level === 'high',
    text: 'Your pH is high because the water is strongly buffered (high KH). Lower KH first with RO, distilled or rain water — pH will follow and stay stable. pH-down chemicals won’t hold.',
  },
  {
    when: (s) => s.ph?.level === 'low' && s.kh?.level === 'low',
    text: 'Low KH lets pH fall. Raise KH first; pH will stabilize with it.',
  },
  {
    when: (s, v) => s.no2?.level === 'high' && v.ph >= 8,
    text: 'At pH 8 and above, ammonia is far more toxic. With nitrite present, test ammonia now.',
  },
];

export function profilesFor(water) {
  return PROFILES.filter((p) => p.water === water);
}

export function getProfile(id, water) {
  return PROFILES.find((p) => p.id === id && p.water === water) ?? profilesFor(water)[0];
}

const roundTo = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * Status of a value against a profile's range. The value is first rounded to the displayed precision,
 * so the label always agrees with the number shown.
 * @returns {null | { level: 'low'|'normal'|'high', severity: 'ok'|'caution'|'danger', label: string, range: object, actions: string[] }}
 */
export function evaluate(paramId, value, profile, decimals = 1) {
  const range = profile.ranges[paramId];
  if (!range || !Number.isFinite(value)) return null;
  const v = roundTo(value, decimals);
  let level = 'normal';
  let severity = 'ok';
  if (range.min != null && v < roundTo(range.min, decimals)) {
    level = 'low';
    severity = range.dangerBelow != null && v < roundTo(range.dangerBelow, decimals) ? 'danger' : 'caution';
  } else if (range.max != null && v > roundTo(range.max, decimals)) {
    level = 'high';
    severity = range.dangerAbove != null && v > roundTo(range.dangerAbove, decimals) ? 'danger' : 'caution';
  }
  const label = level === 'normal' ? 'Normal' : severity === 'danger' ? `Very ${level}` : cap(level);
  const actions = level === 'normal' ? [] : (ACTIONS[profile.water]?.[paramId]?.[level] ?? []);
  return { level, severity, label, range, actions };
}

/** Human-readable target, e.g. "6.5–7.8", "≤ 40 ppm", "54–143 ppm (3–8 °dKH)". */
export function formatTarget(range, { unit = '', decimals = 0, altUnit } = {}) {
  const u = unit ? ` ${unit}` : '';
  const fmt = (v) => roundTo(v, decimals).toFixed(decimals);
  const span = (f) => {
    if (range.min != null && range.max != null) return `${f(range.min)}–${f(range.max)}`;
    if (range.max != null) return `≤ ${f(range.max)}`;
    return `≥ ${f(range.min)}`;
  };
  const alt = altUnit ? ` (${span((v) => (v * altUnit.factor).toFixed(0))} ${altUnit.unit})` : '';
  return `${span(fmt)}${u}${alt}`;
}

/**
 * Evaluate all readings of an analysis result (or combined readings) against a profile.
 * @param {Array<{id:string, decimals:number, match:{value:number}|null}>} params
 */
export function assess(params, profile) {
  const statuses = {};
  const values = {};
  for (const p of params) {
    if (!p.match) continue;
    values[p.id] = p.match.value;
    const s = evaluate(p.id, p.match.value, profile, p.decimals);
    if (s) statuses[p.id] = s;
  }
  const insights = INSIGHTS.filter((i) => i.when(statuses, values, profile.water)).map((i) => i.text);
  const counts = { ok: 0, caution: 0, danger: 0 };
  Object.values(statuses).forEach((s) => counts[s.severity]++);
  return { profile, statuses, insights, counts };
}
