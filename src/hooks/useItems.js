import { useState, useEffect } from 'react'
import {
  getItemsForDate, setItemsForDate,
  getFavorites,
  getTodayString,
  runOnceMigration,
  checkAndRotate,
  initDefaults,
  upsertKnownItem,
} from '../services/storage'
import {
  createRegularItem, createDrinkItem,
  editItem, deleteItem, adjustSold,
  calcRemaining,
  favoritesToItems,
} from '../logic/itemUtils'

export function useItems(selectedDate) {
  const [, ] = useState(() => {
    initDefaults()
    runOnceMigration()
    checkAndRotate()
    return null
  })

  const [items, setItems] = useState(() => getItemsForDate(selectedDate))

  // Reload items whenever the selected date changes.
  useEffect(() => {
    setItems(getItemsForDate(selectedDate))
  }, [selectedDate])

  function persist(newItems) {
    setItemsForDate(selectedDate, newItems)
    setItems(newItems)
  }

  function addRegular(name, stock, price) {
    persist([...items, createRegularItem(name, stock, price)])
    upsertKnownItem({ name, type: 'regular', price: Number(price) })
  }

  function addDrink(name, stock, comboPrice, aLaCartePrice) {
    persist([...items, createDrinkItem(name, stock, comboPrice, aLaCartePrice)])
    upsertKnownItem({
      name, type: 'drink',
      comboPrice: comboPrice != null ? Number(comboPrice) : null,
      aLaCartePrice: aLaCartePrice != null ? Number(aLaCartePrice) : null,
    })
  }

  function edit(id, changes) {
    persist(editItem(items, id, changes))
    if ('price' in changes || 'comboPrice' in changes || 'aLaCartePrice' in changes) {
      const item = items.find(i => i.id === id)
      const name = changes.name ?? item?.name
      if (name) {
        upsertKnownItem(
          item?.type === 'drink'
            ? {
                name, type: 'drink',
                comboPrice: 'comboPrice' in changes ? changes.comboPrice : (item?.comboPrice ?? null),
                aLaCartePrice: 'aLaCartePrice' in changes ? changes.aLaCartePrice : (item?.aLaCartePrice ?? null),
              }
            : { name, type: 'regular', price: 'price' in changes ? changes.price : (item?.price ?? 0) }
        )
      }
    }
  }

  function remove(id) {
    persist(deleteItem(items, id))
  }

  function incSold(id, field = 'sold') {
    persist(adjustSold(items, id, field, +1))
  }

  function decSold(id, field = 'sold') {
    persist(adjustSold(items, id, field, -1))
  }

  function applyFavorites() {
    persist([...items, ...favoritesToItems(getFavorites())])
  }

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
        const comboPrice = row.comboPrice !== '' ? Number(row.comboPrice) : null
        const aLaCartePrice = row.showSecondPrice && row.aLaCartePrice !== '' ? Number(row.aLaCartePrice) : null
        next.push(createDrinkItem(name, qty, comboPrice, aLaCartePrice))
        upsertKnownItem({ name, type: 'drink', comboPrice, aLaCartePrice })
      } else {
        const price = row.price !== '' ? Number(row.price) : 0
        next.push(createRegularItem(name, qty, price))
        upsertKnownItem({ name, type: 'regular', price })
      }
    }
    persist(next)
  }

  return { items, calcRemaining, addRegular, addDrink, edit, remove, incSold, decSold, applyFavorites, bulkApplyParsed }
}
