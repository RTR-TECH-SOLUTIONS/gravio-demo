import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource/great-vibes';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/special-elite';
import '@fontsource-variable/josefin-sans';
import { catalogImage, type Product } from '../data/catalog';
import { FONTS, MATERIALS, defaultDesign, ensureFonts, loadImage, renderBurnMap, type Design, type FontId, type Shape, type Style } from '../lib/engrave';
import { SAMPLE_PHOTOS, areaPx, designFromSample, drawComposite, materialFor, recolorBase } from '../lib/render';
import { addToCart, fmt } from '../lib/cart';
import { removeBackground } from '../lib/cutout';

const Cylinder3D = lazy(() => import('./Cylinder3D'));
const Crystal3D = lazy(() => import('./Crystal3D'));

/** If WebGL or the 3D chunk fails, fall back to the photo preview instead of breaking the editor. */
class Fallback extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// preview resolution; high so the customer's photo stays sharp on retina screens
const SIZE = 1800;
const MAX_TEXT = 160;
const MAX_LINES = 5;
const GIFT_WRAP = 9;
const PRINT_EXTRA = 10;
// wide lifestyle banners in a square frame: keep the product (right side of the shot) in view
const FOCUS: Record<string, string> = {
  'hero-cristal': '100% 50%',
  'nunta-flute': '90% 50%',
  halba: '80% 50%',
  'atelier-cristal': '90% 50%',
  'corporate-cristal': '95% 50%',
};
const focusOf = (src: string) => FOCUS[src.split('/').pop()!.replace(/\.\w+$/, '')] ?? '50% 50%';
const INKS = [
  { hex: '#1d1d1f', label: 'Negru' },
  { hex: '#ffffff', label: 'Alb' },
  { hex: '#b3262d', label: 'Roșu' },
  { hex: '#b08a3e', label: 'Auriu' },
  { hex: '#24406e', label: 'Albastru' },
];

const STYLES: { id: Style; label: string; hint: string }[] = [
  { id: 'foto', label: 'Foto', hint: 'toate nuanțele pozei, cât mai aproape de original' },
  { id: 'puncte', label: 'Puncte', hint: 'puncte fine, ca o gravură clasică' },
  { id: 'contur', label: 'Desen', hint: 'doar contururile, ca un desen în peniță' },
  { id: 'contrast', label: 'Siluetă', hint: 'alb-negru puternic, fără nuanțe' },
];
type Tab = 'produs' | 'foto' | 'text';

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'oval', label: 'Oval' },
  { id: 'rect', label: 'Dreptunghi' },
  { id: 'circle', label: 'Cerc' },
  { id: 'heart', label: 'Inimă' },
];

