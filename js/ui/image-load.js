// Load a photo File into a working canvas, preserving wide-gamut (Display P3) color when the browser supports it.

const MAX_DIM = 2400; // keeps memory/canvas limits safe on phones while leaving plenty of pixels per swatch

function createContext(canvas) {
  try {
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3', willReadFrequently: true });
    if (ctx && ctx.getContextAttributes?.().colorSpace === 'display-p3') return { ctx, space: 'display-p3' };
  } catch {
    /* fall through to sRGB */
  }
  return { ctx: canvas.getContext('2d', { willReadFrequently: true }), space: 'srgb' };
}

async function decode(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Revoke after the image has been drawn by the caller.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

/** @returns {Promise<{ canvas: HTMLCanvasElement, pixels: {width,height,data}, space: string }>} */
export async function loadImageFile(file, maxDim = MAX_DIM) {
  const img = await decode(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const { ctx, space } = createContext(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    canvas,
    pixels: { width: data.width, height: data.height, data: data.data },
    space: data.colorSpace || space,
  };
}
