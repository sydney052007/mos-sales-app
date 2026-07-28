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
    soldOutOrder: null,
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
    soldOutOrder: null,
  }
}

// --- Immutable array operations ---

// Assigns/clears soldOutOrder for the item at `id` based on its current remaining count.
// Sold-out order numbers are per-type (regular vs drink), assigned in the order items
// first hit zero remaining. Existing order numbers are never overwritten once set,
// only cleared if remaining goes back above 0.
function syncSoldOutOrder(items, id) {
  return items.map(item => {
    if (item.id !== id) return item
    const remaining = calcRemaining(item)
    if (remaining <= 0) {
      if (item.soldOutOrder != null) return item
      const sameType = items.filter(i => i.type === item.type && i.soldOutOrder != null)
      const nextOrder = sameType.length > 0
        ? Math.max(...sameType.map(i => i.soldOutOrder)) + 1
        : 1
      return { ...item, soldOutOrder: nextOrder }
    }
    return item.soldOutOrder != null ? { ...item, soldOutOrder: null } : item
  })
}

export function editItem(items, id, changes) {
  const next = items.map(item => (item.id === id ? { ...item, ...changes } : item))
  return syncSoldOutOrder(next, id)
}

export function deleteItem(items, id) {
  return items.filter(item => item.id !== id)
}

// field: 'sold' for regular | 'comboSold' | 'aLaCarteSold' for drinks
// Clamps to 0 on the low end; no upper-bound enforcement (user manages stock).
export function adjustSold(items, id, field, delta) {
  const next = items.map(item => {
    if (item.id !== id) return item
    const val = Math.max(0, (item[field] ?? 0) + delta)
    return { ...item, [field]: val }
  })
  return syncSoldOutOrder(next, id)
}

// --- Derived values ---

export function calcItemRevenue(item) {
  if (item.type === 'drink') {
    return ((item.comboPrice ?? 0) * (item.comboSold ?? 0)) +
           ((item.aLaCartePrice ?? 0) * (item.aLaCarteSold ?? 0))
  }
  return (item.price ?? 0) * (item.sold ?? 0)
}

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