/** Downscales big phone photos so the engraving stays fast. */
async function fileToPhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const max = 3200;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-md px-2 text-sm font-semibold transition-colors duration-150 ${
            value === o.id ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Step({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-sand py-6 first:border-t-0 first:pt-1">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="flex items-baseline gap-3 font-serif text-[1.55rem] font-semibold leading-none text-espresso">
          <span className="font-serif text-[1.05rem] font-medium italic text-wood">{String(n).padStart(2, '0')}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Selectable card used for style, shape and font choices. */
function Tile({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-[10px] border bg-white p-1.5 pb-1.5 text-center transition duration-200 ease-out ${
        active
          ? 'border-wood shadow-[0_0_0_1px_var(--color-wood),0_6px_16px_-8px_rgba(107,70,35,.45)]'
          : 'border-sand hover:-translate-y-px hover:border-[#d6c9b5] hover:shadow-[0_6px_14px_-10px_rgba(60,40,20,.35)]'
      }`}
    >
      {active && (
        <span className="absolute -right-1.5 -top-1.5 z-10 grid size-5 place-items-center rounded-full bg-wood text-white ring-2 ring-cream" aria-hidden>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m5 12 5 5 9-10" /></svg>
        </span>
      )}
      {children}
    </button>
  );
}

function Label({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 text-[12.5px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-wood">{children}</span>
      {aside && <span className="text-right italic text-[#9a8f84]">{aside}</span>}
    </div>
  );
}

const SHAPE_ICON: Record<Shape, ReactNode> = {
  oval: <ellipse cx="12" cy="12" rx="7" ry="9" />,
  rect: <rect x="4" y="5" width="16" height="14" rx="1.5" />,
  circle: <circle cx="12" cy="12" r="8" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />,
};

function Slider({ label, value, min, max, onChange, format }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <label className="grid grid-cols-[92px_1fr_44px] items-center gap-3 text-[13px]">
      <span className="font-semibold text-espresso/80">{label}</span>
      <input className="range" style={{ '--p': `${p}%` } as React.CSSProperties} type="range" min={min} max={max} step={0.02} value={value} onChange={(e) => onChange(+e.target.value)} />
      <span className="text-right font-serif text-[15px] italic lining-nums tabular-nums text-wood">{format(value)}</span>
    </label>
  );
}

/** Small engraved thumbnails of the current photo, one per style, on the product's material. */
function useStylePreviews(design: Design, product: Product) {
  const [thumbs, setThumbs] = useState<Partial<Record<Style, string>>>({});
  const { photo, shape, brightness, contrast, zoom, offsetX, offsetY } = design;
  useEffect(() => {
    if (!photo || design.technique === 'color') return setThumbs({});
    const t = setTimeout(() => {
      const material = MATERIALS[product.material];
      const size = 132;
      const out: Partial<Record<Style, string>> = {};
      for (const s of STYLES) {
        const burn = renderBurnMap({ ...design, style: s.id, text: '', text2: '' }, size, size, material);
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d')!;
        g.fillStyle = material.invert ? '#2b2c2f' : '#e8dfd1';
        g.fillRect(0, 0, size, size);
        g.drawImage(burn, 0, 0);
        out[s.id] = c.toDataURL('image/jpeg', 0.85);
      }
      setThumbs(out);
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, shape, brightness, contrast, zoom, offsetX, offsetY, product, design.technique]);
  return thumbs;
}

function usePhotoThumb(photo: Design['photo']) {
  return useMemo(() => {
    if (!photo) return '';
    const c = document.createElement('canvas');
    c.width = c.height = 112;
    const g = c.getContext('2d')!;
    const w = (photo as HTMLImageElement).naturalWidth || (photo as HTMLCanvasElement).width;
    const h = (photo as HTMLImageElement).naturalHeight || (photo as HTMLCanvasElement).height;
    const k = Math.max(112 / w, 112 / h);
    g.imageSmoothingQuality = 'high';
    g.drawImage(photo, (112 - w * k) / 2, (112 - h * k) / 2, w * k, h * k);
    return c.toDataURL('image/jpeg', 0.85);
  }, [photo]);
}

export default function Personalizer({ product, gallery = [] }: { product: Product; gallery?: string[] }) {
  const [shot, setShot] = useState<string | null>(null);
  const [design, setDesign] = useState<Design>(defaultDesign);
  const [ready, setReady] = useState(false);
  const has3d = !!(product.cylinder || product.crystal);
  const [view, setView] = useState<'3d' | 'foto'>(has3d ? '3d' : 'foto');
  const [burn, setBurn] = useState<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);
  const [qty, setQty] = useState(1);
  const [gift, setGift] = useState(false);
  const [photoName, setPhotoName] = useState<string>('');
  const [added, setAdded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [touched, setTouched] = useState(false);
  const [tab, setTab] = useState<Tab>('foto');
  const [ledPicked, setLedPicked] = useState(false);
  const led = product.crystal?.led === 'inclus' || (typeof product.crystal?.led === 'number' && ledPicked);
  const ledPrice = typeof product.crystal?.led === 'number' ? product.crystal.led : 0;
  const hasOptions = !!(product.colors || product.print || ledPrice);
  const [colorId, setColorId] = useState(product.colors?.[0].id ?? '');
  const [baseVer, setBaseVer] = useState(0);
  const color = product.colors?.find((c) => c.id === colorId);

  const canvas = useRef<HTMLCanvasElement>(null);
  const base = useRef<CanvasImageSource | null>(null);
  const original = useRef<HTMLImageElement | null>(null);
  const recolored = useRef(new Map<string, HTMLCanvasElement>());
  const fileInput = useRef<HTMLInputElement>(null);
  const frame = useRef(0);

  // start from the product's sample so the page never opens on an empty object
  useEffect(() => {
    let alive = true;
    Promise.all([loadImage(product.image), designFromSample(product.sample), ensureFonts()]).then(([img, d]) => {
      if (!alive) return;
      base.current = original.current = img;
      setDesign(d);
      setPhotoName(product.sample.photo ? 'fotografie exemplu' : '');
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [product]);

  useEffect(() => {
    if (!ready || !canvas.current || !base.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!canvas.current || !base.current) return;
      const b = drawComposite(canvas.current, product, base.current, design, materialFor(product, design, colorId));
      setBurn(b);
      setVersion((v) => v + 1);
    });
    return () => cancelAnimationFrame(frame.current);
  }, [design, ready, product, editing, colorId, baseVer]);

  // product colour: repaint the product photo once per colour, from its silhouette mask
  useEffect(() => {
    if (!ready || !original.current || !product.colors) return;
    const first = product.colors[0].id === colorId;
    if (first) {
      base.current = original.current;
      setBaseVer((v) => v + 1);
      return;
    }
    const cached = recolored.current.get(colorId);
    if (cached) {
      base.current = cached;
      setBaseVer((v) => v + 1);
      return;
    }
    let alive = true;
    loadImage(`/img/masks/${product.slug}.png`).then((mask) => {
      if (!alive || !original.current || !color) return;
      const c = recolorBase(original.current, mask, color.hex);
      recolored.current.set(colorId, c);
      base.current = c;
      setBaseVer((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [colorId, ready, product, color]);

  // white ceramic forces colour print; going back to a colour that takes the laser undoes it
  const forcedPrint = useRef(false);
  const pickColor = (id: string) => {
    setColorId(id);
    const c = product.colors?.find((x) => x.id === id);
    if (c?.laser === false) {
      if (design.technique === 'laser') forcedPrint.current = true;
      patch({ technique: 'color', ink: '#1d1d1f' });
    } else if (forcedPrint.current) {
      forcedPrint.current = false;
      patch({ technique: 'laser' });
    }
  };
  const pickTechnique = (technique: Design['technique']) => {
    if (technique === 'laser' && color?.laser === false) return;
    forcedPrint.current = false;
    patch({ technique, ink: technique === 'color' ? '#1d1d1f' : design.ink });
  };
  // the studio lighting in 3D lifts mid tones, so saturated colours are darkened to match the swatch
  const dark = product.material === 'sticla' || product.material === 'cristal';
  const cylinder = useMemo(() => {
    if (!product.cylinder || !color || color.id === product.colors?.[0].id) return product.cylinder;
    const rgb = [1, 3, 5].map((i) => parseInt(color.hex.slice(i, i + 2), 16));
    const light = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    const k = light > 0.6 ? 1 : 0.62;
    const bodyColor = `rgb(${rgb.map((v) => Math.round(v * k)).join(',')})`;
    return { ...product.cylinder, bodyColor };
  }, [product, color]);

  const openEditor = (t: Tab) => {
    setTab(t);
    setShot(null);
    setEditing(true);
  };
  const closeEditor = useCallback(() => {
    setEditing(false);
    setTouched(true);
  }, []);
  // full-screen editor: lock page scroll, close on Escape
  useEffect(() => {
    if (!editing) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeEditor();
    addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      removeEventListener('keydown', onKey);
    };
  }, [editing, closeEditor]);

  const styleThumbs = useStylePreviews(design, product);
  const photoThumb = usePhotoThumb(design.photo);

  const patch = useCallback((p: Partial<Design>) => setDesign((d) => ({ ...d, ...p })), []);

  // background removal: the crystal shops cut the subject out, so the picture floats in the glass
  const autoCut = product.material === 'cristal';
  const [cut, setCut] = useState<'off' | 'loading' | 'on' | 'error'>(product.sample.photo?.endsWith('-decupat') ? 'on' : 'off');
  const uncut = useRef<{ photo: CanvasImageSource; w: number; h: number; shape: Design['shape'] } | null>(null);
  const cutCache = useRef(new WeakMap<object, HTMLCanvasElement>());
  const applyCut = async (photo: CanvasImageSource, w: number, h: number, shape: Design['shape']) => {
    uncut.current = { photo, w, h, shape };
    setCut('loading');
    try {
      const c = cutCache.current.get(photo) ?? (await removeBackground(photo));
      cutCache.current.set(photo, c);
      patch({ photo: c, photoW: c.width, photoH: c.height, offsetX: 0, offsetY: 0, zoom: 1, shape: 'rect' });
      setCut('on');
    } catch {
      // no person or animal found: leave the photo exactly as uploaded
      uncut.current = null;
      setCut('off');
    }
  };
  const undoCut = async () => {
    let u = uncut.current;
    // the product sample starts already cut out: fetch the original photo on demand
    if (!u && product.sample.photo?.endsWith('-decupat')) {
      const img = await loadImage(SAMPLE_PHOTOS[product.sample.photo.replace('-decupat', '') as keyof typeof SAMPLE_PHOTOS]);
      u = { photo: img, w: img.naturalWidth, h: img.naturalHeight, shape: 'rect' };
    }
    if (!u) return;
    patch({ photo: u.photo, photoW: u.w, photoH: u.h, offsetX: 0, offsetY: 0, zoom: 1, shape: u.shape });
    setCut('off');
  };
  const setPhoto = (photo: CanvasImageSource, w: number, h: number) => {
    uncut.current = null;
    patch({ photo, photoW: w, photoH: h, offsetX: 0, offsetY: 0, zoom: 1 });
    setCut('off');
    if (autoCut) applyCut(photo, w, h, design.shape === 'rect' ? 'oval' : design.shape);
  };

  const onFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const photo = await fileToPhoto(file);
    setPhoto(photo, photo.width, photo.height);
    setPhotoName(file.name);
  };

  const pickSample = async (key: 'caine' | 'portret') => {
    const img = await loadImage(SAMPLE_PHOTOS[key]);
    setPhoto(img, img.naturalWidth, img.naturalHeight);
    setPhotoName('fotografie exemplu');
  };

  // drag the photo on the flat preview
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!design.photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: design.offsetX, oy: design.offsetY };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const a = areaPx(product, r.width);
    const clamp = (v: number) => Math.max(-0.6, Math.min(0.6, v));
    patch({
      offsetX: clamp(drag.current.ox + (e.clientX - drag.current.x) / a.w),
      offsetY: clamp(drag.current.oy + (e.clientY - drag.current.y) / a.h),
    });
  };
  const onPointerUp = () => (drag.current = null);

  const price = product.price + (gift ? GIFT_WRAP : 0) + (design.technique === 'color' ? PRINT_EXTRA : 0) + (ledPicked && ledPrice ? ledPrice : 0);
  const empty = !design.photo && !design.text.trim() && !design.text2.trim();

  const summary = useMemo(() => {
    const s: string[] = [];
    if (color) s.push(`Culoare ${color.label.toLowerCase()}`);
    if (product.print) s.push(design.technique === 'color' ? 'Imprimare color' : 'Gravură laser');
    if (led) s.push('Bază LED');
    if (design.photo) s.push(`Poză, stil ${STYLES.find((x) => x.id === design.style)!.label.toLowerCase()}, formă ${SHAPES.find((x) => x.id === design.shape)!.label.toLowerCase()}`);
    const t = [design.text, design.text2].join('\n').split('\n').map((x) => x.trim()).filter(Boolean).join(' / ');
    if (t) s.push(`Text „${t}”, font ${FONTS[design.font].label.toLowerCase()}`);
    if (gift) s.push('Ambalaj cadou');
    return s;
  }, [design, gift, color, led, product.print]);

  const onAdd = () => {
    if (empty || !canvas.current) return;
    const t = document.createElement('canvas');
    t.width = t.height = 320;
    t.getContext('2d')!.drawImage(canvas.current, 0, 0, 320, 320);
    // TODO(real): upload the original photo + burn map (SVG/PNG at 1:1 mm) with the order
    addToCart({ slug: product.slug, name: product.name, price, qty, thumb: t.toDataURL('image/jpeg', 0.8), summary });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const options = (
    <div className="space-y-5">
      {product.colors && (
        <div>
          <Label aside={color?.label}>Culoarea produsului</Label>
          <div role="radiogroup" aria-label="Culoarea produsului" className="flex flex-wrap gap-2.5">
            {product.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={colorId === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => pickColor(c.id)}
                className={`grid size-11 place-items-center rounded-full border-2 transition duration-150 ${colorId === c.id ? 'border-wood' : 'border-transparent hover:border-sand'}`}
              >
                <span className="size-8 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12),inset_0_-6px_10px_rgba(0,0,0,.18)]" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </div>
      )}
      {ledPrice > 0 && (
        <div>
          <Label>Bază luminoasă</Label>
          <div role="radiogroup" aria-label="Bază luminoasă" className="grid grid-cols-2 gap-2">
            {([
              [false, 'Fără bază', 'cristalul simplu, în cutie', 'inclus'],
              [true, 'Bază LED', 'poza se aprinde în întuneric', `+${ledPrice} lei`],
            ] as const).map(([on, label, sub, extra]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={ledPicked === on}
                onClick={() => setLedPicked(on)}
                className={`rounded-[10px] border bg-white px-3.5 py-3 text-left transition duration-200 ease-out ${
                  ledPicked === on ? 'border-wood shadow-[0_0_0_1px_var(--color-wood),0_6px_16px_-8px_rgba(107,70,35,.45)]' : 'border-sand hover:border-[#d6c9b5]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-[13.5px] font-bold ${ledPicked === on ? 'text-wood-dark' : 'text-espresso'}`}>{label}</span>
                  <span className="text-[11.5px] font-semibold text-[#9a8f84]">{extra}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] text-[#8a7f74]">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {product.print && (
      <div>
        <Label>Tehnica</Label>
        <div role="radiogroup" aria-label="Tehnica" className="grid grid-cols-2 gap-2">
          {([
            ['laser', 'Gravură laser', color?.laser === false ? 'nu lasă urmă pe alb' : 'alb-negru, nu se șterge', 'inclus'],
            ['color', 'Imprimare color', 'poza în culorile ei', `+${PRINT_EXTRA} lei`],
          ] as const).map(([id, label, sub, extra]) => {
            const off = id === 'laser' && color?.laser === false;
            const on = design.technique === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={off}
                onClick={() => pickTechnique(id)}
                className={`relative rounded-[10px] border bg-white px-3.5 py-3 text-left transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${
                  on ? 'border-wood shadow-[0_0_0_1px_var(--color-wood),0_6px_16px_-8px_rgba(107,70,35,.45)]' : 'border-sand hover:border-[#d6c9b5]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {id === 'laser' ? (
                      <span className="size-4 rounded-full bg-[conic-gradient(#2b2420_0_50%,#d9d2c7_0)] ring-1 ring-sand" aria-hidden />
                    ) : (
                      <span className="size-4 rounded-full bg-[conic-gradient(#d9534f,#e8b23a,#5aa469,#3f7cc4,#8e5bb5,#d9534f)]" aria-hidden />
                    )}
                    <span className={`text-[13.5px] font-bold ${on ? 'text-wood-dark' : 'text-espresso'}`}>{label}</span>
                  </span>
                  <span className="text-[11.5px] font-semibold text-[#9a8f84]">{extra}</span>
                </span>
                <span className="mt-0.5 block pl-6 text-[12.5px] text-[#8a7f74]">{sub}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );

  const stage = (
    <>

            <canvas
              ref={canvas}
              width={SIZE}
              height={SIZE}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label={`Previzualizare: ${product.name} cu gravura ta`}
              role="img"
              className={`absolute inset-0 size-full touch-none ${design.photo ? 'cursor-move' : ''} ${view === '3d' ? 'invisible' : ''}`}
            />
            {view === '3d' && has3d && (
              <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(ellipse_at_50%_38%,#4b4b50,#1b1b1e_75%)]' : 'bg-[radial-gradient(ellipse_at_50%_40%,#ebe9e6,#d6d3cf)]'}`}>
                <Fallback onError={() => setView('foto')}>
                  <Suspense fallback={null}>
                    {product.crystal ? (
                      <Crystal3D crystal={product.crystal} burn={burn} version={version} led={led} />
                    ) : (
                      <Cylinder3D cylinder={cylinder!} material={color?.material ?? product.material} burn={burn} version={version} print={design.technique === 'color'} />
                    )}
                  </Suspense>
                </Fallback>
              </div>
            )}
            {!ready && <div className="absolute inset-0 animate-pulse bg-photo" aria-hidden />}
            {shot && (
              <button type="button" onClick={() => setShot(null)} className="absolute inset-0 z-10 bg-photo" aria-label="Înapoi la previzualizarea ta">
                <img src={shot} alt="" className="size-full object-cover" style={{ objectPosition: focusOf(shot) }} />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-accent px-3 py-1.5 text-xs font-extrabold uppercase text-white">Înapoi la gravura ta</span>
              </button>
            )}
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-ink">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden /> Previzualizare live
            </span>
            {has3d && (
              <div className="absolute right-3 top-3 w-32">
                <Seg
                  label="Mod de previzualizare"
                  value={view}
                  onChange={setView}
                  options={[
                    { id: '3d', label: '3D' },
                    { id: 'foto', label: 'Poză' },
                  ]}
                />
              </div>
            )}
    </>
  );
  const caption = (
    <p className="mt-2 text-center text-xs text-muted">
      {view === '3d'
              ? 'Trage cu degetul sau mouse-ul ca să rotești produsul.'
              : design.photo
                ? 'Trage de fotografie ca s-o așezi unde vrei.'
                : 'Gravura apare pe produs pe măsură ce scrii.'}
    </p>
  );
  const chips = [
    [color?.label, product.print ? (design.technique === 'color' ? 'imprimare color' : 'gravură laser') : '', led ? 'bază LED' : ''].filter(Boolean).join(', '),
    design.photo ? `Poză ${design.technique === 'color' ? 'color' : STYLES.find((x) => x.id === design.style)!.label.toLowerCase()}, ${SHAPES.find((x) => x.id === design.shape)!.label.toLowerCase()}` : '',
    [design.text, design.text2].join('\n').split('\n').map((x) => x.trim()).filter(Boolean).join(' · '),
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
      {/* preview */}
      <div className="max-lg:contents lg:col-span-7">
        <div className="sticky top-0 z-20 -mx-4 self-start bg-white px-4 pb-2 pt-2 shadow-[0_8px_12px_-12px_rgba(0,0,0,.25)] md:-mx-6 md:px-6 lg:top-4 lg:mx-0 lg:flex lg:gap-3 lg:px-0 lg:pt-0 lg:shadow-none">
          {gallery.length > 0 && (
            <ul className="hidden w-[84px] shrink-0 flex-col gap-2 lg:flex" aria-label="Imagini produs">
              {[null, ...gallery].map((g, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setShot(g)}
                    aria-pressed={shot === g}
                    aria-label={g ? `Imaginea ${i + 1}` : 'Previzualizarea ta'}
                    className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-photo ${shot === g ? 'border-accent' : 'border-transparent hover:border-line'}`}
                  >
                    {g ? <img src={g} alt="" className="size-full object-cover" style={{ objectPosition: focusOf(g) }} /> : <img src={`/img/products/${product.slug}.jpg`} alt="" className="size-full object-cover" />}
                    {!g && <span className="absolute inset-x-0 bottom-0 bg-accent py-0.5 text-center text-[10px] font-extrabold uppercase text-white">Live</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="min-w-0 flex-1">
            <div className="relative mx-auto aspect-square max-h-[42vh] overflow-hidden rounded-lg bg-photo lg:max-h-none">
              {editing ? <img src={catalogImage(product)} alt="" className="size-full object-cover" /> : stage}
            </div>
            {!editing && caption}
          </div>
        </div>
      </div>

      {/* buy box, kept short like the big RO shops: the editor opens full screen */}
      <div className="lg:col-span-5">
        <h1 className="text-[clamp(1.35rem,1.1rem+1vw,1.7rem)] font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm italic text-muted">gravat cu laser, nu se șterge niciodată</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {product.oldPrice && <s className="text-ink-2">{fmt(product.oldPrice)}</s>}
          <span className={`text-[1.6rem] font-bold ${product.oldPrice ? 'text-wood-dark' : 'text-espresso'}`}>{fmt(product.price)}</span>
          <span className="text-[15px] text-ink" aria-label={`Nota ${product.rating} din 5`}>★★★★★</span>
          <a href="#recenzii" className="text-sm font-semibold text-ink hover:text-accent">Citește recenziile ({product.reviews})</a>
        </div>
        <p className="mt-1 text-xs text-muted">Cod produs: {product.slug.slice(0, 3).toUpperCase()}-{product.price}</p>
        <p className="mt-3 border-t border-line pt-3 text-[0.95rem] text-ink-2">{product.short}</p>


        {hasOptions && <div className="mt-5">{options}</div>}

        <div className="mt-5 rounded-xl border border-sand bg-cream p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-[1.3rem] font-semibold leading-none text-espresso">Gravura ta</h2>
            {touched && (
              <button type="button" onClick={() => openEditor(hasOptions ? 'produs' : 'foto')} className="text-[13px] font-semibold text-wood underline decoration-sand underline-offset-4 hover:decoration-wood">
                Modifică
              </button>
            )}
          </div>
          {touched ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li key={c} className="max-w-full truncate rounded-full border border-sand bg-white px-3 py-1 text-[13px] font-semibold text-espresso">{c}</li>
              ))}
            </ul>
          ) : (
            <ol className="mt-3 grid gap-2 text-[13.5px] text-[#6f655b] sm:grid-cols-3">
              {['Încarci fotografia', 'Scrii un nume sau o dată', 'Vezi gravura pe produs'].map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-sand bg-white font-serif text-[0.95rem] font-semibold text-wood">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-3">
            <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border bg-white px-3.5 py-3 text-sm transition-colors ${gift ? 'border-wood' : 'border-sand hover:border-[#d6c9b5]'}`}>
              <span className="flex items-center gap-3">
                <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-[#8b5e34]" />
                <span>
                  <span className="block font-semibold text-espresso">Ambalaj cadou</span>
                  <span className="block text-[12.5px] text-[#8a7f74]">cutie din carton kraft, hârtie de mătase și fundă</span>
                </span>
              </span>
              <span className="whitespace-nowrap font-serif text-[1.1rem] font-semibold text-espresso">+{GIFT_WRAP} lei</span>
            </label>
        </div>

        {touched ? (
          <div className="mt-3 flex gap-2">
            <div className="flex items-center rounded-[10px] border border-line bg-white text-ink">
              <button type="button" aria-label="Scade cantitatea" className="grid size-12 place-items-center text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Crește cantitatea" className="grid size-12 place-items-center text-lg" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
            </div>
            <button type="button" disabled={empty} onClick={onAdd} className="btn btn-accent min-h-12 flex-1 whitespace-nowrap text-[1rem] uppercase disabled:opacity-50">
              {added ? 'Adăugat în coș' : <>Adaugă în coș<span className="max-sm:hidden"> · {fmt(price * qty)}</span></>}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => openEditor(hasOptions ? 'produs' : 'foto')} className="btn btn-accent mt-3 min-h-13 w-full gap-2.5 text-[1.05rem] uppercase shadow-[0_10px_22px_-12px_rgba(229,72,77,.9)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden><path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" /></svg>
            Personalizează
          </button>
        )}

            <ul className="mt-5 divide-y divide-sand rounded-[10px] border border-sand bg-white text-[13.5px]">
              {[
                ['truck', 'Curier la ușă, 1-2 zile', '17,99 lei', ''],
                ['box', 'Easybox / FANbox', '12,99 lei', 'cel mai ieftin'],
                ['gift', 'Comenzi peste 250 lei', 'gratuit', ''],
              ].map(([icon, label, cost, tag]) => (
                <li key={label} className="flex items-center gap-3 px-3.5 py-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0 text-wood" aria-hidden>
                    {icon === 'truck' && <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />}
                    {icon === 'box' && <path d="M4 8l8-4 8 4v8l-8 4-8-4V8Zm0 0 8 4 8-4m-8 4v8" />}
                    {icon === 'gift' && <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7s-1-3-3.5-3S7 7 12 7Zm0 0s1-3 3.5-3S17 7 12 7Z" />}
                  </svg>
                  <span className="flex-1 text-espresso/85">
                    {label}
                    {tag && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-[#f3ebdf] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-wood">{tag}</span>}
                  </span>
                  <b className={`font-semibold ${cost === 'gratuit' ? 'text-wood' : 'text-espresso'}`}>{cost}</b>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-2.5 text-[13px] leading-relaxed text-[#7d746b]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 shrink-0 text-wood" aria-hidden><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z" /></svg>
              <span>
                Gravăm în <b className="text-espresso">{product.leadDays}</b>, pe o zonă de <b className="text-espresso">{product.engraveMm}</b>. Înainte să pornim laserul îți trimitem <b className="text-espresso">macheta pe WhatsApp</b> și gravăm doar după ce o confirmi.
              </span>
            </p>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-cream" role="dialog" aria-modal="true" aria-label={`Personalizezi: ${product.name}`}>
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-sand bg-white px-4 lg:h-16 lg:px-6">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-wood">Personalizezi</p>
              <p className="truncate font-serif text-[1.15rem] font-semibold leading-tight text-espresso lg:text-[1.3rem]">{product.name}</p>
            </div>
            <button type="button" onClick={closeEditor} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-espresso hover:bg-cream">
              <span className="max-sm:sr-only">Închide</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] lg:grid-cols-[1fr_460px] lg:grid-rows-1">
            <div className="flex flex-col items-center justify-center bg-[#eee8e0] px-3 py-2 lg:px-10 lg:py-8">
              <div className="relative aspect-square h-[32dvh] overflow-hidden rounded-xl bg-photo shadow-[0_20px_50px_-28px_rgba(60,40,20,.6)] lg:h-auto lg:w-[min(100%,calc(100dvh-11rem))]">
                {stage}
              </div>
              {caption}
            </div>

            <div className="flex min-h-0 flex-col border-sand bg-cream lg:border-l">
              <div role="tablist" aria-label="Pașii personalizării" className={`grid shrink-0 border-b border-sand bg-white ${hasOptions ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {(hasOptions ? ([['produs', '01', 'Produsul'], ['foto', '02', 'Fotografia'], ['text', '03', 'Textul']] as const) : ([['foto', '01', 'Fotografia'], ['text', '02', 'Textul']] as const)).map(([id, n, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`relative flex items-baseline justify-center gap-1.5 py-3.5 font-serif text-[1.1rem] font-semibold sm:text-[1.2rem] transition-colors ${tab === id ? 'text-espresso' : 'text-[#a59a8e] hover:text-espresso'}`}
                  >
                    <span className="text-[0.95rem] font-medium italic text-wood">{n}</span>
                    {label}
                    {tab === id && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-wood" aria-hidden />}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" role="tabpanel">
                {tab === 'produs' ? (
                  options
                ) : tab === 'foto' ? (
                  <>
            <input ref={fileInput} type="file" accept="image/*" className="sr-only" id="photo-upload" onChange={(e) => onFile(e.target.files?.[0])} />
            {design.photo ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); }}
                className={`flex items-center gap-3 rounded-lg border p-2 transition-colors duration-150 ${dragOver ? 'border-wood bg-white' : 'border-sand bg-white'}`}
              >
                {photoThumb && <img src={photoThumb} alt="Fotografia încărcată" width={56} height={56} className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-sand" />}
                <span className="min-w-0 flex-1 text-sm">
                  <span className="flex items-center gap-1.5 font-bold text-espresso">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-wood" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
                    Fotografie încărcată
                  </span>
                  <span className="block truncate text-[13px] text-muted">{photoName || 'fotografia ta'}</span>
                </span>
                <label htmlFor="photo-upload" className="shrink-0 cursor-pointer rounded-lg border border-espresso/80 px-3.5 py-1.5 text-[13px] font-bold text-espresso transition-colors hover:bg-espresso hover:text-cream">Schimbă</label>
                <button type="button" aria-label="Scoate fotografia" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#9a8f84] hover:bg-cream hover:text-espresso" onClick={() => { patch({ photo: null, photoW: 0, photoH: 0 }); setPhotoName(''); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 7h14M10 7V5h4v2m-7 0 1 12h8l1-12" /></svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="photo-upload"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); }}
                className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed bg-white px-4 py-7 text-center transition-colors duration-200 ${dragOver ? 'border-wood bg-[#fffdf9]' : 'border-[#d3c5b1] hover:border-wood'}`}
              >
                <span className="grid size-12 place-items-center rounded-full border border-sand bg-cream text-wood">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 16V5m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
                </span>
                <span className="mt-3 font-serif text-[1.3rem] font-semibold text-espresso">Încarcă fotografia</span>
                <span className="text-[13px] text-[#8a7f74]">sau trage poza aici. O păstrăm la calitatea originală.</span>
              </label>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#8a7f74]">
              <span>Fără poză la îndemână? Încearcă:</span>
              {(['caine', 'portret'] as const).map((k) => (
                <button key={k} type="button" onClick={() => pickSample(k)} className="inline-flex items-center gap-1.5 rounded-full border border-sand bg-white py-0.5 pl-0.5 pr-2.5 font-semibold text-espresso transition-colors hover:border-wood">
                  <img src={SAMPLE_PHOTOS[k]} alt="" width={22} height={22} className="size-[22px] rounded-full object-cover" />
                  {k === 'caine' ? 'câine' : 'cuplu'}
                </button>
              ))}
            </div>

            {design.photo && (
              <div className="mt-5">
                <Label aside={cut === 'loading' ? 'se decupează…' : undefined}>Fundalul pozei</Label>
                <div role="radiogroup" aria-label="Fundalul pozei" className="grid grid-cols-2 gap-2">
                  {([
                    ['off', 'Păstrez fundalul', 'toată poza, în formă'],
                    ['on', 'Decupez fundalul', autoCut ? 'doar persoana, ca la cristale' : 'doar persoana sau animalul'],
                  ] as const).map(([id, label, sub]) => {
                    const on = id === 'on' ? cut === 'on' || cut === 'loading' : cut === 'off' || cut === 'error';
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={cut === 'loading'}
                        onClick={() => (id === 'on' ? cut !== 'on' && design.photo && applyCut(design.photo, design.photoW, design.photoH, design.shape) : cut === 'on' && undoCut())}
                        className={`relative rounded-[10px] border bg-white px-3.5 py-3 text-left transition duration-200 ease-out disabled:cursor-wait ${
                          on ? 'border-wood shadow-[0_0_0_1px_var(--color-wood),0_6px_16px_-8px_rgba(107,70,35,.45)]' : 'border-sand hover:border-[#d6c9b5]'
                        }`}
                      >
                        <span className={`block text-[13.5px] font-bold ${on ? 'text-wood-dark' : 'text-espresso'}`}>{label}</span>
                        <span className="mt-0.5 block text-[12.5px] text-[#8a7f74]">{sub}</span>
                        {id === 'on' && cut === 'loading' && <span className="absolute right-3 top-3 size-4 animate-spin rounded-full border-2 border-sand border-t-wood" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {design.photo && (
              <div className="mt-6 space-y-6">
                {design.technique === 'laser' && (
                <div>
                  <Label>Stilul gravurii</Label>
                  <div role="radiogroup" aria-label="Stilul gravurii" className="grid grid-cols-4 gap-2">
                    {STYLES.map((s) => (
                      <Tile key={s.id} label={s.label} active={design.style === s.id} onClick={() => patch({ style: s.id })}>
                        <span className="block aspect-square w-full overflow-hidden rounded-md bg-[#efe8dd]">
                          {styleThumbs[s.id] && <img src={styleThumbs[s.id]} alt="" className="size-full object-cover" />}
                        </span>
                        <span className={`mt-1 text-[12.5px] font-bold ${design.style === s.id ? 'text-wood-dark' : 'text-espresso'}`}>{s.label}</span>
                      </Tile>
                    ))}
                  </div>
                  <p className="mt-2 font-serif text-[15px] italic text-[#8a7f74]">{STYLES.find((s) => s.id === design.style)!.hint}</p>
                </div>
                )}
                <div>
                  <Label>Forma</Label>
                  <div role="radiogroup" aria-label="Forma fotografiei" className="grid grid-cols-4 gap-2">
                    {SHAPES.map((s) => (
                      <Tile key={s.id} label={s.label} active={design.shape === s.id} onClick={() => patch({ shape: s.id })}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`mt-1 ${design.shape === s.id ? 'text-wood' : 'text-[#7d746b]'}`} aria-hidden>
                          {SHAPE_ICON[s.id]}
                        </svg>
                        <span className={`mt-0.5 text-[12.5px] font-bold ${design.shape === s.id ? 'text-wood-dark' : 'text-espresso'}`}>{s.label}</span>
                      </Tile>
                    ))}
                  </div>
                </div>
                <div>
                  <Label
                    aside={
                      <button type="button" className="not-italic font-semibold text-wood underline decoration-sand underline-offset-4 hover:decoration-wood" onClick={() => patch({ zoom: 1, brightness: 0, contrast: 1, offsetX: 0, offsetY: 0 })}>
                        Resetează
                      </button>
                    }
                  >
                    Ajustează poza
                  </Label>
                  <div className="space-y-2.5 rounded-[10px] border border-sand bg-white px-4 py-3.5">
                    <Slider label="Mărime" min={0.6} max={2.4} value={design.zoom} onChange={(zoom) => patch({ zoom })} format={(v) => `${Math.round(v * 100)}%`} />
                    <Slider label="Luminozitate" min={-0.6} max={0.6} value={design.brightness} onChange={(brightness) => patch({ brightness })} format={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`} />
                    <Slider label="Contrast" min={0.6} max={2.2} value={design.contrast} onChange={(contrast) => patch({ contrast })} format={(v) => `${Math.round(v * 100)}%`} />
                  </div>
                </div>
              </div>
            )}
                  </>
                ) : (
                  <>
            <label className="block rounded-[10px] border border-sand bg-white px-3.5 pb-2 pt-1.5 transition duration-200 focus-within:border-wood focus-within:shadow-[0_0_0_3px_rgba(139,94,52,.12)]">
              <span className="flex justify-between text-[10.5px] font-bold uppercase tracking-[0.14em] text-wood">
                Textul tău
                <span className="font-semibold normal-case tracking-normal tabular-nums text-[#b0a598]">{design.text.length}/{MAX_TEXT}</span>
              </span>
              <textarea
                value={design.text}
                maxLength={MAX_TEXT}
                rows={3}
                placeholder={'Scrie ce vrei tu: un nume, o dată, un mesaj.\nEnter trece pe rândul următor.'}
                onChange={(e) => patch({ text: e.target.value.split('\n').slice(0, MAX_LINES).join('\n'), text2: '' })}
                className="mt-1 w-full resize-none bg-transparent font-serif text-[1.2rem] font-semibold leading-snug text-espresso outline-none placeholder:text-[0.95rem] placeholder:font-normal placeholder:italic placeholder:text-[#b3a899]"
              />
            </label>
            <p className="mt-1.5 text-[12px] text-[#9a8f84]">Până la {MAX_LINES} rânduri. Diacriticele (ă, â, î, ș, ț) se gravează corect.</p>
            {design.text.trim() && (
              <div className="mt-4 rounded-[10px] border border-sand bg-white px-4 py-3">
                <Slider label="Mărimea textului" min={0.5} max={1.4} value={design.textScale} onChange={(textScale) => patch({ textScale })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
            )}
            <div className="mt-4">
              <Label>Fontul</Label>
              <div role="radiogroup" aria-label="Fontul" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(FONTS) as FontId[]).map((f) => (
                  <Tile key={f} label={FONTS[f].label} active={design.font === f} onClick={() => patch({ font: f })}>
                    <span className={`block w-full overflow-hidden whitespace-nowrap py-1 text-[1.35rem] leading-tight ${design.font === f ? 'text-wood-dark' : 'text-espresso'}`} style={{ fontFamily: FONTS[f].css }}>
                      {(design.text.trim().split(/\s+/)[0] || 'Ana').slice(0, 9)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#9a8f84]">{FONTS[f].label}</span>
                  </Tile>
                ))}
              </div>
            </div>
            {design.technique === 'color' && (
              <div className="mt-4">
                <Label aside={INKS.find((i) => i.hex === design.ink)?.label}>Culoarea textului</Label>
                <div role="radiogroup" aria-label="Culoarea textului" className="flex flex-wrap gap-2">
                  {INKS.map((i) => (
                    <button
                      key={i.hex}
                      type="button"
                      role="radio"
                      aria-checked={design.ink === i.hex}
                      aria-label={i.label}
                      onClick={() => patch({ ink: i.hex })}
                      className={`grid size-10 place-items-center rounded-full border-2 transition ${design.ink === i.hex ? 'border-wood' : 'border-transparent hover:border-sand'}`}
                    >
                      <span className="size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.15)]" style={{ background: i.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {design.photo && (
              <div className="mt-4">
                <Label>Unde apare textul</Label>
                <div role="radiogroup" aria-label="Poziția textului" className="grid grid-cols-2 gap-2">
                  {([['sus', 'Deasupra pozei'], ['jos', 'Sub poză']] as const).map(([id, label]) => (
                    <Tile key={id} label={label} active={design.textPos === id} onClick={() => patch({ textPos: id })}>
                      <span className="flex items-center gap-2.5 py-1">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={design.textPos === id ? 'text-wood' : 'text-[#7d746b]'} aria-hidden>
                          {id === 'sus' ? <><path d="M7 4h10" /><rect x="5" y="8" width="14" height="12" rx="1.5" /></> : <><rect x="5" y="4" width="14" height="12" rx="1.5" /><path d="M7 20h10" /></>}
                        </svg>
                        <span className={`text-[13px] font-bold ${design.textPos === id ? 'text-wood-dark' : 'text-espresso'}`}>{label}</span>
                      </span>
                    </Tile>
                  ))}
                </div>
              </div>
            )}
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3 border-t border-sand bg-white px-4 py-3 sm:px-6">
                <p className="leading-tight">
                  <span className="block text-[11.5px] text-[#8a7f74]">Total{gift ? ', cu ambalaj' : ''}</span>
                  <span className="font-serif text-[1.55rem] font-semibold text-espresso">{fmt(price * qty)}</span>
                </p>
                {tab !== 'text' ? (
                  <button type="button" onClick={() => setTab(tab === 'produs' ? 'foto' : 'text')} className="ml-auto flex min-h-12 items-center gap-2 rounded-[10px] bg-espresso px-5 text-[0.95rem] font-bold text-cream transition-colors hover:bg-wood-dark">
                    {tab === 'produs' ? 'Continuă la poză' : 'Continuă la text'}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
                  </button>
                ) : (
                  <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={closeEditor} className="hidden min-h-12 rounded-[10px] px-3 text-[0.9rem] font-semibold text-espresso underline decoration-sand underline-offset-4 hover:decoration-wood sm:block">
                      Salvează
                    </button>
                    <button type="button" disabled={empty} onClick={() => { onAdd(); closeEditor(); }} className="flex min-h-12 items-center gap-2 whitespace-nowrap rounded-[10px] bg-espresso px-5 text-[0.95rem] font-bold text-cream transition-colors hover:bg-wood-dark disabled:opacity-50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Zm4 0V6a3 3 0 0 1 6 0v2" /></svg>
                      Adaugă în coș
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
