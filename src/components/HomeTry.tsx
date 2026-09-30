import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/great-vibes';
import type { Product } from '../data/catalog';
import { ensureFonts, loadImage, type Design } from '../lib/engrave';
import { designFromSample, drawComposite, materialFor } from '../lib/render';
import { removeBackground } from '../lib/cutout';

const Cylinder3D = lazy(() => import('./Cylinder3D'));
const Crystal3D = lazy(() => import('./Crystal3D'));

class Fallback extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Homepage teaser: upload a photo, see it engraved in the crystal right away. */
export default function HomeTry({ product }: { product: Product }) {
  const [design, setDesign] = useState<Design | null>(null);
  const [burn, setBurn] = useState<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLImageElement | null>(null);
  const [visible, setVisible] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  // only start WebGL when the section is close to the viewport
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '300px' });
    io.observe(host.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    Promise.all([loadImage(product.image), designFromSample(product.sample), ensureFonts()]).then(([img, d]) => {
      base.current = img;
      setDesign(d);
    });
  }, [visible, product]);

  useEffect(() => {
    if (!design || !base.current || !canvas.current) return;
    setBurn(drawComposite(canvas.current, product, base.current, design, materialFor(product, design)));
    setVersion((v) => v + 1);
  }, [design, product]);

  const [busy, setBusy] = useState(false);
  const onFile = async (f?: File | null) => {
    if (!f || !design) return;
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    setDesign({ ...design, photo: img, photoW: img.naturalWidth, photoH: img.naturalHeight, offsetX: 0, offsetY: 0, zoom: 1 });
    if (!product.crystal) return;
    // crystals show the subject only, like the real ones
    setBusy(true);
    try {
      const c = await removeBackground(img);
      setDesign((d) => d && { ...d, photo: c, photoW: c.width, photoH: c.height, shape: 'rect', offsetX: 0, offsetY: 0, zoom: 1 });
    } catch {
      /* keep the whole photo */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={host} className="grid overflow-hidden rounded-lg bg-white md:grid-cols-2">
      <div className="relative aspect-square bg-[radial-gradient(ellipse_at_50%_38%,#4b4b50,#1b1b1e_75%)] md:aspect-auto md:min-h-[480px]">
        <canvas ref={canvas} width={1600} height={1600} className="hidden" aria-hidden />
        {visible && (product.cylinder || product.crystal) && (
          <Fallback fallback={<img src={`/img/products/${product.slug}.jpg`} alt="" className="absolute inset-0 size-full object-cover" />}>
            <Suspense fallback={null}>
              {product.crystal ? (
                <Crystal3D crystal={product.crystal} burn={burn} version={version} led={product.crystal.led === 'inclus'} />
              ) : (
                <Cylinder3D cylinder={product.cylinder!} material={product.material} burn={burn} version={version} />
              )}
            </Suspense>
          </Fallback>
        )}
        {busy && (
          <span className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-md bg-white/90 px-3 py-1.5 text-xs font-bold text-ink">Decupăm fundalul pozei…</span>
        )}
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-bold">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden /> Previzualizare live
        </span>
      </div>
      <div className="flex flex-col justify-center p-6 md:p-10">
        <h2 className="text-[clamp(1.3rem,1rem+1vw,1.8rem)] font-extrabold uppercase leading-tight">Încearcă acum<span className="block text-sun">în cristalul tău</span></h2>
        <p className="mt-2 text-ink-2">
          Încarcă o poză și scrie un nume. Decupăm fundalul automat, iar poza apare în cristal din puncte fine, cum o desenează laserul. Rotește cristalul cu degetul.
        </p>
        <div className="mt-6 space-y-3">
          <label className="btn btn-accent w-full cursor-pointer uppercase sm:w-auto">
            Încarcă o poză
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Textul de sub poză</span>
            <input
              type="text"
              maxLength={40}
              value={design?.text.split('\n')[0] ?? ''}
              onChange={(e) => design && setDesign({ ...design, text: e.target.value })}
              className="min-h-11 w-full rounded-lg border border-[#cfcac4] bg-white px-3 outline-none focus:border-ink"
            />
          </label>
        </div>
        <a href={`/produs/${product.slug}`} className="mt-6 text-sm font-bold underline underline-offset-4 hover:text-accent">
          Deschide editorul complet: stil, formă, font, al doilea rând
        </a>
      </div>
    </div>
  );
}
