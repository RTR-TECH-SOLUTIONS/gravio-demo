import { useEffect, useRef, useState } from 'react';
import { FREE_SHIPPING, fmt, readCart, removeItem, setQty, subtotal, type CartItem } from '../lib/cart';

export default function CartButton() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setItems(readCart());
    const onUpdate = (e: Event) => setItems((e as CustomEvent<CartItem[]>).detail);
    const onOpen = () => setOpen(true);
    window.addEventListener('cart:update', onUpdate);
    window.addEventListener('cart:open', onOpen);
    return () => {
      window.removeEventListener('cart:update', onUpdate);
      window.removeEventListener('cart:open', onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const sub = subtotal(items);
  const left = FREE_SHIPPING - sub;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative grid size-11 place-items-center rounded-lg hover:bg-surface"
        aria-label={`Coșul de cumpărături, ${count} produse`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-white">
            {count}
          </span>
        )}
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Coșul tău"
          className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-extrabold">Coșul tău {count > 0 && <span className="font-semibold text-muted">({count})</span>}</h2>
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-surface" aria-label="Închide coșul">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="grid flex-1 place-items-center px-8 text-center">
              <div>
                <p className="font-bold">Coșul e gol.</p>
                <p className="mt-1 text-sm text-muted">Alege un produs, încarcă o poză și vezi gravura pe loc.</p>
                <a href="/produse" className="btn btn-ink mt-5">Vezi produsele</a>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-line px-5 py-3 text-sm">
                {left > 0 ? (
                  <>Mai adaugă <b>{fmt(left)}</b> și livrarea e gratuită.</>
                ) : (
                  <b className="text-ok">Ai livrare gratuită.</b>
                )}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (sub / FREE_SHIPPING) * 100)}%` }} />
                </div>
              </div>
              <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                {items.map((i) => (
                  <li key={i.id} className="flex gap-3 py-4">
                    <img src={i.thumb} alt="" width={84} height={84} className="size-21 shrink-0 rounded-lg bg-photo object-cover" />
                    <div className="min-w-0 flex-1">
                      <a href={`/produs/${i.slug}`} className="line-clamp-2 text-sm font-bold hover:underline">{i.name}</a>
                      <ul className="mt-1 text-xs text-muted">
                        {i.summary.map((s) => <li key={s} className="truncate">{s}</li>)}
                      </ul>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-line text-sm">
                          <button type="button" className="size-8" aria-label="Scade" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                          <span className="w-6 text-center tabular-nums">{i.qty}</span>
                          <button type="button" className="size-8" aria-label="Crește" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                        </div>
                        <span className="font-bold">{fmt(i.price * i.qty)}</span>
                      </div>
                      <button type="button" className="mt-1 text-xs text-muted underline underline-offset-2 hover:text-ink" onClick={() => removeItem(i.id)}>Șterge</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line p-5">
                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><b>{fmt(sub)}</b></div>
                <a href="/cos" className="btn btn-accent mt-4 w-full">Finalizează comanda</a>
                <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-2 text-sm font-semibold text-muted hover:text-ink">Continuă cumpărăturile</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
