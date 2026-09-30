// Engraving engine: turns a customer's photo + text into a laser "burn map",
// then tints it for a material (wood, slate, steel...). Pure canvas, runs in the browser.

export type Shape = 'rect' | 'oval' | 'heart' | 'circle';
export type Style = 'foto' | 'puncte' | 'contur' | 'contrast';
export type TextPos = 'sus' | 'jos';
/** laser = monochrome engraving; color = UV colour print */
export type Technique = 'laser' | 'color';

export interface Design {
  photo: CanvasImageSource | null;
  photoW: number;
  photoH: number;
  /** offset of the photo centre, as a fraction of the area (-0.5..0.5) */
  offsetX: number;
  offsetY: number;
  /** 1 = cover the area */
  zoom: number;
  shape: Shape;
  style: Style;
  /** -1..1 */
  brightness: number;
  /** 0..2, 1 = neutral */
  contrast: number;
  text: string;
  text2: string;
  /** text size multiplier, 1 = as large as the band allows */
  textScale: number;
  font: FontId;
  textPos: TextPos;
  technique: Technique;
  /** text colour for colour print */
  ink: string;
}

export const FONTS = {
  script: { label: 'Caligrafic', css: '"Great Vibes"', scale: 1.25 },
  serif: { label: 'Clasic', css: '"Cormorant Garamond"', scale: 1 },
  sans: { label: 'Modern', css: '"Josefin Sans Variable"', scale: 0.86 },
  type: { label: 'Mașină de scris', css: '"Special Elite"', scale: 0.86 },
} as const;
export type FontId = keyof typeof FONTS;

export interface Material {
  id: string;
  label: string;
  /** true when the laser mark is lighter than the surface (slate, black coating) */
  invert: boolean;
  ink: [number, number, number];
  opacity: number;
  blend: GlobalCompositeOperation;
  /** sharp photo edge, like the frosted panel on glassware */
  hard?: boolean;
}

export const MATERIALS: Record<string, Material> = {
  lemn: { id: 'lemn', label: 'Lemn', invert: false, ink: [62, 34, 16], opacity: 0.88, blend: 'multiply' },
  piele: { id: 'piele', label: 'Piele', invert: false, ink: [52, 28, 14], opacity: 0.8, blend: 'multiply' },
  inox: { id: 'inox', label: 'Inox', invert: false, ink: [38, 38, 40], opacity: 0.78, blend: 'multiply' },
  ardezie: { id: 'ardezie', label: 'Ardezie', invert: true, ink: [214, 212, 206], opacity: 0.85, blend: 'screen' },
  ceramica: { id: 'ceramica', label: 'Ceramică neagră', invert: true, ink: [232, 230, 224], opacity: 0.92, blend: 'source-over' },
  vopsea: { id: 'vopsea', label: 'Oțel vopsit', invert: true, ink: [196, 198, 202], opacity: 0.95, blend: 'source-over' },
  sticla: { id: 'sticla', label: 'Sticlă', invert: true, ink: [236, 240, 243], opacity: 0.82, blend: 'screen', hard: true },
  cristal: { id: 'cristal', label: 'Cristal optic', invert: true, ink: [240, 245, 250], opacity: 0.95, blend: 'screen' },
  'piele-neagra': { id: 'piele-neagra', label: 'Piele neagră', invert: true, ink: [132, 120, 108], opacity: 0.8, blend: 'screen' },
};

/** UV colour print sits on top of any surface. */
export const PRINT: Material = { id: 'print', label: 'Imprimare color', invert: false, ink: [0, 0, 0], opacity: 0.97, blend: 'source-over' };

