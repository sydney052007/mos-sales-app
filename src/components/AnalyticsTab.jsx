import { useState } from 'react'
import { getDailyHistory, importHistoryEntries } from '../services/storage'

const DOW = ['日', '一', '二', '三', '四', '五', '六']

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatMD(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}/${d}`
}

function totalSoldItem(item) {
  return item.type === 'drink'
    ? (item.comboSold ?? 0) + (item.aLaCarteSold ?? 0)
    : (item.sold ?? 0)
}

// stock/remaining may be null for manually imported entries.
// stockKnownCount tracks how many appearances have valid stock data.
function aggregateItems(history) {
  const map = {}
  for (const entry of history) {
    for (const item of entry.items) {
      if (!map[item.name]) {
        map[item.name] = {
          name: item.name, type: item.type,
          totalSold: 0, totalRevenue: 0, appearances: 0,
          totalStock: 0, totalRemaining: 0, stockKnownCount: 0,
          soldOutCount: 0,
        }
      }
      const agg = map[item.name]
      agg.totalSold += totalSoldItem(item)
      agg.totalRevenue += item.revenue
      agg.appearances++
      if (item.stock != null) {
        agg.totalStock += item.stock
        agg.totalRemaining += (item.remaining ?? 0)
        agg.stockKnownCount++
        if ((item.remaining ?? 0) <= 0) agg.soldOutCount++
      }
    }
  }
  return Object.values(map)
}

function validateImportData(text) {
  let parsed
  try { parsed = JSON.parse(text.trim()) } catch {
    return { error: 'JSON 格式錯誤，請確認貼上的內容是合法的 JSON' }
  }
  if (!Array.isArray(parsed)) return { error: '格式錯誤：最外層必須是陣列（ [ ... ] ）' }
  if (parsed.length === 0) return { error: '陣列是空的，沒有資料可以匯入' }
  for (let i = 0; i < parsed.length; i++) {
    const e = parsed[i]
    if (!e || typeof e !== 'object') return { error: `第 ${i + 1} 筆：不是物件` }
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      return { error: `第 ${i + 1} 筆：date 欄位格式錯誤（應為 "YYYY-MM-DD"）` }
    }
    if (!Array.isArray(e.items)) {
      return { error: `第 ${i + 1} 筆（${e.date}）：items 必須是陣列` }
    }
  }
  return { data: parsed }
}

// ── SVG Bar Chart ─────────────────────────────────────────────
function BarChart({ bars, barWidth = 40, chartH = 120, color = '#c0392b' }) {
  if (!bars.length) return null
  const max = Math.max(...bars.map(b => b.value), 1)
  // topPad reserves space above the tallest bar so value labels never get clipped
  const topPad = 16
  const svgH = topPad + chartH + 32  // 32px for bottom date labels
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg width={bars.length * barWidth} height={svgH} style={{ display: 'block' }}>
        {bars.map((b, i) => {
          const x = i * barWidth
          const bh = b.value > 0 ? Math.max(3, Math.round((b.value / max) * chartH)) : 0
          const barTop = topPad + (chartH - bh)
          return (
            <g key={i}>
              {b.value > 0 ? (
                <>
                  <rect x={x + 3} y={barTop} width={barWidth - 6} height={bh} fill={color} rx={3} />
                  <text x={x + barWidth / 2} y={barTop - 3} textAnchor="middle" fontSize={9} fill="#555">
                    {b.value >= 1000 ? `${(b.value / 1000).toFixed(1)}k` : b.value}
                  </text>
                </>
              ) : (
                <rect x={x + 3} y={topPad + chartH - 2} width={barWidth - 6} height={2} fill="#ddd" rx={1} />
              )}
              <text x={x + barWidth / 2} y={topPad + chartH + 16} textAnchor="middle" fontSize={10} fill="#888">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '12px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ── Import Panel ──────────────────────────────────────────────
function ImportPanel({ onImported }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)  // { data, duplicates }
  const [result, setResult] = useState('')

  function reset() { setText(''); setError(''); setPending(null) }

  function handleToggle() {
    if (open) { setOpen(false); reset() }
    else { setOpen(true); setResult('') }
  }

  function handleParse() {
    setError(''); setPending(null)
    const validation = validateImportData(text)
    if (validation.error) { setError(validation.error); return }

    const existingDates = new Set(getDailyHistory().map(e => e.date))
    const duplicates = validation.data.filter(e => existingDates.has(e.date)).map(e => e.date)

    if (duplicates.length === 0) {
      doImport(validation.data, false)
    } else {
      setPending({ data: validation.data, duplicates })
    }
  }

  function doImport(data, overwrite) {
    const r = importHistoryEntries(data, overwrite)
    const parts = [
      r.added > 0 ? `已匯入 ${r.added} 筆` : '',
      r.overwritten > 0 ? `覆蓋 ${r.overwritten} 筆` : '',
      r.skipped > 0 ? `略過 ${r.skipped} 筆重複` : '',
    ].filter(Boolean).join('，')
    setResult(parts)
    setOpen(false)
    reset()
    onImported()
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={handleToggle} style={{
          padding: '8px 14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
          background: open ? '#fdf2f2' : '#fff',
          color: open ? '#c0392b' : '#555',
          border: `1px solid ${open ? '#c0392b' : '#ccc'}`,
        }}>
          {open ? '✕ 取消' : '匯入歷史資料'}
        </button>
        {result && (
          <span style={{ fontSize: '13px', color: '#27ae60', fontWeight: 'bold' }}>✓ {result}</span>
        )}
      </div>

      {open && (
        <div style={{
          marginTop: '10px', background: '#fafafa',
          border: '1px solid #e0e0e0', borderRadius: '10px', padding: '14px',
        }}>
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
            貼上 JSON 陣列格式的歷史資料：
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
            每筆需包含 date（"YYYY-MM-DD"）、totalRevenue（數字）、items（陣列）
          </div>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError(''); setPending(null) }}
            placeholder={'[\n  {\n    "date": "2026-07-01",\n    "totalRevenue": 1250,\n    "items": [...]\n  }\n]'}
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '12px',
              fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: '6px',
              resize: 'vertical', background: '#fff',
            }}
          />

          {error && (
            <div style={{
              marginTop: '8px', padding: '8px 10px', fontSize: '13px', color: '#c0392b',
              background: '#fdf2f2', border: '1px solid #f5c0bb', borderRadius: '6px',
            }}>{error}</div>
          )}

          {pending ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>
                以下日期已有資料，請選擇處理方式：
              </div>
              <div style={{
                fontSize: '12px', color: '#7a5c1e', background: '#fff3cd',
                padding: '6px 10px', borderRadius: '6px', marginBottom: '10px',
              }}>
                {pending.duplicates.join('、')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => doImport(pending.data, true)} style={{
                  flex: 1, padding: '9px', fontSize: '13px', fontWeight: 'bold',
                  borderRadius: '7px', cursor: 'pointer',
                  background: '#c0392b', color: '#fff', border: 'none',
                }}>覆蓋重複的日期</button>
                <button onClick={() => doImport(pending.data, false)} style={{
                  flex: 1, padding: '9px', fontSize: '13px',
                  borderRadius: '7px', cursor: 'pointer',
                  background: '#fff', color: '#555', border: '1px solid #ccc',
                }}>略過重複的日期</button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleParse}
              disabled={!text.trim()}
              style={{
                marginTop: '10px', width: '100%', padding: '10px', fontSize: '14px',
                fontWeight: 'bold', borderRadius: '8px', border: 'none',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                background: text.trim() ? '#c0392b' : '#ddd',
                color: text.trim() ? '#fff' : '#aaa',
              }}
            >匯入</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Revenue Trend ─────────────────────────────────────────────
function RevenueTrend({ history }) {
  const recent = history.slice(-30)
  const bars = recent.map(e => ({ label: formatMD(e.date), value: e.totalRevenue }))
  const total = recent.reduce((s, e) => s + e.totalRevenue, 0)
  const max = Math.max(...recent.map(e => e.totalRevenue))
  const avg = Math.round(total / recent.length)
  return (
    <Section title="每日營收趨勢">
      <BarChart bars={bars} barWidth={40} chartH={120} />
      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px', display: 'flex', gap: '14px' }}>
        <span>近 {recent.length} 天</span>
        <span>最高 ${max}</span>
        <span>平均 ${avg}</span>
      </div>
    </Section>
  )
}

// ── Item Ranking ──────────────────────────────────────────────
function ItemRanking({ history }) {
  const [sortBy, setSortBy] = useState('revenue')
  const items = aggregateItems(history)
  const sorted = [...items]
    .sort((a, b) => sortBy === 'revenue' ? b.totalRevenue - a.totalRevenue : b.totalSold - a.totalSold)
    .slice(0, 10)
  const maxVal = Math.max(...sorted.map(i => sortBy === 'revenue' ? i.totalRevenue : i.totalSold), 1)
  return (
    <Section title="品項銷售排行">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[['revenue', '總營收'], ['sold', '銷售數量']].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{
            padding: '5px 12px', fontSize: '13px', borderRadius: '6px',
            cursor: 'pointer', border: 'none',
            background: sortBy === k ? '#c0392b' : '#f0f0f0',
            color: sortBy === k ? '#fff' : '#555',
          }}>{label}</button>
        ))}
      </div>
      {sorted.map((item, i) => {
        const val = sortBy === 'revenue' ? item.totalRevenue : item.totalSold
        const pct = Math.round((val / maxVal) * 100)
        return (
          <div key={item.name} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: '#333' }}>{i + 1}. {item.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                {sortBy === 'revenue' ? `$${val}` : `${val} 份`}
              </span>
            </div>
            <div style={{ background: '#eee', borderRadius: '3px', height: '6px' }}>
              <div style={{ background: '#c0392b', borderRadius: '3px', height: '6px', width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </Section>
  )
}

// ── Stock vs Sales ────────────────────────────────────────────
function StockVsSales({ history }) {
  const items = aggregateItems(history)
  const withStock = [...items.filter(i => i.stockKnownCount > 0)].sort(
    (a, b) => (b.soldOutCount / b.stockKnownCount) - (a.soldOutCount / a.stockKnownCount)
  )
  const noStock = items.filter(i => i.stockKnownCount === 0)

  return (
    <Section title="備貨 vs 實際銷售">
      {withStock.map(item => {
        const sellOutRate = item.soldOutCount / item.stockKnownCount
        const avgRemain = Math.round(item.totalRemaining / item.stockKnownCount)
        const avgThrough = item.totalStock > 0
          ? Math.round((1 - item.totalRemaining / item.totalStock) * 100) : 100
        const missingDays = item.appearances - item.stockKnownCount

        let tag = '', tagColor = '', tagBg = ''
        if (sellOutRate >= 0.8) { tag = '常賣完'; tagColor = '#c0392b'; tagBg = '#fdf2f2' }
        else if (avgThrough < 50) { tag = '常剩很多'; tagColor = '#1a5f8a'; tagBg = '#d0eaf8' }

        return (
          <div key={item.name} style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#333' }}>{item.name}</span>
              {tag && (
                <span style={{
                  fontSize: '11px', fontWeight: 'bold', color: tagColor,
                  background: tagBg, padding: '2px 6px', borderRadius: '4px',
                }}>{tag}</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
              {item.stockKnownCount} 天 · 賣完 {item.soldOutCount} 次（{Math.round(sellOutRate * 100)}%）·
              平均剩 {avgRemain} · 售完率 {avgThrough}%
              {missingDays > 0 && (
                <span style={{ color: '#bbb' }}> · 另 {missingDays} 天無備貨資料</span>
              )}
            </div>
          </div>
        )
      })}
      {noStock.map(item => (
        <div key={item.name} style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#999' }}>{item.name}</span>
            <span style={{
              fontSize: '11px', color: '#bbb', background: '#f5f5f5',
              padding: '2px 6px', borderRadius: '4px',
            }}>無備貨資料</span>
          </div>
          <div style={{ fontSize: '12px', color: '#bbb', marginTop: '3px' }}>
            共 {item.appearances} 天記錄
          </div>
        </div>
      ))}
    </Section>
  )
}

// ── Day of Week Effect ────────────────────────────────────────
function DayOfWeekEffect({ history }) {
  const groups = Array.from({ length: 7 }, () => [])
  for (const entry of history) {
    groups[parseDate(entry.date).getDay()].push(entry.totalRevenue)
  }
  const bars = groups.map((g, i) => ({
    label: DOW[i],
    value: g.length ? Math.round(g.reduce((s, v) => s + v, 0) / g.length) : 0,
  }))
  return (
    <Section title="星期幾效應（平均營收）">
      <BarChart bars={bars} barWidth={56} chartH={100} color="#5b8fa8" />
      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
        依星期分組顯示平均日營收；灰色短線表示該星期尚無記錄
      </div>
    </Section>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalyticsTab() {
  const [history, setHistory] = useState(() => getDailyHistory())

  function refreshHistory() {
    setHistory(getDailyHistory())
  }

  return (
    <div style={{ padding: '12px' }}>
      <ImportPanel onImported={refreshHistory} />
      {history.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '15px', color: '#999', marginBottom: '8px' }}>
            還沒有足夠的歷史資料可以分析
          </div>
          <div style={{ fontSize: '13px', color: '#bbb' }}>
            每天換日後會自動記錄一筆，或使用上方按鈕匯入舊資料
          </div>
        </div>
      ) : (
        <>
          <RevenueTrend history={history} />
          <ItemRanking history={history} />
          <StockVsSales history={history} />
          <DayOfWeekEffect history={history} />
        </>
      )}
    </div>
  )
}
