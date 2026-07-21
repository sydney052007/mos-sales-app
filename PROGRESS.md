# PROGRESS.md

給 Claude Code 用的進度 tracker。**每次開始工作前先讀這份**，了解目前
系統長什麼樣子；每完成一個可獨立驗證的小任務後更新對應項目。

規則見 `CLAUDE.md` 的「Tracker 使用規則」一節。

---

## 目前狀態總覽（截至 2026-07-21）

所有功能均已完成並手機驗證通過。備貨建議資料不足時改為隱藏（不顯示退回整體平均）已驗證。

方向 6（新增品項自動記憶 + 智慧備貨量）、方向 7（賣完順序記錄 + 分析強化）
程式碼已依 `docs/mos-sales-app-impl-plan-20260720.md` 實作完成，`npm run build`
通過，瀏覽器功能測試通過（headless Chromium 自動化 + 使用者用 Claude in
Chrome 手動測試），APK 已重新打包並實機安裝驗證通過（2026-07-21）。

這次安裝過程中發生一次 debug keystore 簽名不符事件（WSL 第一次建置時
Gradle 自動產生的新 debug keystore，跟手機上舊版簽名不同，導致無法直接
覆蓋安裝），已排查、備份手機端全部資料後解除安裝重裝、資料復原並逐位元組
驗證一致。完整過程與往後如何避免見下方「備註」的「keystore 一致性」小節。

| 模組 | 狀態 |
|------|------|
| 骨架 / Capacitor 初始化 | ✅ 完成 |
| localStorage 讀寫（含換日） | ✅ 完成（已重構，見第 1 批） |
| 品項業務邏輯純函式 | ✅ 完成 |
| 文字快速建立品項（textParser） | ✅ 完成 |
| 統一品項編輯頁（含日期選擇器） | ✅ 完成（第 2 批） |
| 管理常用品項範本 | ✅ 完成 |
| 分析頁籤（圖表/排行/備貨/星期效應） | ✅ 完成 |
| 手動匯入歷史資料 | ✅ 完成 |
| 分析頁點日期跳轉到編輯頁（第 3 批） | ✅ 完成（手機驗證通過，2026-07-15） |
| 系統列安全距離（safe-area-inset） | ✅ 完成（手機驗證通過，2026-07-15） |
| 備貨建議（分析頁，依星期幾分組） | ✅ 完成（手機驗證通過，2026-07-15） |
| 備貨建議調整（資料不足改隱藏） | ✅ 完成（手機驗證通過，2026-07-15） |
| APK 打包 + 安裝到 Samsung 手機 | ✅ 完成（3.97 MB，2026-07-15） |
| 方向 6：新增品項自動記憶 + 智慧備貨量 | ✅ 完成，實機驗證通過（2026-07-21） |
| 方向 7：賣完順序記錄 + 分析強化 | ✅ 完成，實機驗證通過（2026-07-21） |
| APK 重新打包（方向 6/7） | ✅ 完成（4.0 MB，2026-07-21，WSL 本機 Linux 工具鏈打包，見下方備註） |
| 實機安裝 + 資料復原 | ✅ 完成（2026-07-21，過程含一次 keystore 簽名事件，見下方備註） |

---

## App 整體架構現況（第 3 批完成後）

### 導覽結構

```
App.jsx
├── state: activeTab（'items' | 'analytics' | 'favorites'）
├── state: selectedDate（YYYY-MM-DD，初始為裝置今日）
├── fn: navigateToDate(dateStr) → 同時設 selectedDate + activeTab='items'
├── 頁籤列（點擊切換 activeTab）
├── <ItemsTab selectedDate onDateChange>   ← controlled，不持有自己的日期 state
├── <AnalyticsTab onNavigateToDate>        ← 點長條或日期清單觸發 navigateToDate
└── <FavoritesTab>
```

### 分析頁跳轉機制

- `RevenueTrend` 的 SVG 長條圖：每個長條的整列（barWidth 寬 × 全高）都是可點擊區域
  （透明 `<rect>` 鋪底），點擊後呼叫 `onNavigateToDate(date)`
- `RevenueTrend` 下方附有日期清單（最近 30 天，最新在前，含日期+總營收，
  max-height 180px 可捲動），提供手機手指點不準長條時的備用入口