export const defaultDesign = (): Design => ({
  photo: null,
  photoW: 0,
  photoH: 0,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  shape: 'oval',
  style: 'foto',
  brightness: 0,
  contrast: 1.15,
  text: '',
  text2: '',
  textScale: 1,
  font: 'script',
  textPos: 'jos',
  technique: 'laser',
  ink: '#1d1d1f',
});

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  ctx.moveTo(cx, y + h * 0.28);
  ctx.bezierCurveTo(cx, y + h * 0.05, x + w * 0.02, y, x + w * 0.02, y + h * 0.32);
  ctx.bezierCurveTo(x + w * 0.02, y + h * 0.6, cx - w * 0.05, y + h * 0.78, cx, y + h);
  ctx.bezierCurveTo(cx + w * 0.05, y + h * 0.78, x + w * 0.98, y + h * 0.6, x + w * 0.98, y + h * 0.32);
  ctx.bezierCurveTo(x + w * 0.98, y, cx, y + h * 0.05, cx, y + h * 0.28);
}

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  if (shape === 'rect') ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.04);
  else if (shape === 'oval') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
  } else heartPath(ctx, x, y, w, h);
}

function photoGeometry(d: Design, box: { x: number; y: number; w: number; h: number }) {
  let { x, y, w: bw, h: bh } = box;
  if (d.shape === 'circle') {
    const s = Math.min(bw, bh);
    x += (bw - s) / 2;
    y += (bh - s) / 2;
    bw = bh = s;
  }
  const cover = Math.max(bw / d.photoW, bh / d.photoH) * d.zoom;
  const dw = d.photoW * cover;
  const dh = d.photoH * cover;
  return { x, y, bw, bh, dw, dh, dx: x + (bw - dw) / 2 + d.offsetX * bw, dy: y + (bh - dh) / 2 + d.offsetY * bh };
}

/** Shape mask with a soft inner fade, so the photo melts into the material. */
function featherMask(shape: Shape, x: number, y: number, bw: number, bh: number, w: number, h: number, hard = false) {
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const mc = m.getContext('2d', { willReadFrequently: true })!;
  const feather = hard ? 1 : Math.max(2, Math.min(bw, bh) * 0.035);
  mc.filter = `blur(${feather}px)`;
  mc.fillStyle = '#000';
  const inset = feather * 1.2;
  shapePath(mc, shape, x + inset, y + inset, bw - inset * 2, bh - inset * 2);
  mc.fill();
  return m;
}

/** Text lines share one size, as large as the box allows, centred as a block. */
function drawLines(tx: CanvasRenderingContext2D, d: Design, lines: string[], textBox: { y: number; h: number }, w: number, h: number, color: string) {
  const font = FONTS[d.font];
  tx.fillStyle = color;
  tx.textAlign = 'center';
  tx.textBaseline = 'middle';
  const gap = 1.3;
  let size = Math.min((textBox.h / (lines.length * gap)) * 0.95, Math.min(w, h) * 0.24) * font.scale * (d.textScale ?? 1);
  for (const line of lines) {
    tx.font = `${size}px ${font.css}`;
    const mw = tx.measureText(line).width;
    if (mw > w * 0.88) size *= (w * 0.88) / mw;
  }
  tx.font = `${size}px ${font.css}`;
  const lineH = (size / font.scale) * gap;
  const top = textBox.y + (textBox.h - lineH * lines.length) / 2;
  lines.forEach((line, i) => tx.fillText(line, w / 2, top + lineH * (i + 0.5)));
}

/** Colour print: the photo keeps its colours, the text uses the chosen ink. */
export function renderColorMap(d: Design, w: number, h: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const { lines, photoBox, textBox } = layout(d, w, h);
  if (d.photo && photoBox && d.photoW > 0) {
    const { x, y, bw, bh, dx, dy, dw, dh } = photoGeometry(d, photoBox);
    const t = document.createElement('canvas');
    t.width = w;
    t.height = h;
    const tc = t.getContext('2d')!;
    tc.filter = `brightness(${1 + d.brightness}) contrast(${0.85 + (d.contrast - 1) * 0.6}) saturate(1.08)`;
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(d.photo, dx, dy, dw, dh);
    tc.filter = 'none';
    tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(featherMask(d.shape, x, y, bw, bh, w, h), 0, 0);
    ctx.drawImage(t, 0, 0);
  }
  if (lines.length) drawLines(ctx, d, lines, textBox, w, h, d.ink);
  return out;
}

/** Laser burn map or colour print, depending on the technique. */
export const renderDesign = (d: Design, w: number, h: number, material: Material) =>
  d.technique === 'color' ? renderColorMap(d, w, h) : renderBurnMap(d, w, h, material);

