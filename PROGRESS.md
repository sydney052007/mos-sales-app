# PROGRESS.md

給 Claude Code 用的進度 tracker。**每次開始工作前先讀這份**,了解目前
系統長什麼樣子;每完成一個可獨立驗證的小任務後更新對應項目。

規則見 `CLAUDE.md` 的「Tracker 使用規則」一節。

---

## 目前狀態

### 骨架 / 環境
- [x] React 專案骨架建立(Vite + React)
- [x] Capacitor 專案初始化

### storage service
- [x] 讀寫本機儲存(今天 / 昨天 / 前天三份資料)
- [x] 常用品項範本的獨立讀寫

### 業務邏輯(純函式 / custom hook)
- [x] 一般品項的新增/編輯/刪除/計算邏輯
- [x] 飲料品項的新增/編輯/刪除/計算邏輯(套餐/單點分開計數)
- [x] 換日判斷與資料輪替邏輯(今天→昨天→前天)
- [x] 套用常用品項範本邏輯(整批複製、已售歸零)

### 「今天」頁籤元件
- [x] 品項列表渲染(一般品項)
- [x] 品項列表渲染(飲料品項)
- [x] 「+ 新增品項」表單元件（類型切換、欄位驗證、即時更新清單、storage 持久化）
- [x] 「套用常用品項」按鈕與綁定
- [x] +1 / -1 按鈕即時更新畫面與存檔（一般品項一組、飲料套餐/單點各一組，負數擋住，剩餘即時重算）
- [x] 編輯備貨量/價格（inline 表單，含名稱/備貨/價格欄位，驗證同 4b）
- [x] 刪除品項（confirm 確認後移除，reload 不復活）
- [x] 收合列顯示價格（一般品項顯示 `$price`，飲料雙價格顯示 `套$x/單$y`，名稱下方小字）

### 「昨天」頁籤元件
- [x] 顯示昨天最終品項清單與銷售數字（唯讀，卡片樣式同今天，無任何操作按鈕）

### 「管理常用品項」
- [x] 範本清單顯示（第三個頁籤「常用品項」）
- [x] 新增/編輯/刪除範本品項（含驗證、即時存檔、reload 後資料保留）
- [x] 完整流程驗證：在常用品項新增範本 → 今天頁籤套用 → 備貨/價格帶入、已售歸零

### 打包 / 交付
- [x] 網頁版本可在瀏覽器測試通過（今天頁籤、昨天頁籤、換日邏輯已驗證）
- [x] Capacitor 打包成功產出 .apk（android\app\build\outputs\apk\debug\app-debug.apk，4.03 MB）
- [x] .apk 安裝到 Samsung 手機並可正常運作
- [x] 建置/安裝步驟說明文件完成（docs/build-guide.md）
- [x] 專案推上 GitHub：https://github.com/sydney052007/mos-sales-app（Private）

---

## 檔案結構現況

```
mos-sales-app/
├── src/
│   ├── services/
│   │   └── storage.js        # localStorage 讀寫、換日邏輯
│   ├── logic/
│   │   └── itemUtils.js      # 純函式：新增/編輯/刪除/adjustSold/calcRemaining/favoritesToItems
│   ├── hooks/
│   │   ├── useToday.js           # custom hook：今天品項操作
│   │   └── useFavorites.js       # custom hook：常用品項範本操作
│   ├── components/
│   │   ├── TodayTab.jsx          # 今天頁籤（可編輯）
│   │   ├── YesterdayTab.jsx      # 昨天頁籤（唯讀）
│   │   ├── AnalyticsTab.jsx      # 分析頁籤（歷史趨勢／排行／備貨分析／星期效應）
│   │   ├── FavoritesTab.jsx      # 常用品項頁籤（新增/編輯/刪除範本）
│   │   ├── StorageTest.jsx       # 暫時測試元件
│   │   └── BusinessLogicTest.jsx # 暫時測試元件
│   ├── main.jsx
│   ├── App.jsx                   # 頁籤切換（今天/昨天/常用品項）
│   └── index.css
├── docs/
│   └── spec.md
├── index.html
├── vite.config.js
├── capacitor.config.json
├── package.json
├── android/
├── CLAUDE.md
└── PROGRESS.md
```

---

### 排版優化（單欄列表列設計）

- [x] 「今天」和「昨天」品項列表改為單欄列表列（row）設計，取代原本固定
  兩欄 Grid，根本解決手機版內容超出畫面的問題
  - 「今天」每列預設顯示：品項名稱（大字）、剩餘數量（大字）、±1 按鈕
    （44×44px，飲料各有套餐/單點兩組），點名稱區塊展開備貨/價格/已售
    明細及編輯/刪除按鈕；展開期間不可意外收合（editing 狀態保護）
  - 剩餘 = 0 的品項自動排到列表最下方，仍顯示、不隱藏
  - 「昨天」單欄緊湊列（padding 8px），唯讀，每列顯示名稱＋備/售/餘數字
  - 飲料列有淡藍底色以區分；展開區也有對應底色

### 飲料品項價格選填優化

- [x] 飲料新增/編輯表單預設只顯示一個「價格」欄位，旁邊有「＋ 加第二種價格」
  展開後才顯示「套餐價」「單點價」兩個欄位，驗證擋住兩個都空白的情況
- [x] `DrinkRow`（今天頁籤）：只有一個價格時顯示單組 ±1 計數，兩個價格才顯示
  「套」「單」雙組計數，展開明細也依此切換顯示
- [x] `DrinkRowRO`（昨天頁籤）：同上，單價品項只顯示一個「售」欄位
- [x] `FavoritesTab`（常用品項）：新增/編輯範本、卡片顯示同步支援單/雙價格
- [x] 資料層（`createDrinkItem`、`useFavorites.addDrink`）允許 null 價格；
  `favoritesToItems` 保留 null 傳遞；`calcRemaining` 原本已用 `?? 0` 安全