- `ItemRanking`、`StockVsSales`、`DayOfWeekEffect` 均為跨多天彙總統計，不加跳轉

### 資料流

```
分析頁點日期
  → App.navigateToDate(dateStr)
    → setSelectedDate(dateStr)
    → setActiveTab('items')
      → ItemsTab 收到新 selectedDate prop
        → useItems(selectedDate) 的 useEffect 重讀該日 history 品項
          → 畫面立即顯示該天資料、可編輯
```

---

## 目前的 localStorage 結構

| key | 說明 |
|-----|------|
| `mos_today` | 當前操作中的品項陣列（裝置今日）；全欄位物件含 `id` |
| `mos_history` | 永久歷史記錄陣列，每筆 `{ date, totalRevenue, items[] }`；`items` 為精簡格式（無 id，有 remaining/revenue） |
| `mos_favorites` | 常用品項範本陣列，含 `defaultStock`/`defaultPrice`/`defaultComboPrice`/`defaultALaCartePrice` |
| `mos_known_items` | 曾用過品項陣列（自動維護，不需使用者手動管理），`{ name, type, price }` 或 `{ name, type, comboPrice, aLaCartePrice }`，同名以最近一次為準，不存備貨量 |
| `mos_last_date` | 上次 App 開啟的日期字串（`YYYY-MM-DD`），換日判斷用 |
| `mos_migration_v1` | `true` 表示一次性遷移已完成（舊制 yesterday/daybefore → history） |
| ~~`mos_yesterday`~~ | **廢棄**，首次啟動時遷移後刪除 |
| ~~`mos_daybefore`~~ | **廢棄**，首次啟動時遷移後刪除 |

---

## 目前的檔案結構

```
mos-sales-app/
├── src/
│   ├── services/
│   │   └── storage.js           # 所有 localStorage 讀寫
│   ├── logic/
│   │   ├── itemUtils.js         # 純函式：品項 CRUD / adjustSold / calcRemaining / favoritesToItems / syncSoldOutOrder
│   │   ├── textParser.js        # 文字快速建立品項的解析引擎與模糊比對
│   │   └── stockSuggestion.js   # suggestStockForItem：單一品項依星期幾算智慧備貨建議（新增品項表單用）
│   ├── hooks/
│   │   ├── useItems.js          # ★ 現役：日期感知品項操作 hook
│   │   ├── useFavorites.js      # 常用品項範本操作 hook
│   │   └── useToday.js          # 舊，App 不再 import，可刪除
│   ├── components/
│   │   ├── ItemsTab.jsx         # ★ 現役：受控日期（selectedDate/onDateChange props）
│   │   ├── AnalyticsTab.jsx     # 分析頁籤（含 onNavigateToDate 跳轉支援）
│   │   ├── FavoritesTab.jsx     # 常用品項範本管理頁籤
│   │   ├── QuickCreateModal.jsx # 文字快速建立品項 modal（多步驟）
│   │   ├── TodayTab.jsx         # 舊，App 不再 import，可刪除
│   │   ├── YesterdayTab.jsx     # 舊，App 不再 import，可刪除
│   │   ├── StorageTest.jsx      # 舊測試元件，可刪除
│   │   └── BusinessLogicTest.jsx # 舊測試元件，可刪除
│   ├── main.jsx
│   ├── App.jsx                  # 頁籤切換 + selectedDate 提升 + navigateToDate
│   └── index.css
├── docs/
│   ├── spec.md
│   └── build-guide.md           # 建置/安裝步驟說明
├── index.html
├── vite.config.js
├── capacitor.config.json
├── package.json
├── android/
├── CLAUDE.md
└── PROGRESS.md
```

---

## 關鍵函式 / 元件速查

### `src/services/storage.js`

