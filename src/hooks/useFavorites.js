import { useState } from 'react'
import { getFavorites, setFavorites, generateId } from '../services/storage'

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
  }

  function addDrink(name, defaultStock, defaultComboPrice, defaultALaCartePrice) {
    persist([...favorites, {
      id: generateId(),
      type: 'drink',
      name,
      defaultStock: Number(defaultStock),
      defaultComboPrice: defaultComboPrice != null ? Number(defaultComboPrice) : null,
      defaultALaCartePrice: defaultALaCartePrice != null ? Number(defaultALaCartePrice) : null,
    }])
  }

  function edit(id, changes) {
    persist(favorites.map(f => f.id === id ? { ...f, ...changes } : f))
  }

  function remove(id) {
    persist(favorites.filter(f => f.id !== id))
  }

  return { favorites, addRegular, addDrink, edit, remove }
}
