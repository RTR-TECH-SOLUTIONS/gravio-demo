import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, OCCASIONS, PRODUCTS, catalogImage, lei, type CategoryId, type OccasionId, type Product } from '../data/catalog';

const PRICES = [
  { id: 'sub-60', label: 'Sub 60 lei', test: (p: number) => p < 60 },
  { id: '60-120', label: '60 - 120 lei', test: (p: number) => p >= 60 && p <= 120 },
  { id: 'peste-120', label: 'Peste 120 lei', test: (p: number) => p > 120 },
];
const FLAGS = {
  reduceri: { label: 'Reduceri', test: (p: Product) => !!p.oldPrice },
  noi: { label: 'Noutăți', test: (p: Product) => !!p.isNew },
  bestseller: { label: 'Cele mai vândute', test: (p: Product) => !!p.bestseller },
} as const;
type Flag = keyof typeof FLAGS;
type Sort = 'recomandate' | 'pret-asc' | 'pret-desc' | 'recenzii';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Card({ p }: { p: Product }) {
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <a href={`/produs/${p.slug}`} className="group block rounded-lg bg-white p-2.5 transition-shadow duration-200 hover:shadow-[0_6px_22px_rgba(0,0,0,.09)]">
      <div className="relative aspect-square overflow-hidden rounded-md bg-photo">
        <img src={catalogImage(p)} alt={p.name} width={600} height={600} loading="lazy" className="absolute inset-0 size-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
        <img src={p.image} alt="" width={600} height={600} loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/95 text-ink-2 shadow-sm" aria-hidden>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
        </span>
        {off > 0 && <span className="absolute right-0 top-12 rounded-l bg-accent px-2 py-0.5 text-[12px] font-bold text-white">-{off}%</span>}
        {p.isNew && <span className="absolute left-2 top-2 rounded bg-teal px-2 py-0.5 text-[11px] font-extrabold uppercase text-white">Nou</span>}
        <span className="absolute inset-x-2 bottom-2 translate-y-1 rounded bg-accent py-2 text-center text-[12px] font-extrabold uppercase text-white opacity-0 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">Personalizează</span>
      </div>
      <h3 className="mt-2.5 line-clamp-2 min-h-[2.5em] text-[13.5px] font-normal leading-snug text-ink">{p.name}</h3>
      <p className="mt-1 flex items-baseline gap-2">
        {p.oldPrice && <s className="text-[13px] text-ink-2">{lei(p.oldPrice)}</s>}
        <span className={`text-[15px] font-bold ${p.oldPrice ? 'text-accent' : 'text-ink'}`}>{lei(p.price)}</span>
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-2">
        <span><span className="text-ink" aria-hidden>★★★★★</span> ({p.reviews})</span>
        {p.colors && (
          <span className="ml-auto flex items-center gap-1" aria-label={`${p.colors.length} culori`}>
            {p.colors.map((c) => <span key={c.id} className="size-3 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} title={c.label} />)}
          </span>
        )}
      </p>
    </a>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4">
      <legend className="mb-2 font-bold">{title}</legend>
      <div className="space-y-1.5">{children}</div>
    </fieldset>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[0.93rem]">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[#e5484d]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
    </label>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function ProductsBrowser() {
  const [cats, setCats] = useState<CategoryId[]>([]);
  const [occ, setOcc] = useState<OccasionId[]>([]);
  const [prices, setPrices] = useState<string[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recomandate');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const u = new URLSearchParams(location.search);
    const c = u.get('cat');
    const o = u.get('o');
    const f = u.get('f');
    if (c && c in CATEGORIES) setCats([c as CategoryId]);
    if (o && o in OCCASIONS) setOcc([o as OccasionId]);
    if (f && f in FLAGS) setFlags([f as Flag]);
    setQ(u.get('q') ?? '');
  }, []);

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const r = PRODUCTS.filter(
      (p) =>
        (!cats.length || cats.includes(p.category)) &&
        (!occ.length || occ.some((o) => p.occasions.includes(o))) &&
        (!prices.length || PRICES.some((x) => prices.includes(x.id) && x.test(p.price))) &&
        flags.every((f) => FLAGS[f].test(p)) &&
        words.every((w) => norm(`${p.name} ${p.short} ${CATEGORIES[p.category].name}`).includes(w)),
    );
    if (sort === 'pret-asc') r.sort((a, b) => a.price - b.price);
    if (sort === 'pret-desc') r.sort((a, b) => b.price - a.price);
    if (sort === 'recenzii') r.sort((a, b) => b.reviews - a.reviews);
    return r;
  }, [cats, occ, prices, flags, q, sort]);

  const title =
    q ? `Rezultate pentru „${q}”` : cats.length === 1 ? CATEGORIES[cats[0]].name : occ.length === 1 ? OCCASIONS[occ[0]] : flags.length === 1 ? FLAGS[flags[0]].label : 'Toate produsele';
  const active = cats.length + occ.length + prices.length + flags.length + (q ? 1 : 0);
  const reset = () => {
    setCats([]);
    setOcc([]);
    setPrices([]);
    setFlags([]);
    setQ('');
    history.replaceState(null, '', '/produse');
  };

  const filters = (
    <>
      <Group title="Produs">
        {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
          <Check key={c} label={CATEGORIES[c].name} checked={cats.includes(c)} onChange={() => setCats(toggle(cats, c))} count={PRODUCTS.filter((p) => p.category === c).length} />
        ))}
      </Group>
      <Group title="Ocazie">
        {(Object.keys(OCCASIONS) as OccasionId[]).map((o) => (
          <Check key={o} label={OCCASIONS[o]} checked={occ.includes(o)} onChange={() => setOcc(toggle(occ, o))} count={PRODUCTS.filter((p) => p.occasions.includes(o)).length} />
        ))}
      </Group>
      <Group title="Preț">
        {PRICES.map((x) => (
          <Check key={x.id} label={x.label} checked={prices.includes(x.id)} onChange={() => setPrices(toggle(prices, x.id))} />
        ))}
      </Group>
      <Group title="Altele">
        {(Object.keys(FLAGS) as Flag[]).map((f) => (
          <Check key={f} label={FLAGS[f].label} checked={flags.includes(f)} onChange={() => setFlags(toggle(flags, f))} />
        ))}
      </Group>
      {active > 0 && (
        <button type="button" onClick={reset} className="mt-4 text-sm font-semibold underline underline-offset-2 hover:text-accent">
          Șterge toate filtrele
        </button>
      )}
    </>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden h-fit rounded-lg bg-white px-5 pb-5 pt-1 lg:block" aria-label="Filtre">{filters}</aside>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-white px-5 py-4">
          <div>
            <h1 className="text-[clamp(1.4rem,1.1rem+1vw,1.8rem)] font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted" aria-live="polite">{list.length} {list.length === 1 ? 'produs' : 'produse'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(true)} className="btn btn-line min-h-10 px-4 text-sm lg:hidden">
              Filtre{active > 0 && ` (${active})`}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">Sortează</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-10 rounded-lg border border-[#cfcac4] bg-white px-3 font-semibold">
                <option value="recomandate">Recomandate</option>
                <option value="pret-asc">Preț crescător</option>
                <option value="pret-desc">Preț descrescător</option>
                <option value="recenzii">Cele mai multe recenzii</option>
              </select>
            </label>
          </div>
        </div>

        {list.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4">
            {list.map((p) => <Card key={p.slug} p={p} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-bold">Niciun produs nu se potrivește filtrelor.</p>
            <button type="button" onClick={reset} className="btn btn-ink mt-4">Arată toate produsele</button>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtre">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-24 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Filtre</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center" aria-label="Închide filtrele">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            {filters}
            <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ink w-full">Vezi {list.length} produse</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
