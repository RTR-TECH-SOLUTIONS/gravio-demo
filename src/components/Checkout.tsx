import { useEffect, useState } from 'react';
import { clearCart, fmt, readCart, removeItem, setQty, shippingFor, subtotal, type CartItem } from '../lib/cart';

type Pay = 'card' | 'ramburs';
const COD_FEE = 5;

function Field({ label, name, type = 'text', autoComplete, className = '', required = true, pattern, hint }: {
  label: string; name: string; type?: string; autoComplete?: string; className?: string; required?: boolean; pattern?: string; hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-semibold">{label}{!required && <span className="font-normal text-muted"> (opțional)</span>}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        pattern={pattern}
        title={hint}
        className="peer min-h-11 w-full rounded-lg border border-[#cfcac4] bg-white px-3 outline-none focus:border-ink [&:user-invalid]:border-accent"
      />
      {hint && <span className="mt-1 hidden text-xs text-accent peer-[&:user-invalid]:block">{hint}</span>}
    </label>
  );
}

export default function Checkout() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [pay, setPay] = useState<Pay>('card');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    const on = (e: Event) => setItems((e as CustomEvent<CartItem[]>).detail);
    window.addEventListener('cart:update', on);
    return () => window.removeEventListener('cart:update', on);
  }, []);

  if (items === null) return <div className="min-h-[50vh]" />;

  if (done)
    return (
      <div className="mx-auto max-w-[560px] py-16 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-ok text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">Mulțumim, am primit comanda {done}</h1>
        <p className="mt-3 text-ink-2">
          Pregătim macheta și ți-o trimitem pe WhatsApp în cel mult 4 ore lucrătoare. Pornim gravura doar după ce o confirmi.
        </p>
        <a href="/" className="btn btn-ink mt-8">Înapoi în magazin</a>
      </div>
    );

  if (!items.length)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-extrabold">Coșul e gol</h1>
        <p className="mt-2 text-muted">Alege un produs, încarcă o poză și vezi gravura pe loc.</p>
        <a href="/produse" className="btn btn-ink mt-6">Vezi produsele</a>
      </div>
    );

  const sub = subtotal(items);
  const ship = shippingFor(sub);
  const fee = pay === 'ramburs' ? COD_FEE : 0;
  const total = sub + ship + fee;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO(real): create the order in Medusa, Stripe Checkout / Netopia for card, send the confirmation e-mail via Resend
    const id = `#GV${Math.floor(10000 + Math.random() * 89999)}`;
    clearCart();
    setDone(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <form id="checkout" onSubmit={onSubmit} className="space-y-8">
        <h1 className="text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] font-extrabold">Finalizează comanda</h1>

        <section>
          <h2 className="mb-3 font-extrabold">Date de contact</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nume și prenume" name="name" autoComplete="name" className="sm:col-span-2" />
            <Field label="Telefon" name="tel" type="tel" autoComplete="tel" pattern="^(\+4|004)?0?7\d{8}$" hint="Un număr de mobil, de ex. 0740 123 456" />
            <Field label="E-mail" name="email" type="email" autoComplete="email" hint="Verifică adresa de e-mail" />
          </div>
          <p className="mt-2 text-xs text-muted">Pe numărul de telefon îți trimitem macheta pe WhatsApp.</p>
        </section>

        <section>
          <h2 className="mb-3 font-extrabold">Adresa de livrare</h2>
          <div className="grid gap-3 sm:grid-cols-6">
            <Field label="Strada și numărul" name="street" autoComplete="street-address" className="sm:col-span-6" />
            <Field label="Localitatea" name="city" autoComplete="address-level2" className="sm:col-span-2" />
            <Field label="Județul" name="county" autoComplete="address-level1" className="sm:col-span-2" />
            <Field label="Cod poștal" name="zip" autoComplete="postal-code" required={false} className="sm:col-span-2" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-extrabold">Plata</h2>
          <div className="grid gap-2">
            {([
              { id: 'card', t: 'Card online', d: 'Visa, Mastercard, Apple Pay, Google Pay' },
              { id: 'ramburs', t: 'Ramburs la curier', d: `plătești când primești coletul, +${COD_FEE} lei` },
            ] as const).map((o) => (
              <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${pay === o.id ? 'border-ink bg-surface' : 'border-line'}`}>
                <input type="radio" name="pay" checked={pay === o.id} onChange={() => setPay(o.id)} className="size-4 accent-ink" />
                <span className="text-sm"><b className="block">{o.t}</b><span className="text-muted">{o.d}</span></span>
              </label>
            ))}
          </div>
        </section>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" required className="mt-0.5 size-4 accent-ink" />
          <span>Am citit și sunt de acord cu termenii și condițiile. Înțeleg că produsele personalizate nu se pot returna, dar se refac gratuit dacă gravura are un defect.</span>
        </label>
      </form>

      <aside className="h-fit rounded-[10px] bg-surface p-5 lg:sticky lg:top-4">
        <h2 className="font-extrabold">Comanda ta</h2>
        <ul className="mt-3 divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3">
              <img src={i.thumb} alt="" width={64} height={64} className="size-16 shrink-0 rounded-md bg-photo object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-2 font-semibold leading-snug">{i.name}</p>
                {i.summary.map((s) => <p key={s} className="truncate text-xs text-muted">{s}</p>)}
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex items-center rounded-md border border-line bg-white">
                    <button type="button" className="size-7" aria-label="Scade" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                    <span className="w-5 text-center tabular-nums">{i.qty}</span>
                    <button type="button" className="size-7" aria-label="Crește" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                  </div>
                  <b>{fmt(i.price * i.qty)}</b>
                </div>
                <button type="button" className="mt-1 text-xs text-muted underline" onClick={() => removeItem(i.id)}>Șterge</button>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{fmt(sub)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Livrare curier</dt><dd>{ship ? fmt(ship) : 'gratuită'}</dd></div>
          {fee > 0 && <div className="flex justify-between"><dt className="text-muted">Taxă ramburs</dt><dd>{fmt(fee)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold">{fmt(total)}</dd></div>
        </dl>
        <button type="submit" form="checkout" className="btn btn-accent mt-4 w-full">
          {pay === 'card' ? `Plătește ${fmt(total)}` : `Trimite comanda · ${fmt(total)}`}
        </button>
        <p className="mt-3 text-center text-xs text-muted">Demo: nu se face nicio plată reală.</p>
      </aside>
    </div>
  );
}
