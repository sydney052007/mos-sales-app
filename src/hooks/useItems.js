import { useState, useEffect } from 'react'
import {
  getItemsForDate, setItemsForDate,
  getFavorites,
  getTodayString,
  runOnceMigration,
  checkAndRotate,
  initDefaults,
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
        next.push(createDrinkItem(
          name, qty,
          row.comboPrice !== '' ? Number(row.comboPrice) : null,
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
