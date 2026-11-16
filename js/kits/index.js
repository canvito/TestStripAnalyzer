import api5in1 from './api-5in1.js';

/** All supported kits. Add new kit modules here (see docs/adding-a-kit.md). */
export const KITS = [api5in1];

export function getKit(id) {
  const kit = KITS.find((k) => k.id === id);
  if (!kit) throw new Error(`Unknown kit: ${id}`);
  return kit;
}
