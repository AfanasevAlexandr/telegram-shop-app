import { CONFIG } from './config.js';

// Внутреннее состояние корзины: { [sku]: qty }
let items = loadFromStorage();

// Подписчики, которых нужно уведомить при любом изменении корзины
// (используется app.js, чтобы перерисовать бейдж, панель и т.д.)
const listeners = new Set();

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(items));
  } catch (err) {
    // некритично
  }
  listeners.forEach(fn => fn(getState()));
}

export function onCartChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getQty(sku) {
  return items[sku] || 0;
}

export function setQty(sku, qty) {
  const safeQty = Math.max(0, Math.floor(qty) || 0);
  if (safeQty === 0) {
    delete items[sku];
  } else {
    items[sku] = safeQty;
  }
  persist();
}

export function increment(sku) {
  setQty(sku, getQty(sku) + 1);
}

export function decrement(sku) {
  setQty(sku, getQty(sku) - 1);
}

export function removeItem(sku) {
  setQty(sku, 0);
}

export function clearCart() {
  items = {};
  persist();
}

/** Возвращает массив [{ sku, qty }] для всех товаров в корзине. */
export function getEntries() {
  return Object.entries(items).map(([sku, qty]) => ({ sku, qty }));
}

export function getTotalItemsCount() {
  return Object.values(items).reduce((sum, qty) => sum + qty, 0);
}

/**
 * Считает сумму корзины по актуальному каталогу товаров
 * (products - массив из api.fetchCatalog()).
 */
export function getTotalPrice(products) {
  const bySku = indexBySku(products);
  return getEntries().reduce((sum, { sku, qty }) => {
    const product = bySku[sku];
    return product ? sum + product.price * qty : sum;
  }, 0);
}

function indexBySku(products) {
  const map = {};
  products.forEach(p => { map[p.sku] = p; });
  return map;
}

function getState() {
  return { items: { ...items } };
}
