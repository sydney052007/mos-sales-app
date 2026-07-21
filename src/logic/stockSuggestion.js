// Shared util for suggesting a stock quantity for one item on a given day-of-week,
// based on daily history. Same DOW-averaging idea as AnalyticsTab's computeStockSuggestions,
// but scoped to a single item so it can be called from the add-item form.

function parseDateDow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

// Returns { suggestion, count } or null if fewer than minCount matching-DOW appearances.
export function suggestStockForItem(history, itemName, dow, minCount = 2) {
  let count = 0, totalSold = 0
  for (const entry of history) {
    if (parseDateDow(entry.date) !== dow) continue
    const item = entry.items.find(i => i.name === itemName)
    if (!item) continue
    count++
    totalSold += item.type === 'drink'
      ? (item.comboSold ?? 0) + (item.aLaCarteSold ?? 0)
      : (item.sold ?? 0)
  }
  if (count < minCount) return null
  return { suggestion: Math.round(totalSold / count), count }
}