| 函式 | 說明 |
|------|------|
| `getTodayString()` | 回傳裝置今日 `YYYY-MM-DD` |
| `getTodayItems()` / `setTodayItems(items)` | 讀寫 `mos_today` |
| `getItemsForDate(dateStr)` | 今日→`mos_today`；其他→從 history 找（加合成 id）；找不到→`[]` |
| `setItemsForDate(dateStr, items)` | 今日→`mos_today`；其他→upsert history（重算 totalRevenue，依 date 排序） |
| `getDailyHistory()` | 讀取完整 history 陣列 |
| `importHistoryEntries(entries, overwrite)` | 批次合併進 history，回傳 `{ added, skipped, overwritten }` |
| `getFavorites()` / `setFavorites(items)` | 讀寫常用品項範本 |
| `getKnownItems()` / `upsertKnownItem(entry)` | 讀寫「曾用過品項」（自動記憶，同名更新最近一次類型/價格） |
| `initDefaults()` | 第一次啟動時植入預設 18 個常用品項範本 |
| `runOnceMigration()` | 一次性遷移舊制 yesterday/daybefore → history（設 `mos_migration_v1` 旗標後不再執行） |
| `checkAndRotate()` | 換日：若日期不同，把 `mos_today` append 進 history 後清空，更新 `mos_last_date` |

**啟動順序**（在 `useItems.js` 的 lazy useState 裡執行）：
```
initDefaults() → runOnceMigration() → checkAndRotate()
```
`runOnceMigration` 必須在 `checkAndRotate` 之前，才能讀到換日前的 `LAST_DATE`。

### `src/hooks/useItems.js`

接受 `selectedDate`（`YYYY-MM-DD`）參數，回傳：
```js
{ items, calcRemaining,
  addRegular, addDrink, edit, remove,
  incSold, decSold, applyFavorites, bulkApplyParsed }
```
- 第一次 render 時執行啟動序列（lazy useState）
- `selectedDate` 變化時，`useEffect` 重讀對應日期的品項
- 所有操作都呼叫 `setItemsForDate(selectedDate, newItems)` 即時存檔

### `src/components/ItemsTab.jsx`

接受 `{ selectedDate, onDateChange }` props（第 3 批改為受控元件）。

頂層結構：
```jsx
<DateSelector selectedDate onChange={changeDate} />
<AddItemForm>   // 展開式新增表單
<QuickCreateModal>  // 文字快速建立 modal
<RegularRow item ctrl>  // 一般品項列（展開含 EditForm + 刪除）
<DrinkRow item ctrl>    // 飲料品項列（單/雙價格自動切換）
```
- `DateSelector`：◀/▶ 箭頭逐日切換；📅 按鈕呼叫 `dateInputRef.current.showPicker()`（含 `click()` fallback）；今日顯示紅色「今天」badge
- 日期變化時 `useEffect` 關閉 showAdd / showQuickCreate
- 剩餘 = 0 的品項 sort 到最下方
- `AddItemForm`：頂部下拉選單分兩個 `<optgroup>`──「⭐ 常用品項」（來自 `getFavorites()`）／
  「🕘 其他曾用過的品項」（來自 `getKnownItems()`，排除已在常用品項的名稱）。選常用品項
  帶入 `defaultStock`；選其他曾用過品項則呼叫 `suggestStockForItem` 依當天星期幾算智慧
  建議備貨量（資料不足留空，不硬塞數字）。帶入後 `stock` 欄位仍可編輯。

### `src/components/AnalyticsTab.jsx`

接受 `{ onNavigateToDate }` prop。

- `ImportPanel`：JSON 貼上匯入歷史資料（驗證 + 重複日期處理），永遠顯示於最上方
- 有歷史資料時依序顯示：
  - `RevenueTrend`：SVG 長條圖（可點擊跳轉）+ 下方日期清單（可點擊跳轉）
  - `ItemRanking`：品項銷售排行 Top 10（跨日彙總，無跳轉）
  - `SoldOutSpeed`：賣完速度排行（新增，見下方方向 7 說明）
  - `StockVsSales`：備貨 vs 實際銷售售完率（跨日彙總，無跳轉）
  - `DayOfWeekEffect`：星期幾平均營收（跨日彙總，無跳轉）
  - `StockSuggestion`：備貨建議（依星期幾分組）

### `src/logic/itemUtils.js`

```js
createRegularItem(name, stock, price) → item（含 generateId()，soldOutOrder: null）
createDrinkItem(name, stock, comboPrice, aLaCartePrice) → item（soldOutOrder: null）
editItem(items, id, changes) → newItems（套用後呼叫 syncSoldOutOrder）
deleteItem(items, id) → newItems
adjustSold(items, id, field, delta) → newItems（負數擋住，套用後呼叫 syncSoldOutOrder）
calcRemaining(item) → number
favoritesToItems(favorites) → items（sold/comboSold/aLaCarteSold 全歸零）
```

