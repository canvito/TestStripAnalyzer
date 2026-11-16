// Tiny CLI argument parser: positional args in `_`, `--flag value`, and point lists for --corners / --pads.
const POINT_LISTS = new Set(['corners', 'pads']);
const BOOLEAN = new Set(['json']);

export function parseArgs(argv, defaults = {}) {
  const opts = { _: [], ...defaults };
  let key = null;
  for (const a of argv) {
    if (a.startsWith('--')) {
      key = a.slice(2);
      if (BOOLEAN.has(key)) {
        opts[key] = true;
        key = null;
      }
      continue;
    }
    if (POINT_LISTS.has(key)) (opts[key] ||= []).push(a.split(',').map(Number));
    else if (key) {
      opts[key] = a;
      key = null;
    } else opts._.push(a);
  }
  return opts;
}
