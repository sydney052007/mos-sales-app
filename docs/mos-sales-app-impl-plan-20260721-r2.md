# 實作規劃：第二輪優化（方向 8-12）（2026/07/21）

> 交給 Claude Code CLI 實作前的技術規格。承接方向 6、7（自動記憶品項、賣完順序分析），假設那兩個方向已經實作完成（尤其方向 8、9 依賴方向 6 的 `mos_known_items` 機制）。

---

## 方向 8：編輯品項時也能選常用/過去品項帶入

### 背景
方向 6 只做了「＋ 新增品項」的快選，編輯既有品項時沒有這個功能，只能整個手動改。

### 設計決定（已確認）
- 選了別的品項帶入時，**只更新名稱／類型／價格**，備貨量與已售數量（`stock`／`sold`／`comboSold`／`aLaCarteSold`）維持原樣不受影響 —— 編輯表單常用來修正名稱打錯字或格式不一致（見方向 9），不該連帶洗掉已經在跑的備貨/銷售資料。
- 下拉選單只列出**跟目前編輯品項相同 type 的候選**（編輯一般品項只給選一般品項，編輯飲料只給選飲料），不支援透過選單切換品項類型 —— `EditForm` 目前架構本來就不支援類型切換，這樣做不用碰已售數量欄位對不上的問題。

### 實作要點（`src/components/ItemsTab.jsx`）
- `EditForm` 新增 `favorites`／`knownItems` props（沿用方向 6 合併＋分群的邏輯：「⭐ 常用品項」＋「🕘 其他曾用過的品項」，且都要先用 `item.type` 過濾）。
- 選定後：一般品項只覆蓋 `name`／`price`；飲料覆蓋 `name`／`comboPrice`／`aLaCartePrice`／`showSecondPrice`。`stock` 欄位、以及 `RegularRow`/`DrinkRow` 顯示用的 `sold`/`comboSold`/`aLaCarteSold` 完全不動。
- `RegularRow`／`DrinkRow` 呼叫 `<EditForm>` 的地方要多傳 `favorites`／`knownItems` 下去（跟 `AddItemForm` 一樣，由 `ItemsTab` 取得後往下傳）。

---

## 方向 9：修正文字快速建立的比對邏輯（`src/logic/textParser.js`）

### 問題一：`normalize()` 沒清掉破折號
```js
function normalize(s) {
  return s
    .replace(/[\s\(\)（）]/g, '')
    .replace(/蕃/g, '番')
    .replace(/台/g, '臺')
    .toLowerCase()
}
```
「咖啡-冰」normalize 完還留著 `-`，跟「咖啡(冰)」normalize 完的「咖啡冰」對不上，字元重疊分數只有 0.3，低於 0.4 門檻判定不比對。

**修法**：正規表示式加入要清除的符號：
```js
.replace(/[\s\(\)（）\-－_]/g, '')
```
（半形 `-`、全形 `－`、底線 `_` 一併清掉；之後如果還遇到其他符號變體造成的比對失敗，再視情況擴充這個字元集合）

### 問題二：`fuzzyMatch` 候選池沒有涵蓋 `mos_known_items`
`QuickCreateModal.jsx` 呼叫 `parseText(text, favorites)`，`favorites` 是 `ItemsTab.jsx` 傳下來的 `getFavorites()` —— **只有常用品項，沒有自動記憶清單**。「亞麻火腿三明治」如果只存在 `mos_known_items`、沒被收進常用品項，解析時完全不會出現在候選名單裡，不管分數多高都比對不到，這是這次「亞麻火腿」沒被歸類到同一品項的真正原因。

