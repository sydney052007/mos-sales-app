// Pure parsing + fuzzy-matching logic for quick-create-from-text feature.
// No React dependencies; all functions are side-effect-free.

// ── Normalization ─────────────────────────────────────────────────────────────

function normalize(s) {
  return s
    .replace(/[\s\(\)（）]/g, '')
    .replace(/蕃/g, '番')   // variant character
    .replace(/台/g, '臺')
    .toLowerCase()
}

// ── Fuzzy match ───────────────────────────────────────────────────────────────
// Returns the best-matching favorite, or null if score is below threshold.

export function fuzzyMatch(query, favorites) {
  const q = normalize(query)
  if (!q || !favorites.length) return null

  let best = null
  let bestScore = -1

  for (const fav of favorites) {
    const f = normalize(fav.name)
    let score = 0

    if (f === q) {
      score = 2                              // exact match
    } else if (f.includes(q)) {
      // candidate contains query — prefer shorter candidate (more specific hit)
      score = q.length / f.length + 0.3
    } else if (q.includes(f)) {
      // query contains candidate
      score = f.length / q.length
    } else {
      // character overlap fallback
      const fChars = new Set(f)
      let common = 0
      for (const c of q) if (fChars.has(c)) common++
      score = q.length > 0 ? (common / q.length) * 0.4 : 0
    }

    if (score > bestScore) {
      bestScore = score
      best = fav
    }
  }

  return bestScore >= 0.4 ? best : null
}

// ── Per-line parser ───────────────────────────────────────────────────────────
// Returns an array of { parsedName, qty } objects, or [] to skip the line.

function parseLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return []

  // Strip at most one leading dash (bullet-point style "- item")
  const stripped = trimmed.startsWith('-') ? trimmed.slice(1).trim() : trimmed
  if (!stripped) return []

  // No digit anywhere → category header or free-text → skip
  if (!/\d/.test(stripped)) return []

  // Pattern 1: Combo "名稱A+B（L1/L2）"
  // e.g. "紅茶16+4（有糖/無糖）" → [{紅茶有糖, 16}, {紅茶無糖, 4}]
  const comboM = stripped.match(/^(.+?)(\d+)\+(\d+)[（(]([^/）)]+)\/([^/）)]+)[）)]/)
  if (comboM) {
    const [, base, n1, n2, l1, l2] = comboM
    return [
      { parsedName: base.trim() + l1.trim(), qty: Number(n1) },
      { parsedName: base.trim() + l2.trim(), qty: Number(n2) },
    ]
  }

  // Pattern 2: Multi-slash "A/B/C-n1/n2/n3"
  // e.g. "有糖豆奶/無糖豆奶/鮮奶-2/2/6" → three items
  const multiM = stripped.match(/^([^-\d]+(?:\/[^-\d]+)+)-(\d+(?:\/\d+)+)$/)
  if (multiM) {
    const names = multiM[1].split('/')
    const qtys  = multiM[2].split('/').map(Number)
    if (names.length === qtys.length) {
      return names.map((n, i) => ({ parsedName: n.trim(), qty: qtys[i] }))
    }
  }

  // Pattern 3: Range with dash "名稱-n1～n2" or "名稱-n1~n2"
  // e.g. "果汁-2～4" → {果汁, 2}
  const rangeDashM = stripped.match(/^(.+?)-(\d+)[~～]\d+/)
  if (rangeDashM) {
    return [{ parsedName: rangeDashM[1].trim(), qty: Number(rangeDashM[2]) }]
  }

  // Pattern 4: Range no dash "名稱n1～n2"
  // e.g. "奶茶4～6" → {奶茶, 4}
  const rangeM = stripped.match(/^(.+?)(\d+)[~～]\d+/)
  if (rangeM) {
    return [{ parsedName: rangeM[1].trim(), qty: Number(rangeM[2]) }]
  }

  // Pattern 5: Simple with dash "名稱-n"
  // e.g. "亞麻豬排-16"
  const simpleDashM = stripped.match(/^(.+?)-(\d+)/)
  if (simpleDashM) {
    return [{ parsedName: simpleDashM[1].trim(), qty: Number(simpleDashM[2]) }]
  }

  // Pattern 6: Embedded number "名稱n[suffix]"
  // e.g. "拿鐵1冰", "元氣4"
  const simpleM = stripped.match(/^([^\d]+)(\d+)/)
  if (simpleM) {
    return [{ parsedName: simpleM[1].trim(), qty: Number(simpleM[2]) }]
  }

  return []
}

// ── Full text parser ──────────────────────────────────────────────────────────
// Returns an array of editable preview-row objects ready for QuickCreateModal.

export function parseText(text, favorites) {
  const rows = []
  let id = 0

  for (const line of text.split('\n')) {
    for (const { parsedName, qty } of parseLine(line)) {
      const fav = fuzzyMatch(parsedName, favorites)

      rows.push({
        id: id++,
        originalLine: line.trim(),
        parsedName,

        // All fields are editable; pre-fill from matched favorite when available.
        type:           fav?.type ?? 'regular',
        name:           fav?.name ?? parsedName,
        qty:            String(qty),
        price:          fav?.defaultPrice          != null ? String(fav.defaultPrice)          : '',
        comboPrice:     fav?.defaultComboPrice     != null ? String(fav.defaultComboPrice)     : '',
        aLaCartePrice:  fav?.defaultALaCartePrice  != null ? String(fav.defaultALaCartePrice)  : '',
        showSecondPrice: fav?.type === 'drink' && fav?.defaultALaCartePrice != null,
        matched: fav !== null,
      })
    }
  }

  return rows
}
