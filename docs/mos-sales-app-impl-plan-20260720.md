# 實作規劃：歷史品項快選 + 銷售分析強化（2026/07/20）

> 交給 Claude Code CLI 實作前的技術規格。基於實際 clone 下來的 repo（sydney052007/mos-sales-app）程式碼撰寫，路徑與函式名稱均對照現有原始碼。

## 背景 / 現況盤點

專案裡已經有一套「常用品項」（Favorites）系統：
- `src/hooks/useFavorites.js`：CRUD，存在 `mos_favorites` key
- `src/components/FavoritesTab.jsx`：「常用品項」頁籤，手動維護範本（目前 18 筆預設，見 `src/services/storage.js` 的 `DEFAULT_FAVORITES`）
- `src/components/ItemsTab.jsx` 的「套用常用品項」按鈕：一次套用**全部**常用品項
- `src/components/QuickCreateModal.jsx` 的 `PreviewRow.handleFavSelect`：文字快速建立流程裡，每一列可以單獨從常用品項選一個帶入

**缺口**：`ItemsTab.jsx` 的單筆「＋ 新增品項」表單（`AddItemForm`）沒有「選一個常用品項帶入」的功能，只能整批套用或手動輸入。

`AnalyticsTab.jsx` 裡已經有 `computeStockSuggestions(history)`，依星期幾算平均已售數量、>=2 筆資料才顯示建議值 —— 這個邏輯要重用在新增品項表單上。

---

## 方向 6：新增品項自動記憶（不限常用品項）+ 智慧備貨量（v2，2026/07/20 修訂）

> 修訂原因：原本規劃只從常用品項（Favorites）挑選，但使用者希望「凡是新增過的品項都自動記得」，不限於手動維護的常用品項清單。改為新增一個獨立、自動維護的「曾用過品項」清單。

### 資料層

新增一個新的 localStorage key，跟 Favorites 分開、不需要使用者手動維護：

`src/services/storage.js`
```js
const KEYS = {
  // ...既有 keys
  KNOWN_ITEMS: 'mos_known_items',
}

export function getKnownItems() {
  return read(KEYS.KNOWN_ITEMS) ?? []
}

// name 相同就更新既有記錄（保持「最近一次」的類型與價格），否則新增一筆。
// 只存 name / type / price(s)，不存備貨量 —— 備貨量一律不從這裡帶。
export function upsertKnownItem(entry) {
  const items = getKnownItems()
  const idx = items.findIndex(i => i.name === entry.name)
  if (idx >= 0) items[idx] = { ...items[idx], ...entry }
  else items.push(entry)
  write(KEYS.KNOWN_ITEMS, items)
}
```

entry 格式：
- 一般品項：`{ name, type: 'regular', price }`
- 飲料：`{ name, type: 'drink', comboPrice, aLaCartePrice }`

### 邏輯層

**新增共用工具** `src/logic/stockSuggestion.js`：
```js
// 從 AnalyticsTab.jsx 的 computeStockSuggestions 抽出可重用版本
// 回傳 { suggestion, count } 或 null（資料不足 < minCount）
export function suggestStockForItem(history, itemName, dow, minCount = 2) {
  let count = 0, totalSold = 0
  for (const entry of history) {
    const d = parseDateDow(entry.date) // 需要一份跟 AnalyticsTab 一樣的 parseDate+getDay 邏輯
    if (d !== dow) continue
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
```
`AnalyticsTab.jsx` 的 `computeStockSuggestions` 可保留原樣，不用強制重構成呼叫這支，避免不必要的改動風險。

**每個新增品項的入口都要順手記錄進 KnownItems**（這是「自動記憶」的核心，不管品項是不是從選單挑的，手打的新名字也要記）：
- `src/hooks/useItems.js`
  - `addRegular(name, stock, price)`：`persist(...)` 之後呼叫 `upsertKnownItem({ name, type: 'regular', price })`
  - `addDrink(name, stock, comboPrice, aLaCartePrice)`：同樣呼叫 `upsertKnownItem({ name, type: 'drink', comboPrice, aLaCartePrice })`
  - `edit(id, changes)`：若 `changes` 包含價格欄位，順便呼叫 `upsertKnownItem` 更新該品項的「最近一次價格」
  - `bulkApplyParsed(rows, conflictMode)`：迴圈裡每建立一筆也呼叫 `upsertKnownItem`
