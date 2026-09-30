import type { Product, Sample } from '../data/catalog';
import { MATERIALS, PRINT, compositeFlat, defaultDesign, loadImage, renderDesign, type Design, type Material } from './engrave';

export const SAMPLE_PHOTOS = {
  caine: '/img/samples/caine.jpg',
  cuplu: '/img/samples/cuplu.jpg',
  'caine-decupat': '/img/samples/caine-decupat.png',
  'cuplu-decupat': '/img/samples/cuplu-decupat.png',
  portret: '/img/samples/portret.jpg',
  'portret-decupat': '/img/samples/portret-decupat.png',
} as const;

/** Pixel size of the engraving area on a square preview of `size` px. */
export const areaPx = (p: Product, size: number) => ({
  x: Math.round(p.area.x * size),
  y: Math.round(p.area.y * size),
  w: Math.round(p.area.w * size),
  h: Math.round(p.area.h * size),
});

export const wrapArc = (p: Product) => (p.cylinder ? (p.cylinder.arcDeg * Math.PI) / 180 : 0);

/**
 * Size of the design itself. On a cylinder the photo shows the engraving foreshortened,
 * so the flat design is wider than the area we see.
 */
export function designSize(p: Product, size: number) {
  const a = areaPx(p, size);
  const arc = wrapArc(p);
  const k = arc ? arc / (2 * Math.sin(arc / 2)) : 1;
  return { w: Math.round(a.w * k), h: a.h };
}

export async function designFromSample(sample: Sample): Promise<Design> {
  const d = defaultDesign();
  if (sample.photo) {
    const img = await loadImage(SAMPLE_PHOTOS[sample.photo]);
    d.photo = img;
    d.photoW = img.naturalWidth;
    d.photoH = img.naturalHeight;
  }
  d.shape = sample.shape ?? d.shape;
  d.style = sample.style ?? d.style;
  // the editor has one free-text field; sample lines go in as separate lines
  d.text = [sample.text, sample.text2].filter(Boolean).join('\n');
  d.text2 = '';
  d.font = sample.font ?? d.font;
  d.textPos = sample.textPos ?? d.textPos;
  return d;
}

/** Material the design lands on: colour print, or the laser behaviour of the chosen colour. */
export function materialFor(product: Product, design: Design, colorId?: string): Material {
  if (design.technique === 'color') return PRINT;
  const c = product.colors?.find((x) => x.id === colorId);
  return MATERIALS[c?.material ?? product.material];
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Repaints the product in another colour, keeping the photo's light and shadow.
 * `mask` is the product silhouette (white = product), aligned with the photo.
 */
export function recolorBase(base: HTMLImageElement, mask: HTMLImageElement, hex: string, size = 2048): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(base, 0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const m = document.createElement('canvas');
  m.width = m.height = size;
  const mg = m.getContext('2d', { willReadFrequently: true })!;
  mg.drawImage(mask, 0, 0, size, size);
  const a = mg.getImageData(0, 0, size, size).data;
  const px = img.data;
  // shading comes from a softened copy: the grain of a dark photo would turn into blotches on a light colour
  const sm = document.createElement('canvas');
  sm.width = sm.height = size;
  const sg = sm.getContext('2d', { willReadFrequently: true })!;
  sg.filter = `blur(${size / 700}px)`;
  sg.drawImage(base, 0, 0, size, size);
  const soft = sg.getImageData(0, 0, size, size).data;
  const lum = (i: number) => (0.2126 * soft[i] + 0.7152 * soft[i + 1] + 0.0722 * soft[i + 2]) / 255;

  // light level of the product: median as the "body colour", 98th percentile as the highlights
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < px.length; i += 16) if (a[i] > 200) (hist[Math.round(lum(i) * 255)]++, n++);
  const pct = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= n * q) return Math.max(v, 1) / 255;
    return 1;
  };
  const mid = pct(0.5);
  const top = Math.max(pct(0.985), mid + 0.02);
  const [tr, tg, tb] = hexRgb(hex);
  const light = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;

  for (let i = 0; i < px.length; i += 4) {
    const k = a[i] / 255;
    if (k < 0.01) continue;
    const l = lum(i);
    // shade below the body tone, fade to white in the highlights
    const shade = Math.min(1, Math.pow(l / mid, 0.7));
    const hi = Math.max(0, Math.min(1, (l - mid) / (top - mid)));
    const spec = hi * hi * (light > 0.7 ? 0.35 : 0.75);
    const depth = 0.55 + 0.45 * shade;
    for (let ch = 0; ch < 3; ch++) {
      const t = [tr, tg, tb][ch];
      const v = (t * depth * (1 - spec) + spec) * 255;
      px[i + ch] = px[i + ch] * (1 - k) + v * k;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Product photo + design, drawn on a square canvas. Returns the design map (reused by the 3D view). */
export function drawComposite(canvas: HTMLCanvasElement, product: Product, base: CanvasImageSource, design: Design, material: Material) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);
  const ds = designSize(product, size);
  const map = renderDesign(design, ds.w, ds.h, material);
  for (const area of [product.area, ...(product.extraAreas ?? [])]) {
    compositeFlat(ctx, map, areaPx({ ...product, area }, size), material, wrapArc(product) || undefined);
  }
  return map;
}