**修法**：不用改 `fuzzyMatch` 演算法本身，只要餵給它更完整的候選清單：
- `src/components/ItemsTab.jsx`：組出 `getFavorites()` ＋ `getKnownItems()`（排除掉名稱已在 Favorites 裡的重複項）合併清單，傳給 `QuickCreateModal` 的 `favorites` prop（可以順便改個 prop 名稱如 `matchCandidates`，但沿用 `favorites` 這個名字風險較低、改動範圍小，兩種都可以，Claude Code CLI 實作時挑一個一致命名即可）。
- `QuickCreateModal.jsx` 把這份合併清單傳給 `parseText`，`PreviewRow` 的「從常用品項選」下拉選單（`handleFavSelect`）也要用同一份合併清單，跟方向 6 的兩群 optgroup 邏輯一致（這個原本方向 6 就規劃要做，這次一併確認範圍包含這裡）。

### 驗收項目
- 打「咖啡-冰16」能正確比對到「咖啡(冰)」常用品項。
- 打「亞麻火腿-16」如果「亞麻火腿三明治」只存在 `mos_known_items`（不在常用品項），也要能正確比對到。
- 常用品項與已知品項清單裡有重複名稱時，合併清單不會出現兩筆一樣的候選。

---

## 方向 10：分析頁「備貨 vs 實際銷售」不顯示無備貨資料的品項

### 實作要點（`src/components/AnalyticsTab.jsx`）
`StockVsSales` 元件目前有 `noStock`（`stockKnownCount === 0` 的品項）的渲染區塊，直接刪掉這段（`const noStock = ...` 宣告與下面 `{noStock.map(...)}` 一起移除），只保留 `withStock.map(...)`。若 `withStock` 剛好也是空陣列，維持 Section 顯示但內容空白即可，不用特別加空狀態文案（外層 `AnalyticsTab` 已經有整體的「還沒有足夠歷史資料」空狀態負責這種情況）。

---

## 方向 11：分析頁每個區塊改成可摺疊

### 實作要點（`src/components/AnalyticsTab.jsx`）
`Section` 是所有分析區塊共用的外層元件，只要改這一個地方就能讓 `RevenueTrend`／`ItemRanking`／`StockVsSales`／`DayOfWeekEffect`／`StockSuggestion`／（方向 7 新增的）`SoldOutSpeed` 全部一起有摺疊功能：

```js
function Section({ title, children }) {
  const [open, setOpen] = useState(true)  // 預設展開
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          fontSize: '15px', fontWeight: 'bold', color: '#1a1a1a',
          marginBottom: open ? '12px' : 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '13px', color: '#999' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && children}
    </div>
  )
}
```
- 預設全部展開，維持現有使用習慣不打斷。
- 收合狀態只存在元件 state，不寫進 localStorage —— 每次重新整理／切頁籤會重置回全部展開。之後如果想要「記得上次收合狀態」，可以再加一個 localStorage key 存每個 Section 的開關狀態，這次先不做。

---

## 方向 12：「品項」頁底部加總目前已售出總金額

### 實作要點
- `src/logic/itemUtils.js` 新增匯出 `calcItemRevenue(item)`（從 `src/services/storage.js` 現有的私有函式搬過來，改成共用工具；`storage.js` 的 `buildDailySummary` 改成 import 並呼叫這支，避免兩份重複邏輯不同步）：
  ```js
  export function calcItemRevenue(item) {
    if (item.type === 'drink') {
      return ((item.comboPrice ?? 0) * (item.comboSold ?? 0)) +
             ((item.aLaCartePrice ?? 0) * (item.aLaCarteSold ?? 0))
    }
    return (item.price ?? 0) * (item.sold ?? 0)
  }
  ```
- `src/components/ItemsTab.jsx` 的 `ItemsTab` 元件，在品項列表最下方加一行總計：
  ```js
  const totalRevenue = ctrl.items.reduce((s, i) => s + calcItemRevenue(i), 0)
  ```
  顯示樣式比照現有金額顯示風格（例如 `目前已售出總金額：$1,234`），不管顯示今天還是回頭看某個過去日期都會出現，用該天當時實際的品項資料計算。

---

## 兩輪都要做的收尾（提醒，這輪規劃範圍不含）
- `docs/spec.md`／`PROGRESS.md` 落後問題仍待處理。
- 打包 APK、裝機驗證（含上次遇到的 WSL/Windows debug keystore 簽名問題，這次記得沿用同一把 keystore，不會再卡住）。