`syncSoldOutOrder(items, id)`（module 內部函式，不 export）：品項剩餘變 0 時，依
`type` 分組指派下一個賣完順序號（同分組已有號碼取 max+1，否則從 1 開始）；
已有號碼不覆蓋；剩餘回到 > 0 時清掉號碼。由 `editItem`／`adjustSold` 呼叫。

### `src/logic/stockSuggestion.js`

```js
suggestStockForItem(history, itemName, dow, minCount = 2) → { suggestion, count } | null
```
單一品項版本的星期幾平均已售量計算（`AnalyticsTab.jsx` 的
`computeStockSuggestions` 整批版本維持原樣，未重構共用，避免風險）。
供新增品項表單選到「其他曾用過的品項」時計算智慧備貨建議。

---

## 已完成功能詳細記錄

### 基礎功能（第 1 批前已完成）

- [x] 單欄列表列設計（手機版不溢出）；品項行預設顯示名稱/剩餘/±1，點擊展開備貨/價格/編輯/刪除
- [x] 飲料單/雙價格選填（±1 按鈕數量隨之切換；`comboPrice`/`aLaCartePrice` 可為 null）
- [x] 剩餘 = 0 的品項自動排到清單最下方
- [x] 常用品項範本（新增/編輯/刪除，獨立於換日輪替）
- [x] 套用常用品項（整批複製，已售歸零）
- [x] 文字快速建立品項（textParser 支援多種格式；QuickCreateModal 多步驟編輯/衝突處理）
- [x] 分析頁籤（趨勢圖/排行/備貨分析/星期效應）
- [x] 手動匯入歷史資料（JSON 貼上，格式驗證，重複日期選覆蓋或略過）

### 架構調整第 1 批：資料模型重構（已完成，手機驗證通過）

**核心變化**：拿掉三天輪替，改成一份 current（`mos_today`）＋永久 `mos_history`。

- [x] `checkAndRotate()` 換日時直接 append history（不再搬到 yesterday/daybefore）
- [x] `runOnceMigration()` 一次性把舊制 yesterday/daybefore 轉進 history（重複日期跳過，設完成旗標）
- [x] 移除 `setYesterdayItems`、`getDayBeforeItems`、`setDayBeforeItems` export
- [x] 手機驗證：migration 正確運作，舊 key 清除，history 資料結構正確

### 架構調整第 2 批：統一日期選擇品項編輯頁（已完成，手機 APK 已打包）

**核心變化**：拿掉獨立的今天/昨天頁籤，合併成單一「品項」頁，頂部有日期選擇器。

- [x] `getTodayString()`、`getItemsForDate()`、`setItemsForDate()` 新增至 storage.js
- [x] `useItems(selectedDate)` 新 hook（啟動序列 + date 變化重讀）
- [x] `ItemsTab.jsx`（DateSelector ◀/▶/📅 + 完整品項操作 UI，功能同原 TodayTab）
- [x] `App.jsx` 頁籤更新為 品項/分析/常用品項
- [x] 瀏覽器測試：日期切換讀取 history 正確；今天新增/±1/即時存檔正常
- [x] APK 重新打包（4.04 MB），已送手機測試

### 系統列安全距離修正（已完成，待手機驗證）

**問題**：Capacitor 7 + targetSdkVersion 35（Android 15）預設強制 edge-to-edge，
WebView 延伸到狀態列與導覽列底下，但原本沒有處理安全距離，導致上方日期選擇
區和下方清單最後幾項被系統 UI 遮住。

- [x] `index.html`：viewport meta 加 `viewport-fit=cover`（讓 CSS 拿得到 safe-area-inset-*）
- [x] `App.jsx` header：`paddingTop` 改為 `calc(env(safe-area-inset-top, 0px) + 14px)`，頂部內容不被狀態列遮住
- [x] `App.jsx` 外層容器：加 `paddingBottom: env(safe-area-inset-bottom, 0px)`，捲到清單底部時不被導覽列遮住
- [x] APK 重新打包（3.97 MB，2026-07-15）
- [ ] 手機實測：上方日期選擇區、下方清單最後一項按鈕是否完整可見可點