- [x] 既有兩個價格的品項（如紅茶）自動相容，不需使用者手動處理

### 歷史資料保留與分析頁籤

- [x] `storage.js` 新增永久儲存 key `mos_history`，及 `getDailyHistory()` /
  `appendDailyHistory(entry)` API
- [x] 換日邏輯（`checkAndRotate`）調整：在搬移今天→昨天之前，若今天有品項，
  先將完整品項資料轉換成「每日總覽」格式（含 date、totalRevenue、items 陣列，
  每筆含 name/type/stock/sold或comboSold+aLaCarteSold/remaining/revenue），
  append 進 dailyHistory；無品項則不記錄
- [x] 新增「分析」頁籤（App.jsx 第三個頁籤，今天/昨天/分析/常用品項）
- [x] 空資料狀態：`AnalyticsTab` 在 history 為空時顯示提示文字，不噴錯誤
- [x] 每日營收趨勢：SVG 長條圖，近 30 天，顯示最高/平均值，可橫向捲動
- [x] 品項銷售排行：依「總營收」或「銷售數量」切換排序，Top 10，含橫向進度條
- [x] 備貨 vs 實際銷售：列出每品項的售完率、平均剩餘，標記「常賣完」(≥80%)/
  「常剩很多」(售完率<50%)
- [x] 星期幾效應：7 格長條圖（日一二三四五六），平均日營收，無資料的星期顯示
  灰色短線

### 手動匯入歷史資料

- [x] `storage.js` 新增 `importHistoryEntries(entries, overwriteDuplicates)`：
  以 date 為唯一 key 合併進 dailyHistory，依 date 排序後寫回，
  回傳 `{ added, skipped, overwritten }` 計數
- [x] 分析頁籤頂部新增「匯入歷史資料」按鈕，點選後展開輸入面板
- [x] 輸入面板提供 textarea 讓使用者貼 JSON，顯示格式提示
- [x] 格式驗證：非合法 JSON、非陣列、空陣列、缺 date/items 欄位或 date
  格式錯誤，各顯示明確的中文錯誤訊息，不當機
- [x] 重複日期處理：驗證通過後若有重複 date，整批列出讓使用者一次選擇
  「覆蓋重複的日期」或「略過重複的日期」，沒有重複則直接匯入
- [x] 匯入完成後顯示結果（已匯入 N 筆 / 覆蓋 N 筆 / 略過 N 筆重複），
  圖表立即重新渲染（主元件改用 useState 持有 history，不需重整頁面）
- [x] `aggregateItems` 修正：stock/remaining 為 null 時不累加（避免 NaN），
  改以 `stockKnownCount` 追蹤有備貨資料的天數
- [x] `StockVsSales` 分成兩段顯示：有備貨資料的品項正常計算售完率；
  全無備貨資料的品項顯示「無備貨資料」標籤；有資料但部分天缺值則
  在說明行補註「另 N 天無備貨資料」

### 文字快速建立品項

- [x] `src/logic/textParser.js` 新增純函式解析引擎與模糊比對邏輯：
  - 分類標題（開頭 `-` 且無數字）自動忽略
  - Combo 格式 `名稱A+B（L1/L2）` 拆成兩筆獨立品項
  - 多品項斜線格式 `A/B/C-n1/n2/n3` 依序拆成多筆
  - 範圍格式 `n1～n2` 取下限，含有無 dash 兩種寫法
  - 簡單 `名稱-n` 與嵌入數字 `名稱n後綴` 格式
  - 模糊比對常用品項：normalize（去括號/空格、蕃↔番）後計算 substring 重疊分數，門檻 0.4
- [x] `src/components/QuickCreateModal.jsx` 新增多步驟 modal：
  - Step 1：textarea 貼上備貨筆記 → 解析預覽
  - Step 2：每筆解析結果顯示為可完整編輯的卡片（常用品項下拉自動帶入、類型切換、名稱/備貨量/價格皆可改、可刪除列）；未比對到的品項標示橘色「未比對到」並要求手動填入價格
  - 建立前驗證（名稱/備貨量/價格不得空白），inline 錯誤訊息
  - 同名品項衝突偵測：列出衝突名稱，讓使用者選「覆蓋備貨量」或「略過重複」
- [x] `src/hooks/useToday.js` 新增 `bulkApplyParsed(rows, conflictMode)` 方法
- [x] `src/components/TodayTab.jsx` 新增「✎ 文字快速建立品項」按鈕（綠色，位於兩個主按鈕下方），wire up modal
- [x] 完整流程驗證：貼入含分類標題、Combo、範圍、多斜線格式的筆記 → 解析 19 筆 → 刪除未比對 3 筆 → 建立 16 筆 → 今天清單正確顯示

## 已知問題 / 待處理

(無)

---

## 備註

- 動畫效果非必要但允許,若加入請在此簡述加在哪裡、用什麼方式實作,
  方便下個 session 知道現況。
- `TodayTab.jsx` 的空清單狀態內有「種入測試品項（5 筆）」和「種入測試常用品項（2 筆）[測試用]」
  兩個開發輔助按鈕（`seedTestData` / `seedTestFavorites`），常用品項 UI 已完成，
  可在確認無需後一起移除。
- 打包 APK 需先安裝 Android Studio（含 JDK + SDK），設定 JAVA_HOME / ANDROID_HOME
  環境變數後，執行 `npm run cap:sync` + `cd android && .\gradlew.bat assembleDebug`
  即可產出 APK。詳見 `docs/build-guide.md`。
