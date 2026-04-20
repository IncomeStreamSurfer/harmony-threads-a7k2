export type CartItem = {
  product_id: string;
  variant_sku: string;
  qty: number;
  name: string;
  price_pence: number;
  image_url: string;
  size?: string;
  color?: string;
};

const CART_KEY = "ht_cart";

export function getCart(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: items }));
}

export function addToCart(item: CartItem): void {
  const cart = getCart();
  const existing = cart.find(i => i.product_id === item.product_id && i.variant_sku === item.variant_sku);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

export function removeFromCart(product_id: string, variant_sku: string): void {
  const cart = getCart().filter(i => !(i.product_id === product_id && i.variant_sku === variant_sku));
  saveCart(cart);
}

export function updateQty(product_id: string, variant_sku: string, qty: number): void {
  const cart = getCart();
  const item = cart.find(i => i.product_id === product_id && i.variant_sku === variant_sku);
  if (item) {
    if (qty <= 0) {
      removeFromCart(product_id, variant_sku);
      return;
    }
    item.qty = qty;
    saveCart(cart);
  }
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price_pence * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export async function startCheckout(items: CartItem[], email?: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map(i => ({ product_id: i.product_id, qty: i.qty, variant_sku: i.variant_sku })),
      customer_email: email,
    }),
  });
  const { url, error } = await res.json();
  if (error || !url) throw new Error(error ?? "Checkout failed");
  window.location.href = url;
}
