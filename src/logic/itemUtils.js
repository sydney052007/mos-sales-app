import { generateId } from '../services/storage'

// --- Creators ---

export function createRegularItem(name, stock, price) {
  return {
    id: generateId(),
    type: 'regular',
    name,
    stock: Number(stock),
    price: Number(price),
    sold: 0,
  }
}

export function createDrinkItem(name, stock, comboPrice, aLaCartePrice) {
  return {
    id: generateId(),
    type: 'drink',
    name,
    stock: Number(stock),
    comboPrice: comboPrice != null ? Number(comboPrice) : null,
    aLaCartePrice: aLaCartePrice != null ? Number(aLaCartePrice) : null,
    comboSold: 0,
    aLaCarteSold: 0,
  }
}

// --- Immutable array operations ---

export function editItem(items, id, changes) {
  return items.map(item => (item.id === id ? { ...item, ...changes } : item))
}

export function deleteItem(items, id) {
  return items.filter(item => item.id !== id)
}

// field: 'sold' for regular | 'comboSold' | 'aLaCarteSold' for drinks
// Clamps to 0 on the low end; no upper-bound enforcement (user manages stock).
export function adjustSold(items, id, field, delta) {
  return items.map(item => {
    if (item.id !== id) return item
    const next = Math.max(0, (item[field] ?? 0) + delta)
    return { ...item, [field]: next }
  })
}

// --- Derived values ---

export function calcRemaining(item) {
  if (item.type === 'drink') {
    return item.stock - ((item.comboSold ?? 0) + (item.aLaCarteSold ?? 0))
  }
  return item.stock - (item.sold ?? 0)
}

// --- Favorites → Today items ---
// Copies templates into daily items: sold counts zeroed, defaults applied.
export function favoritesToItems(favorites) {
  return favorites.map(fav => {
    if (fav.type === 'drink') {
      return createDrinkItem(
        fav.name,
        fav.defaultStock ?? 0,
        fav.defaultComboPrice ?? null,
        fav.defaultALaCartePrice ?? null,
      )
    }
    return createRegularItem(fav.name, fav.defaultStock ?? 0, fav.defaultPrice ?? 0)
  })
}