- `src/hooks/useFavorites.js`
  - `addRegular` / `addDrink`：也呼叫一次 `upsertKnownItem`，確保常用品項一定同時存在於 KnownItems（雖然 UI 合併時本來就會涵蓋，這裡是保險，避免兩份資料在極端情況下不同步）

### UI 層

`src/components/ItemsTab.jsx` 的 `AddItemForm`：
- `ItemsTab` 把 `getFavorites()`、`getKnownItems()`、`selectedDate` 傳給 `AddItemForm`。
- 下拉選單改成兩個 `<optgroup>`：
  - 「⭐ 常用品項」：來自 Favorites
  - 「🕘 其他曾用過的品項」：來自 KnownItems，**排除掉名稱已經在 Favorites 裡的項目**（避免重複顯示）
- 選定後帶入 `type`／`name`／`price` 或 `comboPrice`+`aLaCartePrice`+`showSecondPrice`。
- **備貨量規則（簡化版，只看一個條件）**：
  ```js
  if (isFavorite) {
    stock = favorite.defaultStock
  } else {
    const sug = suggestStockForItem(getDailyHistory(), name, dowOf(selectedDate))
    stock = sug ? String(sug.suggestion) : ''  // 智慧建議也沒有就留空，讓使用者自己填
  }
  ```
  選到常用品項一律用常用品項的預設備貨量；選到「其他曾用過的品項」才用星期幾智慧建議，建議也沒有資料時保持空白，不硬塞不準的數字。
- 帶入後的 `stock` 欄位維持可編輯。

`src/components/QuickCreateModal.jsx` 的 `PreviewRow.handleFavSelect` 一併升級成同樣的兩群選單邏輯（`favorites` prop 改傳合併後的清單，或另外多傳一個 `knownItems` prop），維持跟單筆新增表單一致的行為，避免兩個新增流程一個有自動記憶、一個沒有。

### 驗收項目
- 手動打一個全新名稱、從沒出現過的品項並送出，之後重新打開新增表單，這個名稱要出現在「🕘 其他曾用過的品項」裡。
- 同一個品項名稱第二次被加入時（不管是手打還是選單挑的），KnownItems 裡的價格要更新成最新一次輸入的值。
- 常用品項清單為空、KnownItems 也是空的時候，下拉選單顯示但兩個 optgroup 都是空的，不噴錯。
- 選擇飲料類常用品項時，套餐價/單點價欄位正確依 `defaultComboPrice`/`defaultALaCartePrice` 是否都有值來決定要不要展開第二欄位。
- 選到「其他曾用過的品項」且該星期幾資料 <2 筆時，備貨量欄位留空，不顯示「資料不足」之類的文字，也不要塞 0（比照方向5「資料不足就不顯示」的原則）。

---

## 方向 7：記錄品項賣完順序 + 分析頁強化

### 已知限制（先跟你對齊過的部分）
`type` 只有 `regular`/`drink` 兩種，三明治跟漢堡目前都是 `regular`，賣完順序会以 `type` 分組（跟飲料分開，三明治漢堡先混一組），不做新的子分類欄位。

### 資料層

在 item 物件加一個欄位：`soldOutOrder: number | null`。

- `src/logic/itemUtils.js`
  - `createRegularItem` / `createDrinkItem`：初始化加上 `soldOutOrder: null`
  - 新增 `syncSoldOutOrder(items, id)`：
    ```js
    function syncSoldOutOrder(items, id) {
      return items.map(item => {
        if (item.id !== id) return item
        const remaining = calcRemaining(item)
        if (remaining <= 0) {
          if (item.soldOutOrder != null) return item // 已經有順序號，不覆蓋
          const sameType = items.filter(i => i.type === item.type && i.soldOutOrder != null)
          const nextOrder = sameType.length > 0
            ? Math.max(...sameType.map(i => i.soldOutOrder)) + 1
            : 1
          return { ...item, soldOutOrder: nextOrder }
        }
        // 剩餘 > 0（例如編輯調高備貨、或 -1 按鈕誤觸復原）：清掉舊順序號
        return item.soldOutOrder != null ? { ...item, soldOutOrder: null } : item
      })
    }
    ```
  - `adjustSold(items, id, field, delta)`：計算完 `next` 陣列後，改成 `return syncSoldOutOrder(next, id)`
  - `editItem(items, id, changes)`：套用 `changes` 後，改成 `return syncSoldOutOrder(next, id)`（涵蓋直接把 `stock` 編輯到等於已售數量、讓剩餘變 0 的情境）

