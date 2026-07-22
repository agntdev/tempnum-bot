import type { StorageAdapter } from "grammy";

export interface Country {
  code: string;
  name: string;
  enabled: boolean;
  basePrice: number;
  currency: string;
}

export interface VirtualNumber {
  id: string;
  countryCode: string;
  number: string;
  sku: string;
  status: "available" | "sold";
  price: number;
  currency: string;
  soldAt?: string;
  soldTo?: number;
}

export interface Order {
  id: string;
  buyerId: number;
  buyerName: string;
  numberId: string;
  countryCode: string;
  number: string;
  sku: string;
  price: number;
  currency: string;
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
}

export interface PublicListing {
  orderId: string;
  countryCode: string;
  number: string;
  sku: string;
  anonymizedHandle: string;
  visible: boolean;
  createdAt: string;
}

class Store {
  private data = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }

  getByPrefix(prefix: string): [string, unknown][] {
    const results: [string, unknown][] = [];
    for (const [k, v] of this.data) {
      if (k.startsWith(prefix)) results.push([k, v]);
    }
    return results;
  }
}

const store = new Store();

function countryKey(code: string) { return `country:${code}`; }
function numberKey(id: string) { return `num:${id}`; }
function orderKey(id: string) { return `order:${id}`; }
function listingKey(orderId: string) { return `listing:${orderId}`; }
function userKey(id: number) { return `user:${id}`; }
function countryIndexKey() { return "idx:countries"; }
function numbersByCountryKey(code: string) { return `idx:nums:${code}`; }
function userOrdersKey(userId: number) { return `idx:user_orders:${userId}`; }
function orderCounterKey() { return "counter:orders"; }
function numberCounterKey() { return "counter:numbers"; }

export function getCountry(code: string): Country | undefined {
  return store.get<Country>(countryKey(code));
}

export function setCountry(country: Country): void {
  store.set(countryKey(country.code), country);
  const idx = store.get<string[]>(countryIndexKey()) ?? [];
  if (!idx.includes(country.code)) {
    idx.push(country.code);
    store.set(countryIndexKey(), idx);
  }
}

export function getEnabledCountries(): Country[] {
  const codes = store.get<string[]>(countryIndexKey()) ?? [];
  return codes
    .map((c) => store.get<Country>(countryKey(c)))
    .filter((c): c is Country => c !== undefined && c.enabled);
}

export function getAllCountries(): Country[] {
  const codes = store.get<string[]>(countryIndexKey()) ?? [];
  return codes
    .map((c) => store.get<Country>(countryKey(c)))
    .filter((c): c is Country => c !== undefined);
}

export function getAvailableNumbers(countryCode: string): VirtualNumber[] {
  const ids = store.get<string[]>(numbersByCountryKey(countryCode)) ?? [];
  return ids
    .map((id) => store.get<VirtualNumber>(numberKey(id)))
    .filter((n): n is VirtualNumber => n !== undefined && n.status === "available");
}

export function getNumber(id: string): VirtualNumber | undefined {
  return store.get<VirtualNumber>(numberKey(id));
}

export function setNumber(num: VirtualNumber): void {
  store.set(numberKey(num.id), num);
  const idx = store.get<string[]>(numbersByCountryKey(num.countryCode)) ?? [];
  if (!idx.includes(num.id)) {
    idx.push(num.id);
    store.set(numbersByCountryKey(num.countryCode), idx);
  }
}

export function markNumberSold(id: string, buyerId: number): void {
  const num = store.get<VirtualNumber>(numberKey(id));
  if (num) {
    num.status = "sold";
    num.soldAt = now().toISOString();
    num.soldTo = buyerId;
    store.set(numberKey(id), num);
  }
}

export function getOrder(id: string): Order | undefined {
  return store.get<Order>(orderKey(id));
}

export function createOrder(order: Order): void {
  store.set(orderKey(order.id), order);
  const idx = store.get<string[]>(userOrdersKey(order.buyerId)) ?? [];
  idx.push(order.id);
  store.set(userOrdersKey(order.buyerId), idx);
}