### 架構調整第 3 批：分析頁點日期跳轉到編輯頁（已完成，待手機驗證）

**核心變化**：`selectedDate` 從 `ItemsTab` local state 提升到 `App.jsx`，
讓分析頁可透過 callback 觸發跳轉。

- [x] `App.jsx`：`selectedDate` state 提升 + `navigateToDate(dateStr)` 同時設日期與切頁籤
- [x] `ItemsTab.jsx`：改為受控元件，接受 `{ selectedDate, onDateChange }` props
- [x] `AnalyticsTab.jsx`：接受 `onNavigateToDate` prop
- [x] `RevenueTrend`：長條圖每列加全高透明 `<rect>` 擴大觸控區；bars 帶 `date` 欄位
- [x] `RevenueTrend`：長條圖下方附日期清單（最近 30 天，反序，可捲動），作為手機備用入口
- [x] `ItemRanking`、`StockVsSales`、`DayOfWeekEffect`：跨日彙總，不加跳轉
- [x] Vite build 通過（無編譯錯誤）
- [x] APK 重新打包（3.95 MB，2026-07-15）
- [ ] 手機實測：點分析頁長條/日期清單跳轉到對應日期是否順暢

### 備貨建議（分析頁新增功能，2026-07-15）

**位置**：`AnalyticsTab.jsx` 最末尾（`DayOfWeekEffect` 之後），新增 `StockSuggestion` 元件。

- [x] `computeStockSuggestions(history)` 純函式：遍歷所有 history，對每個品項累計整體 appearances/totalSold，以及 dowData（7 個星期各自的 count/totalSold）
- [x] 整體平均 = `Math.round(totalSold / appearances)`（一般品項用 sold，飲料用 comboSold + aLaCarteSold）
- [x] 按整體平均降序排列（賣最多的品項排前面）
- [x] DOW 選擇器（日一二三四五六）：預設為裝置今天的星期；今天星期加紅框區分
- [x] 每個品項顯示：名稱 + 建議份數（大字紅色）+ 說明文字
  - 該星期出現 ≥ 2 次：顯示星期幾專屬平均，標示「根據 N 個週X 資料」
  - < 2 次：退回整體平均，標示「週X 資料不足（N 次），暫用整體平均（共 M 天）」
- [x] Vite build 通過（無編譯錯誤）
- [x] 打包新 APK（4.04 MB，2026-07-15）
- [x] 手機實測：切換星期、資料不足退回邏輯、今天紅框

### 備貨建議調整（2026-07-15）

- [x] **資料不足時改為隱藏**：`StockSuggestion` render 改用 `.filter(item => item.dowData[activeDow].count >= 2)` 篩選後再 map，出現次數 < 2 的品項完全不渲染（不再顯示退回整體平均的數字與提示文字）
- [x] **確認分組邏輯**：`computeStockSuggestions` 已使用 `map[item.name]` 作為唯一 key，純粹依品項名稱分組統計，價格欄位不參與分組，無需修改
- [x] 打包新 APK（3.97 MB，2026-07-15）
- [x] 手機實測：資料不足品項正確隱藏、有資料品項正常顯示建議份數

### 方向 6：新增品項自動記憶 + 智慧備貨量（2026-07-21）

規格見 `docs/mos-sales-app-impl-plan-20260720.md`。**程式碼完成、`npm run build`
通過；待手機實測。**