- `src/services/storage.js`
  - `buildDailySummary(items, dateStr)`：`summaryItems` 的 map 裡，`regular`/`drink` 兩個分支都加上 `soldOutOrder: item.soldOutOrder ?? null`

- 舊資料（既有 32 天匯入資料、換日前產生的 dailyHistory）不會有這個欄位 → 視為 `null`，分析時自然排除，**不用寫遷移腳本**。

### 分析層（`src/components/AnalyticsTab.jsx`）

新增 `computeSoldOutRanking(history)`：
```js
function computeSoldOutRanking(history) {
  const map = {}
  for (const entry of history) {
    for (const item of entry.items) {
      if (item.soldOutOrder == null) continue
      if (!map[item.name]) map[item.name] = { name: item.name, type: item.type, orders: [] }
      map[item.name].orders.push(item.soldOutOrder)
    }
  }
  return Object.values(map)
    .map(r => ({ ...r, avgOrder: r.orders.reduce((s, v) => s + v, 0) / r.orders.length, count: r.orders.length }))
    .sort((a, b) => a.avgOrder - b.avgOrder) // 數字越小 = 越快賣完
}
```

新增 Section 元件 `SoldOutSpeed`（比照 `StockSuggestion` 的星期幾切換 UI），呈現兩層：

1. **整體「最快賣完排行」**：不分星期幾，`computeSoldOutRanking` 直接排序取前 N 名，顯示格式類似「元氣牛肉堡 平均第 1.2 個賣完（18 天有記錄）」。數字越小代表越常最先被搶光；沒賣完的天數不計入平均，樣本數誠實顯示在括號裡。
2. **依星期幾切換的細分排行**：比照 `StockSuggestion` 的星期幾 tab，同樣套用「該星期幾 >= 2 筆資料才顯示」門檻，顯示該星期幾的平均賣完名次排行。這層用來回答「這個品項星期幾通常排第幾個賣完，特定星期幾是不是明顯更前面」。

**一般品項跟飲料分開兩個列表呈現**（各自獨立跑 `computeSoldOutRanking`，用 `item.type` 過濾），因為兩組的「賣完名次」量級不能直接比較——同樣是「第 1 個賣完」，一般品項可能在跟 15 種互相競爭，飲料可能只跟 8 種競爭，代表的搶手程度不一樣，混在一起排序會失真。

掛進 `AnalyticsTab` 的 render，建議放在 `StockVsSales` 之後、`DayOfWeekEffect` 之前（銷售排行 → 賣完速度 → 備貨vs銷售 → 星期幾效應 → 備貨建議），因為賣完速度排行的結論可以直接接到「備貨 vs 實際銷售」互相對照：賣完名次很前面 + 售罄率也一直很高 → 持續供不應求，備貨可能要往上調；賣完名次落後、售罄率也低 → 備貨大概是夠的甚至過量。順序可依你喜好調整。

### 驗收項目
- 按 −1／+1 把剩餘壓到 0 時，該品項立刻拿到當天同 type 分組下一個順序號；同一分組已有品項賣完時號碼要接續，不重複。
- 用編輯表單把備貨量調低到等於已售數量（剩餘變 0）也要觸發賦值；調回讓剩餘 > 0 時順序號要清掉。
- 「文字快速建立品項」「套用常用品項」新建立的品項一開始 `soldOutOrder` 是 `null`，正常。
- 手動貼 JSON 匯入歷史資料（沒有 `soldOutOrder` 欄位）不會讓分析頁面報錯或崩潰。
- 分析頁「賣完速度排行」在完全沒有任何 `soldOutOrder` 資料時（功能剛上線那幾天）要顯示合理的空狀態，不要顯示崩潰或 NaN。

---

## 兩個方向都要做的收尾
- `docs/spec.md`／`PROGRESS.md`（repo 裡的，對應 Notion 提到的 CLAUDE.md/PROGRESS.md/spec.md 落後問題）：實作完成後一併更新，反映方向 6、7 的完成狀態。
- 打包 APK、裝機驗證（這步驟本機 Claude Code CLI 執行，這份規劃文件涵蓋不到）。

## 未來可延伸（這次不做，先記著）
- 若三明治/漢堡混在同一 type 分組的雜訊真的影響判斷，之後可以加子分類欄位重新拆分賣完順序統計。
- KnownItems 目前只存名稱/類型/價格，若之後想做更聰明的備貨預設（例如記住「最近一次備貨量」），可以再擴充欄位，但這次刻意不做，避免跟智慧建議的角色重疊混淆。