export function updateOrder(id: string, updates: Partial<Order>): void {
  const order = store.get<Order>(orderKey(id));
  if (order) {
    Object.assign(order, updates);
    store.set(orderKey(id), order);
  }
}

export function getUserOrders(userId: number): Order[] {
  const ids = store.get<string[]>(userOrdersKey(userId)) ?? [];
  return ids
    .map((id) => store.get<Order>(orderKey(id)))
    .filter((o): o is Order => o !== undefined);
}

export function createListing(listing: PublicListing): void {
  store.set(listingKey(listing.orderId), listing);
}

export function getListing(orderId: string): PublicListing | undefined {
  return store.get<PublicListing>(listingKey(orderId));
}

export function updateListing(orderId: string, updates: Partial<PublicListing>): void {
  const listing = store.get<PublicListing>(listingKey(orderId));
  if (listing) {
    Object.assign(listing, updates);
    store.set(listingKey(orderId), listing);
  }
}

export function nextOrderId(): string {
  const n = (store.get<number>(orderCounterKey()) ?? 0) + 1;
  store.set(orderCounterKey(), n);
  return `ORD-${String(n).padStart(5, "0")}`;
}

export function nextNumberId(): string {
  const n = (store.get<number>(numberCounterKey()) ?? 0) + 1;
  store.set(numberCounterKey(), n);
  return `NUM-${String(n).padStart(5, "0")}`;
}

let clockFn: () => Date = () => new Date();

export function now(): Date {
  return clockFn();
}

export function setClock(fn: () => Date): void {
  clockFn = fn;
}

export function resetStore(): void {
  store.delete = (key: string) => { store["data"].delete(key); };
  for (const k of store.keys()) store["data"].delete(k);
  clockFn = () => new Date();
}

export function seedDemoData(): void {
  const countries: Country[] = [
    { code: "US", name: "United States", enabled: true, basePrice: 2.50, currency: "USD" },
    { code: "UK", name: "United Kingdom", enabled: true, basePrice: 3.00, currency: "GBP" },
    { code: "CA", name: "Canada", enabled: true, basePrice: 2.75, currency: "CAD" },
    { code: "DE", name: "Germany", enabled: true, basePrice: 2.80, currency: "EUR" },
    { code: "FR", name: "France", enabled: true, basePrice: 2.80, currency: "EUR" },
    { code: "AU", name: "Australia", enabled: true, basePrice: 3.20, currency: "AUD" },
    { code: "JP", name: "Japan", enabled: true, basePrice: 4.00, currency: "JPY" },
    { code: "BR", name: "Brazil", enabled: false, basePrice: 1.50, currency: "BRL" },
  ];

  for (const c of countries) setCountry(c);

  const numberTemplates: { country: string; prefix: string; prices: number[] }[] = [
    { country: "US", prefix: "+1 (555)", prices: [2.50, 2.50, 2.50] },
    { country: "UK", prefix: "+44 7", prices: [3.00, 3.00] },
    { country: "CA", prefix: "+1 (604)", prices: [2.75, 2.75] },
    { country: "DE", prefix: "+49 151", prices: [2.80, 2.80] },
    { country: "FR", prefix: "+33 6", prices: [2.80] },
    { country: "AU", prefix: "+61 4", prices: [3.20, 3.20] },
    { country: "JP", prefix: "+81 90", prices: [4.00] },
  ];

  for (const tmpl of numberTemplates) {
    const c = getCountry(tmpl.country);
    for (let i = 0; i < tmpl.prices.length; i++) {
      const suffix = String(1000 + i * 1111);
      setNumber({
        id: nextNumberId(),
        countryCode: tmpl.country,
        number: `${tmpl.prefix} ${suffix}`,
        sku: `${tmpl.country}-NUM-${i + 1}`,
        status: "available",
        price: tmpl.prices[i],
        currency: c?.currency ?? "USD",
      });
    }
  }
}