- [x] `storage.js`：新增 `mos_known_items` key、`getKnownItems()`、`upsertKnownItem(entry)`（同名合併更新最近一次類型/價格）
- [x] 新增 `src/logic/stockSuggestion.js`：`suggestStockForItem(history, itemName, dow, minCount)`，單一品項版的星期幾平均已售量計算
- [x] `useItems.js`：`addRegular`/`addDrink`/`bulkApplyParsed` 建立品項時、`edit` 變更價格欄位時，都呼叫 `upsertKnownItem`
- [x] `useFavorites.js`：`addRegular`/`addDrink` 新增常用品項時也同步呼叫 `upsertKnownItem`（保險，避免兩份資料不同步）
- [x] `ItemsTab.jsx` 的 `AddItemForm`：新增下拉選單（兩個 optgroup：常用品項／其他曾用過的品項），選定後帶入類型/名稱/價格；備貨量規則──選常用品項用 `defaultStock`，選其他曾用過品項用 `suggestStockForItem` 智慧建議（無資料則留空）
- [x] `QuickCreateModal.jsx` 的 `PreviewRow`：`handleFavSelect` 升級為 `handlePick`，同樣兩個 optgroup 邏輯，與單筆新增表單行為一致
- [x] `npm run build` 通過（無編譯錯誤）
- [x] 瀏覽器測試通過（2026-07-21）：headless Chromium 自動化驗證「全新品項送出後出現在其他曾用過的品項」「選定後正確帶入名稱/價格」「當時無星期幾資料時備貨量正確留空、不硬塞數字」；使用者另用 Claude in Chrome 手動測試一輪無回報問題
- [x] 實機安裝驗證通過（2026-07-21，使用者手機肉眼確認畫面正常）

### 方向 7：記錄品項賣完順序 + 分析頁強化（2026-07-21）

規格見 `docs/mos-sales-app-impl-plan-20260720.md`。**程式碼完成、`npm run build`
通過；待手機實測。**

- [x] `itemUtils.js`：`createRegularItem`/`createDrinkItem` 初始化 `soldOutOrder: null`；新增（module 內部，不 export）`syncSoldOutOrder(items, id)`──剩餘 ≤ 0 時依 `type` 分組指派下一個順序號（已有號碼不覆蓋），剩餘回到 > 0 時清掉號碼；`adjustSold`、`editItem` 都改為套用後回傳 `syncSoldOutOrder` 的結果
- [x] `storage.js`：`buildDailySummary` 的 `summaryItems`，`regular`/`drink` 兩個分支都加上 `soldOutOrder: item.soldOutOrder ?? null`
- [x] `AnalyticsTab.jsx`：新增 `computeSoldOutRanking(history, dow = null)`（`dow` 為可選參數，供依星期幾細分排行重用同一函式）
- [x] 新增 `SoldOutSpeed` 元件，掛在 `ItemRanking` 之後、`StockVsSales` 之前：
  - 整體「最快賣完排行」：一般品項/飲料分開列表，各取平均名次前 10 名，顯示「品項名 平均第 X.X 個賣完（N 天有記錄）」
  - 依星期幾細分排行：比照 `StockSuggestion` 的星期幾 tab UI，同樣套用「該星期幾 ≥ 2 筆資料才顯示」門檻
  - 完全沒有 `soldOutOrder` 資料時顯示空狀態文字，不崩潰、不顯示 NaN
- [x] 舊資料（無 `soldOutOrder` 欄位、手動匯入資料）視為 `null`，`computeSoldOutRanking` 用 `if (item.soldOutOrder == null) continue` 自然排除，未寫遷移腳本（依規格）
- [x] `npm run build` 通過（無編譯錯誤）
- [x] 瀏覽器測試通過（2026-07-21）：+1 壓到剩餘 0 正確賦號；灌入模擬歷史資料（含一筆無 `soldOutOrder` 欄位的舊資料）後，「賣完速度排行」整體排行與依星期幾切換皆手算驗證數字正確、資料 <2 筆時正確顯示「資料還不足」、舊資料不影響排行也不讓頁面出錯；全程瀏覽器 console 無 error。使用者另用 Claude in Chrome 手動測試一輪無回報問題
- [x] 實機安裝驗證通過（2026-07-21，使用者手機肉眼確認畫面正常）

---

## 已知可清理項目（非緊急）

- [x] `[mos-debug]` console.log 移除（log 在 `useToday.js`，隨舊檔一起刪除）
- [x] 舊檔案已刪除：`useToday.js`、`TodayTab.jsx`、`YesterdayTab.jsx`、`StorageTest.jsx`、`BusinessLogicTest.jsx`
- [x] `storage.js` 的 `getYesterdayItems()` 函式（僅舊元件使用）一併移除

---

## 備註

- 打包 APK（Windows / Android Studio 環境）：`npm run cap:sync` + `cd android && .\gradlew.bat assembleDebug`
  → 產出 `android\app\build\outputs\apk\debug\app-debug.apk`。詳見 `docs/build-guide.md`。
