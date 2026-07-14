import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { calcRemaining } from '../logic/itemUtils'
import { getFavorites, setFavorites, generateId } from '../services/storage'

const s = {
  wrap:    { margin: '1rem', padding: '1rem', border: '2px dashed #6a9', borderRadius: '8px', background: '#f0fff4' },
  card:    { margin: '6px 0', padding: '8px 10px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' },
  editBox: { marginTop: '6px', padding: '6px 8px', background: '#f5f5f5', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' },
  row:     { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' },
  btn:     { padding: '3px 8px', cursor: 'pointer', fontSize: '12px' },
  ctrl:    { padding: '5px 10px', cursor: 'pointer', fontSize: '13px', margin: '3px' },
  inp:     { padding: '3px 6px', fontSize: '12px', width: '90px' },
  sel:     { padding: '3px 6px', fontSize: '12px' },
  log:     { marginTop: '8px', fontSize: '11px', maxHeight: '120px', overflowY: 'auto', background: '#f9f9f9', padding: '6px', borderRadius: '4px' },
  tag:     (t) => ({ color: t === 'drink' ? '#0066cc' : '#884400', fontWeight: 'bold' }),
  rem:     (r) => ({ color: r < 0 ? 'red' : r === 0 ? '#888' : 'green' }),
  save:    { padding: '3px 10px', cursor: 'pointer', fontSize: '12px', background: '#d4edda', border: '1px solid #aaa', borderRadius: '3px' },
  cancel:  { padding: '3px 8px', cursor: 'pointer', fontSize: '12px', background: '#fff3cd', border: '1px solid #aaa', borderRadius: '3px' },
}

// ── 今日品項卡片（含 inline 編輯）──────────────────────────
function ItemCard({ item, today }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const rem = calcRemaining(item)
  const isRegular = item.type === 'regular'

  function openEdit() {
    setForm({
      name: item.name,
      stock: String(item.stock),
      price: String(item.price ?? ''),
      comboPrice: String(item.comboPrice ?? ''),
      aLaCartePrice: String(item.aLaCartePrice ?? ''),
    })
    setEditing(true)
  }

  function save() {
    if (!form.name.trim()) return
    const changes = { name: form.name.trim(), stock: Math.max(0, Number(form.stock) || 0) }
    if (isRegular) changes.price = Number(form.price) || 0
    else {
      changes.comboPrice = Number(form.comboPrice) || 0
      changes.aLaCartePrice = Number(form.aLaCartePrice) || 0
    }
    today.edit(item.id, changes)
    setEditing(false)
  }

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  return (
    <div style={s.card}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <span style={s.tag(item.type)}>[{isRegular ? '一般' : '飲料'}]</span>{' '}
          <strong>{item.name}</strong>{' '}
          備貨:{item.stock}{' '}
          {isRegular
            ? <>價格:{item.price} 已售:{item.sold}</>
            : <>套餐:{item.comboPrice}/單點:{item.aLaCartePrice} 套餐售:{item.comboSold} 單點售:{item.aLaCarteSold}</>}
          {' '}<span style={s.rem(rem)}>剩餘:{rem}</span>
        </span>
        {!editing
          ? <button style={s.btn} onClick={openEdit}>編輯</button>
          : <button style={s.cancel} onClick={() => setEditing(false)}>取消</button>}
      </div>

      {/* Inline edit form */}
      {editing && (
        <div style={s.editBox}>
          <label style={{ fontSize: '12px', color: '#555' }}>名稱</label>
          <input style={s.inp} value={form.name} onChange={e => set('name', e.target.value)} />
          <label style={{ fontSize: '12px', color: '#555' }}>備貨量</label>
          <input style={{ ...s.inp, width: '60px' }} type="number" value={form.stock} onChange={e => set('stock', e.target.value)} />
          {isRegular ? (
            <>
              <label style={{ fontSize: '12px', color: '#555' }}>單價</label>
              <input style={{ ...s.inp, width: '60px' }} type="number" value={form.price} onChange={e => set('price', e.target.value)} />
            </>
          ) : (
            <>
              <label style={{ fontSize: '12px', color: '#555' }}>套餐價</label>
              <input style={{ ...s.inp, width: '60px' }} type="number" value={form.comboPrice} onChange={e => set('comboPrice', e.target.value)} />
              <label style={{ fontSize: '12px', color: '#555' }}>單點價</label>
              <input style={{ ...s.inp, width: '60px' }} type="number" value={form.aLaCartePrice} onChange={e => set('aLaCartePrice', e.target.value)} />
            </>
          )}
          <button style={s.save} onClick={save}>儲存</button>
        </div>
      )}

      {/* Action buttons (hidden while editing) */}
      {!editing && (
        <div style={s.row}>
          {isRegular ? (
            <>
              <button style={s.btn} onClick={() => today.decSold(item.id)}>已售 -1</button>
              <button style={s.btn} onClick={() => today.incSold(item.id)}>已售 +1</button>
            </>
          ) : (
            <>
              <button style={s.btn} onClick={() => today.decSold(item.id, 'comboSold')}>套餐 -1</button>
              <button style={s.btn} onClick={() => today.incSold(item.id, 'comboSold')}>套餐 +1</button>
              <button style={s.btn} onClick={() => today.decSold(item.id, 'aLaCarteSold')}>單點 -1</button>
              <button style={s.btn} onClick={() => today.incSold(item.id, 'aLaCarteSold')}>單點 +1</button>
            </>
          )}
          <button style={s.btn} onClick={() => today.edit(item.id, { stock: Math.max(0, item.stock - 1) })}>備貨 -1</button>
          <button style={s.btn} onClick={() => today.edit(item.id, { stock: item.stock + 1 })}>備貨 +1</button>
          <button style={{ ...s.btn, color: 'red' }} onClick={() => today.remove(item.id)}>刪除</button>
        </div>
      )}
    </div>
  )
}

// ── 常用品項範本管理（含 inline 編輯）──────────────────────
const emptyForm = { name: '', type: 'regular', defaultStock: '', defaultPrice: '', defaultComboPrice: '', defaultALaCartePrice: '' }

function FavoritesManager({ onLog }) {
  const [favs, setFavsState] = useState(() => getFavorites())
  const [addForm, setAddForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  function persist(updated) {
    setFavorites(updated)
    setFavsState(updated)
  }

  function setA(field, val) { setAddForm(p => ({ ...p, [field]: val })) }
  function setE(field, val) { setEditForm(p => ({ ...p, [field]: val })) }

  function addFav() {
    if (!addForm.name.trim()) return
    const base = { id: generateId(), type: addForm.type, name: addForm.name.trim(), defaultStock: Number(addForm.defaultStock) || 0 }
    const item = addForm.type === 'drink'
      ? { ...base, defaultComboPrice: Number(addForm.defaultComboPrice) || 0, defaultALaCartePrice: Number(addForm.defaultALaCartePrice) || 0 }
      : { ...base, defaultPrice: Number(addForm.defaultPrice) || 0 }
    persist([...favs, item])
    setAddForm(emptyForm)
    onLog(`新增常用品項：${item.name}`)
  }

  function openEdit(fav) {
    setEditingId(fav.id)
    setEditForm({
      name: fav.name,
      type: fav.type,
      defaultStock: String(fav.defaultStock ?? ''),
      defaultPrice: String(fav.defaultPrice ?? ''),
      defaultComboPrice: String(fav.defaultComboPrice ?? ''),
      defaultALaCartePrice: String(fav.defaultALaCartePrice ?? ''),
    })
  }

  function saveEdit(id) {
    if (!editForm.name.trim()) return
    const base = { name: editForm.name.trim(), type: editForm.type, defaultStock: Number(editForm.defaultStock) || 0 }
    const changes = editForm.type === 'drink'
      ? { ...base, defaultComboPrice: Number(editForm.defaultComboPrice) || 0, defaultALaCartePrice: Number(editForm.defaultALaCartePrice) || 0 }
      : { ...base, defaultPrice: Number(editForm.defaultPrice) || 0 }
    persist(favs.map(f => f.id === id ? { ...f, ...changes } : f))
    setEditingId(null)
    onLog(`已修改常用品項：${editForm.name}`)
  }

  function removeFav(id, name) {
    persist(favs.filter(f => f.id !== id))
    onLog(`已刪除常用品項：${name}`)
  }

  return (
    <div style={{ margin: '8px 0', padding: '8px', background: '#fffbe6', borderRadius: '6px', fontSize: '13px' }}>
      <strong>常用品項範本</strong>（共 {favs.length} 筆）

      {favs.length === 0
        ? <div style={{ color: '#888', margin: '4px 0' }}>（尚無範本）</div>
        : favs.map(f => (
            <div key={f.id}>
              {/* Normal row */}
              {editingId !== f.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0', flexWrap: 'wrap' }}>
                  <span style={s.tag(f.type)}>[{f.type === 'drink' ? '飲料' : '一般'}]</span>
                  <span><strong>{f.name}</strong></span>
                  <span style={{ color: '#666' }}>
                    備貨{f.defaultStock}{' '}
                    {f.type === 'drink'
                      ? `套$${f.defaultComboPrice}/單$${f.defaultALaCartePrice}`
                      : `$${f.defaultPrice}`}
                  </span>
                  <button style={{ ...s.btn, fontSize: '11px' }} onClick={() => openEdit(f)}>編輯</button>
                  <button style={{ ...s.btn, color: 'red', fontSize: '11px' }} onClick={() => removeFav(f.id, f.name)}>刪除</button>
                </div>
              ) : (
                /* Inline edit row */
                <div style={{ ...s.editBox, margin: '4px 0' }}>
                  <input style={s.inp} value={editForm.name} onChange={e => setE('name', e.target.value)} placeholder="名稱" />
                  <select style={s.sel} value={editForm.type} onChange={e => setE('type', e.target.value)}>
                    <option value="regular">一般</option>
                    <option value="drink">飲料</option>
                  </select>
                  <input style={{ ...s.inp, width: '55px' }} type="number" value={editForm.defaultStock} onChange={e => setE('defaultStock', e.target.value)} placeholder="備貨量" />
                  {editForm.type === 'regular'
                    ? <input style={{ ...s.inp, width: '55px' }} type="number" value={editForm.defaultPrice} onChange={e => setE('defaultPrice', e.target.value)} placeholder="單價" />
                    : <>
                        <input style={{ ...s.inp, width: '60px' }} type="number" value={editForm.defaultComboPrice} onChange={e => setE('defaultComboPrice', e.target.value)} placeholder="套餐價" />
                        <input style={{ ...s.inp, width: '60px' }} type="number" value={editForm.defaultALaCartePrice} onChange={e => setE('defaultALaCartePrice', e.target.value)} placeholder="單點價" />
                      </>
                  }
                  <button style={s.save} onClick={() => saveEdit(f.id)}>儲存</button>
                  <button style={s.cancel} onClick={() => setEditingId(null)}>取消</button>
                </div>
              )}
            </div>
          ))
      }

      {/* Add new favorite form */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e0d080', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        <strong style={{ fontSize: '12px', marginRight: '4px' }}>新增：</strong>
        <input style={s.inp} placeholder="品項名稱" value={addForm.name} onChange={e => setA('name', e.target.value)} />
        <select style={s.sel} value={addForm.type} onChange={e => setA('type', e.target.value)}>
          <option value="regular">一般</option>
          <option value="drink">飲料</option>
        </select>
        <input style={{ ...s.inp, width: '55px' }} type="number" placeholder="備貨量" value={addForm.defaultStock} onChange={e => setA('defaultStock', e.target.value)} />
        {addForm.type === 'regular'
          ? <input style={{ ...s.inp, width: '55px' }} type="number" placeholder="單價" value={addForm.defaultPrice} onChange={e => setA('defaultPrice', e.target.value)} />
          : <>
              <input style={{ ...s.inp, width: '60px' }} type="number" placeholder="套餐價" value={addForm.defaultComboPrice} onChange={e => setA('defaultComboPrice', e.target.value)} />
              <input style={{ ...s.inp, width: '60px' }} type="number" placeholder="單點價" value={addForm.defaultALaCartePrice} onChange={e => setA('defaultALaCartePrice', e.target.value)} />
            </>
        }
        <button style={s.ctrl} onClick={addFav}>＋ 新增</button>
      </div>
    </div>
  )
}

// ── 主元件 ──────────────────────────────────────────────────
export default function BusinessLogicTest() {
  const today = useToday()
  const [log, setLog] = useState([])
  const [showFavs, setShowFavs] = useState(false)

  function print(msg) {
    console.log('[LogicTest]', msg)
    setLog(prev => [msg, ...prev].slice(0, 12))
  }

  function applyAndLog() {
    const before = today.items.length
    today.applyFavorites()
    print(`套用常用品項（套用前 ${before} 筆）`)
  }

  function simulateRotation() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    localStorage.setItem('mos_last_date', JSON.stringify(key))
    print(`已把日期改成昨天(${key})，請重新整理頁面確認換日`)
  }

  return (
    <div style={s.wrap}>
      <strong style={{ display: 'block', marginBottom: '8px' }}>
        🟢 業務邏輯測試（稍後移除）— 今天共 {today.items.length} 筆
      </strong>

      <div>
        <button style={s.ctrl} onClick={() => { today.addRegular('新品項', 10, 35); print('新增一般品項') }}>＋ 一般品項</button>
        <button style={s.ctrl} onClick={() => { today.addDrink('新飲料', 20, 25, 35); print('新增飲料品項') }}>＋ 飲料品項</button>
        <button style={{ ...s.ctrl, background: '#fffbe6' }} onClick={() => setShowFavs(v => !v)}>
          {showFavs ? '▲ 關閉範本管理' : '▼ 管理常用品項範本'}
        </button>
        <button style={{ ...s.ctrl, background: '#e0f0ff' }} onClick={applyAndLog}>套用常用品項</button>
        <button style={{ ...s.ctrl, background: '#f0e0ff' }} onClick={simulateRotation}>模擬換日（→重整）</button>
        <button style={{ ...s.ctrl, background: '#ffe0e0' }} onClick={() => { localStorage.setItem('mos_today', '[]'); window.location.reload() }}>清空今天</button>
      </div>

      {showFavs && <FavoritesManager onLog={print} />}

      {today.items.length === 0
        ? <p style={{ color: '#888', fontSize: '13px', margin: '8px 0' }}>（今天沒有品項）</p>
        : today.items.map(item => <ItemCard key={item.id} item={item} today={today} />)
      }

      <pre style={s.log}>{log.length ? log.join('\n') : '（操作記錄）'}</pre>
    </div>
  )
}