/** Layout of the engraving area: where the photo goes and where the text lines sit. */
function layout(d: Design, w: number, h: number) {
  // free text: every Enter starts a new line
  const lines = [d.text, d.text2].join('\n').split('\n').map((t) => t.trim()).filter(Boolean);
  const textBand = lines.length ? h * Math.min(0.5, 0.1 + 0.1 * lines.length) * Math.min(1.3, Math.max(0.8, d.textScale ?? 1)) : 0;
  const pad = Math.min(w, h) * 0.03;
  const photoBox = d.photo
    ? {
        x: pad,
        y: (d.textPos === 'sus' ? textBand : 0) + pad,
        w: w - pad * 2,
        h: h - textBand - pad * 2,
      }
    : null;
  const textBox = {
    x: 0,
    y: d.photo ? (d.textPos === 'sus' ? 0 : h - textBand) : 0,
    w,
    h: d.photo ? textBand : h,
  };
  return { lines, photoBox, textBox };
}

/**
 * Burn map: a grayscale canvas where alpha = how much the laser marks each pixel (0..1).
 * Dimensions are the engraving area in pixels.
 */
export function renderBurnMap(d: Design, w: number, h: number, material: Material): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  const { lines, photoBox, textBox } = layout(d, w, h);
  const burn = new Float32Array(w * h);

  if (d.photo && photoBox && d.photoW > 0) {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const t = tmp.getContext('2d', { willReadFrequently: true })!;
    const { x, y, bw, bh, dx, dy, dw, dh } = photoGeometry(d, photoBox);
    t.save();
    shapePath(t, d.shape, x, y, bw, bh);
    t.clip();
    t.imageSmoothingEnabled = true;
    t.imageSmoothingQuality = 'high';
    t.drawImage(d.photo, dx, dy, dw, dh);
    t.restore();

    // shape mask with a soft inner fade, so the photo melts into the material like a real engraving
    const mask = featherMask(d.shape, x, y, bw, bh, w, h, material.hard).getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;

    const px = t.getImageData(0, 0, w, h).data;
    // unsharp mask: the laser loses a little detail, so we give it back before engraving
    const bl = document.createElement('canvas');
    bl.width = w;
    bl.height = h;
    const bc = bl.getContext('2d', { willReadFrequently: true })!;
    bc.filter = `blur(${Math.max(1, Math.min(w, h) / 500)}px)`;
    bc.drawImage(tmp, 0, 0);
    const soft = bc.getImageData(0, 0, w, h).data;
    const sharpen = d.style === 'foto' ? 0.7 : 0.3;
    const lum = new Float32Array(w * h);
    // auto levels: phone photos are often flat; stretch the 2nd-98th percentile of the visible part
    const hist = new Uint32Array(256);
    let counted = 0;
    for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
      const v0 = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
      lum[i] = v0;
      if (px[p + 3] > 128 && mask[p + 3] > 128) (hist[Math.round(v0 * 255)]++, counted++);
    }
    const pct = (q: number) => {
      let acc = 0;
      for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= counted * q) return v / 255;
      return 1;
    };
    const lo = counted ? pct(0.02) : 0;
    const hi = counted ? Math.max(lo + 0.2, pct(0.98)) : 1;
    for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
      const vb = (0.2126 * soft[p] + 0.7152 * soft[p + 1] + 0.0722 * soft[p + 2]) / 255;
      let v = lum[i] + (lum[i] - vb) * sharpen;
      v = (v - lo) / (hi - lo);
      v = (v - 0.5) * d.contrast + 0.5 + d.brightness * 0.5;
      lum[i] = Math.min(1, Math.max(0, v));
    }

    let tone: Float32Array;
    if (d.style === 'contur') tone = lineArt(lum, w, h);
    else {
      tone = new Float32Array(w * h);
      for (let i = 0; i < lum.length; i++) tone[i] = material.invert ? lum[i] : 1 - lum[i];
      if (d.style === 'contrast') for (let i = 0; i < tone.length; i++) tone[i] = tone[i] > 0.5 ? 1 : 0;
      else if (d.style === 'puncte') dither(tone, w, h, Math.max(1, Math.round(Math.min(w, h) / 320)));
      // 'foto' keeps every tone: the closest the engraving gets to the original photo
    }
    // photo alpha too: a cut-out subject leaves its background untouched
    for (let i = 0; i < burn.length; i++) burn[i] = tone[i] * (mask[i * 4 + 3] / 255) * (px[i * 4 + 3] / 255);
  }

  if (lines.length) {
    const tc = document.createElement('canvas');
    tc.width = w;
    tc.height = h;
    const tx = tc.getContext('2d', { willReadFrequently: true })!;
    drawLines(tx, d, lines, textBox, w, h, '#000');
    const td = tx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < burn.length; i++) burn[i] = Math.max(burn[i], td[i * 4 + 3] / 255);
  }

  const img = ctx.createImageData(w, h);
  const [r, g, b] = material.ink;
  for (let i = 0, p = 0; i < burn.length; i++, p += 4) {
    img.data[p] = r;
    img.data[p + 1] = g;
    img.data[p + 2] = b;
    img.data[p + 3] = Math.round(burn[i] * material.opacity * 255);
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Floyd–Steinberg on a coarse grid: gives the dotted look of a real photo engraving. */
function dither(tone: Float32Array, w: number, h: number, cell: number) {
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const g = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let s = 0;
      let n = 0;
      for (let yy = y * cell; yy < Math.min(h, (y + 1) * cell); yy++)
        for (let xx = x * cell; xx < Math.min(w, (x + 1) * cell); xx++) {
          s += tone[yy * w + xx];
          n++;
        }
      g[y * gw + x] = s / n;
    }
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const old = g[i];
      const nv = old > 0.5 ? 1 : 0;
      const err = old - nv;
      g[i] = nv;
      if (x + 1 < gw) g[i + 1] += (err * 7) / 16;
      if (y + 1 < gh) {
        if (x > 0) g[i + gw - 1] += (err * 3) / 16;
        g[i + gw] += (err * 5) / 16;
        if (x + 1 < gw) g[i + gw + 1] += (err * 1) / 16;
      }
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) tone[y * w + x] = g[Math.floor(y / cell) * gw + Math.floor(x / cell)];
}