- **WSL/Linux 端也可直接打包**（2026-07-21 建置驗證）：這個 repo 所在的 WSL
  環境本身沒有 JDK/Android SDK，已手動裝在 `~/android-toolchain/`（不需
  sudo，全部解壓縮到使用者目錄）：
  - `~/android-toolchain/jdk-21.0.11+10`（Temurin JDK 21——AGP 8.7.2 +
    目前的 Capacitor Android 模組需要 JDK 21，JDK 17 會編譯失敗
    `error: invalid source release: 21`）
  - `~/android-toolchain/android-sdk`（cmdline-tools + platform-tools +
    `platforms;android-35` + `build-tools;35.0.0`，licenses 已接受）
  - `android/local.properties` 內 `sdk.dir` 指向上述 SDK 路徑（此檔已
    gitignore，每個環境各自設定）
  - 建置指令：
    ```bash
    export JAVA_HOME=~/android-toolchain/jdk-21.0.11+10
    export ANDROID_HOME=~/android-toolchain/android-sdk
    export PATH="$JAVA_HOME/bin:$PATH"
    npm run cap:sync
    cd android && ./gradlew assembleDebug
    ```
  - 這個工具鏈只在這台機器的這個 WSL 使用者目錄下有效，不隨 repo 走。
- **⚠️ debug keystore 簽名一致性（2026-07-21 踩過一次坑）**：Gradle 的
  debug build 沒有自訂 `signingConfig` 時，會用 `~/.android/debug.keystore`
  簽章，這個檔案**不存在就自動產生一把新的、隨機的**。這次是這個 WSL
  環境第一次跑 `gradlew assembleDebug`，自動產生了一把新 keystore，跟手機上
  已安裝版本（簽名來源不明，追查後發現 Windows 端當時完全沒有
  `.android/debug.keystore`、也沒有 Android SDK/adb，來源已不可考）的簽名
  不一致，導致 `adb install -r` / 手動安裝都會被拒裝（Android 不允許用
  不同簽名覆蓋同套件名的既有 App）。
  - **往後只要都在這個 WSL 環境建置，`~/.android/debug.keystore` 已經存在
    且固定，不會再遇到這個問題**——同一把 keystore 簽出來的新版 APK 可以
    正常覆蓋安裝、資料不會被清掉。
  - 只有「換一台機器 / 換一個使用者目錄建置」時才會再發生一次同樣的簽名
    不符，屆時要嘛從這台機器複製 `~/.android/debug.keystore` 過去、要嘛
    重複一次「備份資料 → 解除安裝 → 裝新版 → 復原資料」流程（見下方）。
  - 這次的資料復原流程：透過 `adb forward` 接到 App 的 WebView remote
    debugging socket（debug build 預設有開），用 Chrome DevTools
    Protocol（`Runtime.evaluate`）直接讀/寫 `localStorage`，比硬解析
    WebView 的 LevelDB 檔案可靠很多。復原後有做逐位元組 diff 確認跟原始
    備份完全一致。這個技巧之後如果還需要挖手機端資料，可以重用。
  - USB passthrough：這台機器透過 `usbipd-win`（Windows 端）+ 對應 udev
    規則（WSL 端，`/etc/udev/rules.d/51-android.rules`，Samsung vendor id
    `04e8`）讓 WSL 的 adb 能直接抓到實體手機，設定一次即可，重開機後
    Windows 端可能要重新 `attach`（`usbipd attach --wsl --busid <BUSID>`）。
- 手動測試網頁版（headless Chromium，2026-07-21 驗證）：這個 WSL
  環境預設沒有瀏覽器可用的系統函式庫（libnspr4/libnss3 等）與中文字型，
  已用 `apt-get download` 抓 .deb 後手動解壓到 `/tmp/debroot`（不需
  root）、字型抓 `fonts-wqy-zenhei` 裝進 `~/.fonts`，搭配
  `LD_LIBRARY_PATH=/tmp/debroot/usr/lib/x86_64-linux-gnu` 讓
  Playwright 抓的 headless Chromium 能跑。這些是 `/tmp` 下的暫存
  設定，重開機或清 `/tmp` 後需要重新來一次；不是專案的一部分。
- GitHub：https://github.com/sydney052007/mos-sales-app（Private）
- 動畫效果非必要但允許，若加入請在此補記位置與實作方式。
