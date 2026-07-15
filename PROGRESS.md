# PROGRESS.md

給 Claude Code 用的進度 tracker。**每次開始工作前先讀這份**，了解目前
系統長什麼樣子；每完成一個可獨立驗證的小任務後更新對應項目。

規則見 `CLAUDE.md` 的「Tracker 使用規則」一節。

---

## 目前狀態總覽（截至 2026-07-15）

第 1、2、3 批均已完成。系統列安全距離修正已完成，待手機驗證。備貨建議功能已完成並手機驗證通過。

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
| 分析頁點日期跳轉到編輯頁（第 3 批） | ✅ 完成（待手機驗證） |
| 系統列安全距離（safe-area-inset） | ✅ 完成（待手機驗證）|
| 備貨建議（分析頁，依星期幾分組） | ✅ 完成（手機驗證通過，2026-07-15） |
| APK 打包 + 安裝到 Samsung 手機 | ✅ 完成（3.97 MB，2026-07-15） |

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
│   │   ├── itemUtils.js         # 純函式：品項 CRUD / adjustSold / calcRemaining / favoritesToItems
│   │   └── textParser.js        # 文字快速建立品項的解析引擎與模糊比對
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

### `src/components/AnalyticsTab.jsx`

接受 `{ onNavigateToDate }` prop。

讀 `getDailyHistory()` 顯示：
- `RevenueTrend`：SVG 長條圖（可點擊跳轉）+ 下方日期清單（可點擊跳轉）
- `ItemRanking`：品項銷售排行 Top 10（跨日彙總，無跳轉）
- `StockVsSales`：備貨 vs 實際銷售售完率（跨日彙總，無跳轉）
- `DayOfWeekEffect`：星期幾平均營收（跨日彙總，無跳轉）
- `ImportPanel`：JSON 貼上匯入歷史資料（驗證 + 重複日期處理）

### `src/logic/itemUtils.js`

```js
createRegularItem(name, stock, price) → item（含 generateId()）
createDrinkItem(name, stock, comboPrice, aLaCartePrice) → item
editItem(items, id, changes) → newItems
deleteItem(items, id) → newItems
adjustSold(items, id, field, delta) → newItems（負數擋住）
calcRemaining(item) → number
favoritesToItems(favorites) → items（sold/comboSold/aLaCarteSold 全歸零）
```

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

---

## 已知可清理項目（非緊急）

- [x] `[mos-debug]` console.log 移除（log 在 `useToday.js`，隨舊檔一起刪除）
- [x] 舊檔案已刪除：`useToday.js`、`TodayTab.jsx`、`YesterdayTab.jsx`、`StorageTest.jsx`、`BusinessLogicTest.jsx`
- [x] `storage.js` 的 `getYesterdayItems()` 函式（僅舊元件使用）一併移除

---

## 備註

- 打包 APK：`npm run cap:sync` + `cd android && .\gradlew.bat assembleDebug`
  → 產出 `android\app\build\outputs\apk\debug\app-debug.apk`。詳見 `docs/build-guide.md`。
- GitHub：https://github.com/sydney052007/mos-sales-app（Private）
- 動畫效果非必要但允許，若加入請在此補記位置與實作方式。
