import { useState } from 'react'
import { getFavorites, setFavorites, generateId, upsertKnownItem } from '../services/storage'

export function useFavorites() {
  const [favorites, setLocal] = useState(() => getFavorites())

  function persist(next) {
    setFavorites(next)
    setLocal(next)
  }

  function addRegular(name, defaultStock, defaultPrice) {
    persist([...favorites, {
      id: generateId(),
      type: 'regular',
      name,
      defaultStock: Number(defaultStock),
      defaultPrice: Number(defaultPrice),
    }])
    upsertKnownItem({ name, type: 'regular', price: Number(defaultPrice) })
  }

  function addDrink(name, defaultStock, defaultComboPrice, defaultALaCartePrice) {
    const comboPrice = defaultComboPrice != null ? Number(defaultComboPrice) : null
    const aLaCartePrice = defaultALaCartePrice != null ? Number(defaultALaCartePrice) : null
    persist([...favorites, {
      id: generateId(),
      type: 'drink',
      name,
      defaultStock: Number(defaultStock),
      defaultComboPrice: comboPrice,
      defaultALaCartePrice: aLaCartePrice,
    }])
    upsertKnownItem({ name, type: 'drink', comboPrice, aLaCartePrice })
  }

  function edit(id, changes) {
    persist(favorites.map(f => f.id === id ? { ...f, ...changes } : f))
  }

  function remove(id) {
    persist(favorites.filter(f => f.id !== id))
  }

  return { favorites, addRegular, addDrink, edit, remove }
}