/** Sobel edges + a light shading pass: the "drawn portrait" look. */
function lineArt(lum: Float32Array, w: number, h: number) {
  const out = new Float32Array(w * h);
  const at = (x: number, y: number) => lum[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const e = Math.sqrt(gx * gx + gy * gy);
      out[y * w + x] = e > 0.32 ? 1 : e > 0.2 ? 0.55 : 0;
    }
  return out;
}

/** Draws the burn map onto a flat product photo (engraving area given in image pixels). */
export function compositeFlat(
  ctx: CanvasRenderingContext2D,
  burn: HTMLCanvasElement,
  area: { x: number; y: number; w: number; h: number; radius?: number },
  material: Material,
  /** wrap angle in radians when the surface is a cylinder */
  arc?: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = material.blend;
  if (arc) {
    // wrap on a cylinder: every visible column samples the flat design at asin(x), then fade the sides
    const half = Math.sin(arc / 2);
    const W = Math.round(area.w);
    const warped = document.createElement('canvas');
    warped.width = W;
    warped.height = burn.height;
    const wc = warped.getContext('2d')!;
    for (let x = 0; x < W; x++) {
      const nx = ((x + 0.5) / W) * 2 - 1;
      const u = (Math.asin(nx * half) / arc + 0.5) * burn.width;
      wc.drawImage(burn, Math.min(burn.width - 1, Math.max(0, Math.floor(u))), 0, 1, burn.height, x, 0, 1, burn.height);
    }
    const g = wc.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.15)');
    g.addColorStop(0.12, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.5, 'rgba(0,0,0,1)');
    g.addColorStop(0.88, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0.15)');
    wc.globalCompositeOperation = 'destination-in';
    wc.fillStyle = g;
    wc.fillRect(0, 0, W, burn.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(warped, area.x, area.y, area.w, area.h);
  } else {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(burn, area.x, area.y, area.w, area.h);
  }
  ctx.restore();
}

export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    Object.values(FONTS).map((f) => document.fonts.load(`40px ${f.css}`, 'ĂÂÎȘȚ ăâîșț').catch(() => undefined)),
  );
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
