import { useState } from 'react'
import {
  getTodayItems, setTodayItems,
  getFavorites,
  checkAndRotate,
  initDefaults,
} from '../services/storage'
import {
  createRegularItem, createDrinkItem,
  editItem, deleteItem, adjustSold,
  calcRemaining,
  favoritesToItems,
} from '../logic/itemUtils'

export function useToday() {
  // Lazy initializer: rotate first (if day changed), then read current today.
  // Running rotation here—synchronously before first render—ensures the hook
  // always returns post-rotation data without needing a separate useEffect.
  const [items, setItems] = useState(() => {
    initDefaults()
    checkAndRotate()
    return getTodayItems()
  })

  function persist(newItems) {
    setTodayItems(newItems)
    setItems(newItems)
  }

  function addRegular(name, stock, price) {
    persist([...items, createRegularItem(name, stock, price)])
  }

  function addDrink(name, stock, comboPrice, aLaCartePrice) {
    persist([...items, createDrinkItem(name, stock, comboPrice, aLaCartePrice)])
  }

  function edit(id, changes) {
    persist(editItem(items, id, changes))
  }

  function remove(id) {
    persist(deleteItem(items, id))
  }

  // field defaults to 'sold' for regular items.
  // For drinks pass 'comboSold' or 'aLaCarteSold'.
  function incSold(id, field = 'sold') {
    persist(adjustSold(items, id, field, +1))
  }

  function decSold(id, field = 'sold') {
    persist(adjustSold(items, id, field, -1))
  }

  // Appends all favorites (with sold zeroed) to today's list.
  function applyFavorites() {
    const favItems = favoritesToItems(getFavorites())
    persist([...items, ...favItems])
  }

  // Creates items from quick-create preview rows.
  // rows: editable row objects from QuickCreateModal
  // conflictMode: 'overwrite' | 'skip' — how to handle names already in today's list
  function bulkApplyParsed(rows, conflictMode) {
    const existingNames = new Set(items.map(i => i.name))
    let next = [...items]

    for (const row of rows) {
      const name = row.name.trim()
      const qty  = Number(row.qty)
      if (existingNames.has(name)) {
        if (conflictMode === 'skip') continue
        next = next.filter(i => i.name !== name)
      }
      if (row.type === 'drink') {
        next.push(createDrinkItem(
          name, qty,
          row.comboPrice    !== '' ? Number(row.comboPrice)    : null,
          row.showSecondPrice && row.aLaCartePrice !== '' ? Number(row.aLaCartePrice) : null,
        ))
      } else {
        next.push(createRegularItem(name, qty, row.price !== '' ? Number(row.price) : 0))
      }
    }

    persist(next)
  }

  return { items, calcRemaining, addRegular, addDrink, edit, remove, incSold, decSold, applyFavorites, bulkApplyParsed }
}
