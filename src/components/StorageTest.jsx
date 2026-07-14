import { useState, useEffect } from 'react'
import {
  generateId,
  getTodayItems, setTodayItems,
  getYesterdayItems, setYesterdayItems,
  getDayBeforeItems,
  getFavorites, setFavorites,
  checkAndRotate,
} from '../services/storage'

const btn = {
  margin: '4px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '13px',
}

export default function StorageTest() {
  const [log, setLog] = useState([])

  // Auto-read on mount so refresh immediately shows what's in storage.
  // This is the same pattern real UI components must follow:
  //   useState(() => getTodayItems())  or  useEffect → setState
  useEffect(() => {
    readAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function print(label, value) {
    const msg = `[${label}] ${JSON.stringify(value, null, 2)}`
    console.log(msg)
    setLog(prev => [msg, ...prev].slice(0, 20))
  }

  function addRegularItem() {
    const items = getTodayItems()
    const newItem = {
      id: generateId(),
      type: 'regular',
      name: '測試三明治',
      stock: 10,
      price: 35,
      sold: 0,
    }
    setTodayItems([...items, newItem])
    print('新增一般品項', newItem)
  }

  function addDrinkItem() {
    const items = getTodayItems()
    const newItem = {
      id: generateId(),
      type: 'drink',
      name: '測試紅茶',
      stock: 20,
      comboPrice: 25,
      aLaCartePrice: 35,
      comboSold: 0,
      aLaCarteSold: 0,
    }
    setTodayItems([...items, newItem])
    print('新增飲料品項', newItem)
  }

  function addFavorite() {
    const favs = getFavorites()
    const newFav = {
      id: generateId(),
      type: 'regular',
      name: '常用培根蛋',
      defaultStock: 15,
      defaultPrice: 40,
    }
    setFavorites([...favs, newFav])
    print('新增常用品項', newFav)
  }

  function readAll() {
    print('今天', getTodayItems())
    print('昨天', getYesterdayItems())
    print('前天', getDayBeforeItems())
    print('常用品項', getFavorites())
  }

  function simulateRotate() {
    // Set last_date to yesterday so checkAndRotate sees a date change and actually rotates.
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = yesterday.getFullYear()
    const m = String(yesterday.getMonth() + 1).padStart(2, '0')
    const d = String(yesterday.getDate()).padStart(2, '0')
    localStorage.setItem('mos_last_date', JSON.stringify(`${y}-${m}-${d}`))

    const rotated = checkAndRotate()
    print('換日模擬結果', {
      rotated,
      今天: getTodayItems(),
      昨天: getYesterdayItems(),
      前天: getDayBeforeItems(),
    })
  }

  function clearAll() {
    ;['mos_today', 'mos_yesterday', 'mos_daybefore', 'mos_favorites', 'mos_last_date'].forEach(k =>
      localStorage.removeItem(k)
    )
    print('清除所有資料', '完成')
  }

  return (
    <div style={{ margin: '1rem', padding: '1rem', border: '2px dashed #aaa', borderRadius: '8px', background: '#fffbe6' }}>
      <strong style={{ display: 'block', marginBottom: '8px' }}>🧪 StorageTest（測試用，稍後移除）</strong>
      <div>
        <button style={btn} onClick={addRegularItem}>＋ 一般品項</button>
        <button style={btn} onClick={addDrinkItem}>＋ 飲料品項</button>
        <button style={btn} onClick={addFavorite}>＋ 常用品項</button>
        <button style={{ ...btn, background: '#e0f0ff' }} onClick={readAll}>讀取全部</button>
        <button style={{ ...btn, background: '#ffe0e0' }} onClick={clearAll}>清除全部</button>
        <button style={{ ...btn, background: '#f0e0ff' }} onClick={simulateRotate}>模擬換日</button>
      </div>
      <pre style={{ marginTop: '10px', fontSize: '11px', maxHeight: '200px', overflowY: 'auto', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
        {log.join('\n---\n') || '（點按鈕後結果顯示在這裡，同時也輸出到 console）'}
      </pre>
    </div>
  )
}
