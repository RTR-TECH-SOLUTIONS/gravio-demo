// Demo cart in localStorage. TODO(real): replace with the commerce backend cart (Medusa) + uploaded design files.

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  /** small JPEG of the personalised preview */
  thumb: string;
  summary: string[];
}

const KEY = 'gravio-cart';
export const FREE_SHIPPING = 250;
export const SHIPPING = 17.99;

export function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked: keep the in-memory state for this page
  }
  window.dispatchEvent(new CustomEvent('cart:update', { detail: items }));
}

export function addToCart(item: Omit<CartItem, 'id'>) {
  const items = readCart();
  items.push({ ...item, id: Math.random().toString(36).slice(2, 10) });
  write(items);
  window.dispatchEvent(new CustomEvent('cart:open'));
}

export function setQty(id: string, qty: number) {
  write(readCart().map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i)));
}

export function removeItem(id: string) {
  write(readCart().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}

export const subtotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
export const shippingFor = (sub: number) => (sub === 0 || sub >= FREE_SHIPPING ? 0 : SHIPPING);
export const fmt = (n: number) =>
  `${n.toLocaleString('ro-RO', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} lei`;
