import { calcItemRevenue } from '../logic/itemUtils'

const KEYS = {
  TODAY: 'mos_today',         // "current working" items (concept: active day, not literally "today")
  FAVORITES: 'mos_favorites',
  KNOWN_ITEMS: 'mos_known_items',
  LAST_DATE: 'mos_last_date',
  HISTORY: 'mos_history',
  MIGRATION_V1: 'mos_migration_v1', // flag: one-time legacy data migration completed
  // Legacy keys — only read inside runOnceMigration(), cleared afterward
  LEGACY_YESTERDAY: 'mos_yesterday',
  LEGACY_DAY_BEFORE: 'mos_daybefore',
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Daily items (current working day) ---

export function getTodayItems() {
  return read(KEYS.TODAY) ?? []
}

export function setTodayItems(items) {
  write(KEYS.TODAY, items)
}

// --- Daily history (permanent; append-only) ---

function calcItemRemaining(item) {
  if (item.type === 'drink') {
    return item.stock - ((item.comboSold ?? 0) + (item.aLaCarteSold ?? 0))
  }
  return item.stock - (item.sold ?? 0)
}

function buildDailySummary(items, dateStr) {
  const summaryItems = items.map(item => {
    const remaining = calcItemRemaining(item)
    const revenue = calcItemRevenue(item)
    if (item.type === 'drink') {
      return {
        name: item.name, type: 'drink', stock: item.stock,
        comboPrice: item.comboPrice ?? null,
        aLaCartePrice: item.aLaCartePrice ?? null,
        comboSold: item.comboSold ?? 0,
        aLaCarteSold: item.aLaCarteSold ?? 0,
        remaining, revenue,
        soldOutOrder: item.soldOutOrder ?? null,
      }
    }
    return {
      name: item.name, type: 'regular', stock: item.stock,
      price: item.price ?? 0,
      sold: item.sold ?? 0,
      remaining, revenue,
      soldOutOrder: item.soldOutOrder ?? null,
    }
  })
  return {
    date: dateStr,
    totalRevenue: summaryItems.reduce((s, it) => s + it.revenue, 0),
    items: summaryItems,
  }
}

export function getDailyHistory() {
  return read(KEYS.HISTORY) ?? []
}

export function appendDailyHistory(entry) {
  const history = getDailyHistory()
  history.push(entry)
  write(KEYS.HISTORY, history)
}

// Merges new entries into history. Dates are used as the unique key.
// Returns { added, skipped, overwritten }.
export function importHistoryEntries(entries, overwriteDuplicates) {
  const history = getDailyHistory()
  const dateMap = {}
  for (const e of history) dateMap[e.date] = e

  let added = 0, skipped = 0, overwritten = 0
  for (const entry of entries) {
    if (dateMap[entry.date] !== undefined) {
      if (overwriteDuplicates) { dateMap[entry.date] = entry; overwritten++ }
      else skipped++
    } else {
      dateMap[entry.date] = entry
      added++
    }
  }

  const merged = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  write(KEYS.HISTORY, merged)
  return { added, skipped, overwritten }
}

// Export today's date string for UI date comparisons.
export function getTodayString() {
  return todayString()
}

// Read items for any date.
// Today → mos_today (full item objects with real ids).
// Other date → find in dailyHistory (add synthetic ids for React key compat); [] if not found.
export function getItemsForDate(dateStr) {
  if (dateStr === todayString()) return getTodayItems()
  const history = getDailyHistory()
  const entry = history.find(e => e.date === dateStr)
  if (!entry) return []
  return (entry.items ?? []).map((item, i) => ({ ...item, id: `hist-${dateStr}-${i}` }))
}

// Write items for any date and persist immediately.
// Today → mos_today.  Other date → upsert into dailyHistory with recalculated revenue.
export function setItemsForDate(dateStr, items) {
  if (dateStr === todayString()) {
    setTodayItems(items)
    return
  }
  const summary = buildDailySummary(items, dateStr)
  const history = getDailyHistory()
  const idx = history.findIndex(e => e.date === dateStr)
  if (idx >= 0) {
    history[idx] = summary
  } else {
    history.push(summary)
    history.sort((a, b) => a.date.localeCompare(b.date))
  }
  write(KEYS.HISTORY, history)
}

// --- Favorites (independent of daily rotation) ---

export function getFavorites() {
  return read(KEYS.FAVORITES) ?? []
}

export function setFavorites(items) {
  write(KEYS.FAVORITES, items)
}

// --- Known items (auto-remembered; every item ever added, independent of Favorites) ---

export function getKnownItems() {
  return read(KEYS.KNOWN_ITEMS) ?? []
}

// name 相同就更新既有記錄（保持「最近一次」的類型與價格），否則新增一筆。
// 只存 name / type / price(s)，不存備貨量。
export function upsertKnownItem(entry) {
  const items = getKnownItems()
  const idx = items.findIndex(i => i.name === entry.name)
  if (idx >= 0) items[idx] = { ...items[idx], ...entry }
  else items.push(entry)
  write(KEYS.KNOWN_ITEMS, items)
}

// --- Default favorites (seeded on first launch if storage is empty) ---

const DEFAULT_FAVORITES = [
  { id: 'def-01', type: 'regular', name: '法式豬排三明治', defaultStock: 16, defaultPrice: 40 },
  { id: 'def-02', type: 'regular', name: '法式蝦排三明治', defaultStock: 16, defaultPrice: 50 },
  { id: 'def-03', type: 'regular', name: '元氣牛肉堡',     defaultStock: 6,  defaultPrice: 65 },
  { id: 'def-04', type: 'regular', name: '海洋珍珠堡',     defaultStock: 5,  defaultPrice: 85 },
  { id: 'def-05', type: 'regular', name: '蝦堡',           defaultStock: 2,  defaultPrice: 80 },
  { id: 'def-06', type: 'regular', name: '塔魚堡',         defaultStock: 2,  defaultPrice: 70 },
  { id: 'def-07', type: 'regular', name: '歐姆堡',         defaultStock: 4,  defaultPrice: 45 },
  { id: 'def-08', type: 'regular', name: '番茄堡',         defaultStock: 4,  defaultPrice: 45 },
  { id: 'def-09', type: 'drink',   name: '紅茶(有糖)',     defaultStock: 16, defaultComboPrice: 25, defaultALaCartePrice: 40 },
  { id: 'def-10', type: 'drink',   name: '紅茶(無糖)',     defaultStock: 4,  defaultComboPrice: 25, defaultALaCartePrice: 40 },
  { id: 'def-11', type: 'drink',   name: '奶茶',           defaultStock: 4,  defaultComboPrice: 45, defaultALaCartePrice: 60 },
  { id: 'def-12', type: 'drink',   name: '咖啡(冰)',       defaultStock: 4,  defaultComboPrice: 35, defaultALaCartePrice: 50 },
  { id: 'def-13', type: 'drink',   name: '咖啡(熱)',       defaultStock: 4,  defaultComboPrice: 35, defaultALaCartePrice: 50 },
  { id: 'def-14', type: 'drink',   name: '拿鐵',           defaultStock: 1,  defaultComboPrice: 55, defaultALaCartePrice: 70 },
  { id: 'def-15', type: 'drink',   name: '豆奶(有糖)',     defaultStock: 2,  defaultComboPrice: 35, defaultALaCartePrice: 35 },
  { id: 'def-16', type: 'drink',   name: '豆奶(無糖)',     defaultStock: 2,  defaultComboPrice: 35, defaultALaCartePrice: 35 },
  { id: 'def-17', type: 'drink',   name: '鮮奶',           defaultStock: 6,  defaultComboPrice: 35, defaultALaCartePrice: 35 },
  { id: 'def-18', type: 'drink',   name: '果汁',           defaultStock: 4,  defaultComboPrice: 35, defaultALaCartePrice: 35 },
]

// Seeds default favorites on first launch only (won't overwrite user edits).
export function initDefaults() {
  if (read(KEYS.FAVORITES) !== null) return
  write(KEYS.FAVORITES, DEFAULT_FAVORITES)
}

// Computes a date string offset by `days` from a base YYYY-MM-DD string.
function offsetDateString(baseStr, days) {
  const d = new Date(baseStr + 'T12:00:00') // noon avoids DST edge cases
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// One-time migration: converts legacy mos_yesterday / mos_daybefore into dailyHistory
// entries, then clears those keys. Safe to call on every startup — skips if already done.
// Must be called BEFORE checkAndRotate so LAST_DATE still reflects the previous session.
export function runOnceMigration() {
  if (read(KEYS.MIGRATION_V1)) return

  const lastDate = read(KEYS.LAST_DATE)

  if (lastDate !== null) {
    const legacyYesterday = read(KEYS.LEGACY_YESTERDAY) ?? []
    const legacyDayBefore = read(KEYS.LEGACY_DAY_BEFORE) ?? []
    const toMigrate = []

    if (legacyYesterday.length > 0) {
      toMigrate.push(buildDailySummary(legacyYesterday, offsetDateString(lastDate, -1)))
    }
    if (legacyDayBefore.length > 0) {
      toMigrate.push(buildDailySummary(legacyDayBefore, offsetDateString(lastDate, -2)))
    }

    // importHistoryEntries with overwriteDuplicates=false: existing dates are skipped.
    if (toMigrate.length > 0) {
      importHistoryEntries(toMigrate, false)
    }
  }

  // Remove old keys regardless of whether there was data.
  localStorage.removeItem(KEYS.LEGACY_YESTERDAY)
  localStorage.removeItem(KEYS.LEGACY_DAY_BEFORE)

  write(KEYS.MIGRATION_V1, true)
}

// --- Day rotation ---
// Call once on app startup (after runOnceMigration). Returns true if rotation happened.
export function checkAndRotate() {
  const today = todayString()
  const lastDate = read(KEYS.LAST_DATE)

  if (lastDate === today) return false

  // lastDate is null means first launch — just stamp the date, no rotation.
  if (lastDate !== null) {
    const currentItems = getTodayItems()
    if (currentItems.length > 0) {
      appendDailyHistory(buildDailySummary(currentItems, lastDate))
    }
    setTodayItems([])
  }

  write(KEYS.LAST_DATE, today)
  return lastDate !== null
}
