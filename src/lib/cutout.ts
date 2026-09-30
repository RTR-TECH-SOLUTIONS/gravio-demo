// Background removal in the browser (MediaPipe DeepLab v3, ~2.7 MB, loaded only when used).
// It knows people, dogs, cats and 18 other classes, which covers what customers put in a crystal.
import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const VERSION = '1.0.1';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite';

let segmenter: Promise<ImageSegmenter> | null = null;

// PASCAL VOC classes we keep: bird, cat, cow, dog, horse, person, sheep (never furniture or objects)
const SUBJECTS = [3, 8, 10, 12, 13, 15, 17];

function load() {
  segmenter ??= import('@mediapipe/tasks-vision').then(async ({ FilesetResolver, ImageSegmenter }) => {
    const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`);
    return ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  });
  segmenter.catch(() => (segmenter = null));
  return segmenter;
}

const sizeOf = (img: CanvasImageSource) => ({
  w: (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width,
  h: (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height,
});

/** Returns the subject on a transparent background, cropped to it with a small margin. */
export async function removeBackground(photo: CanvasImageSource): Promise<HTMLCanvasElement> {
  const seg = await load();
  const { w, h } = sizeOf(photo);

  // the model works at low resolution; feed it a small copy
  const k = Math.min(1, 640 / Math.max(w, h));
  const small = document.createElement('canvas');
  small.width = Math.round(w * k);
  small.height = Math.round(h * k);
  small.getContext('2d')!.drawImage(photo, 0, 0, small.width, small.height);

  const result = seg.segment(small);
  const masks = result.confidenceMasks!;
  const mw = masks[0].width;
  const mh = masks[0].height;
  // confidence that a pixel is a person or an animal
  const fgConf = new Float32Array(mw * mh);
  for (const k of SUBJECTS) {
    const m = masks[k]?.getAsFloat32Array();
    if (m) for (let i = 0; i < m.length; i++) fgConf[i] += m[i];
  }

  // soft alpha from "not background", with a smooth ramp so hair and fur keep some edge
  const m = document.createElement('canvas');
  m.width = mw;
  m.height = mh;
  const mg = m.getContext('2d')!;
  const img = mg.createImageData(mw, mh);
  let x0 = mw, y0 = mh, x1 = 0, y1 = 0;
  for (let i = 0; i < fgConf.length; i++) {
    const t = Math.min(1, Math.max(0, (fgConf[i] - 0.42) / 0.36));
    const a = t * t * (3 - 2 * t);
    img.data[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.5) {
      const x = i % mw, y = (i / mw) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  result.close();
  mg.putImageData(img, 0, 0);
  // too small to be the subject of the photo: better to keep the whole picture
  if (x1 <= x0 || y1 <= y0 || (x1 - x0) * (y1 - y0) < mw * mh * 0.04) throw new Error('Nu am găsit o persoană sau un animal în poză.');

  const full = document.createElement('canvas');
  full.width = w;
  full.height = h;
  const fg = full.getContext('2d')!;
  fg.drawImage(photo, 0, 0, w, h);
  fg.globalCompositeOperation = 'destination-in';
  fg.imageSmoothingQuality = 'high';
  fg.filter = `blur(${Math.max(1, w / 900)}px)`;
  fg.drawImage(m, 0, 0, w, h);

  // crop to the subject so it fills the engraving area
  const sx = w / mw, sy = h / mh;
  const pad = 0.04 * Math.max(w, h);
  const cx0 = Math.max(0, x0 * sx - pad), cy0 = Math.max(0, y0 * sy - pad);
  const cx1 = Math.min(w, (x1 + 1) * sx + pad), cy1 = Math.min(h, (y1 + 1) * sy + pad);
  const out = document.createElement('canvas');
  out.width = Math.round(cx1 - cx0);
  out.height = Math.round(cy1 - cy0);
  out.getContext('2d')!.drawImage(full, cx0, cy0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
