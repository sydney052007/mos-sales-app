import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { calcRemaining } from '../logic/itemUtils'
import { getFavorites } from '../services/storage'
import { QuickCreateModal } from './QuickCreateModal'

// ── Validation helpers ────────────────────────────────────────
function validName(s) { return s.trim().length > 0 }
function validNum(s)  { return s !== '' && !isNaN(Number(s)) && Number(s) >= 0 }

// ── AddItemForm ───────────────────────────────────────────────
const EMPTY = { type: 'regular', name: '', stock: '', price: '', comboPrice: '', aLaCartePrice: '' }

function AddItemForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [showSecondPrice, setShowSecondPrice] = useState(false)

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }
  function setType(val) { set('type', val); setErr(''); setShowSecondPrice(false) }

  function submit() {
    if (!validName(form.name)) { setErr('品項名稱不能空白'); return }
    if (!validNum(form.stock)) { setErr('備貨數量須為 0 以上的數字'); return }
    if (form.type === 'regular') {
      if (!validNum(form.price)) { setErr('單價須為 0 以上的數字'); return }
      onAdd('regular', form.name.trim(), Number(form.stock), Number(form.price))
    } else {
      if (!validNum(form.comboPrice)) { setErr('價格須為 0 以上的數字'); return }
      if (showSecondPrice && !validNum(form.aLaCartePrice)) { setErr('單點價須為 0 以上的數字'); return }
      onAdd('drink', form.name.trim(), Number(form.stock), Number(form.comboPrice), showSecondPrice ? Number(form.aLaCartePrice) : null)
    }
  }

  function handleKey(e) { if (e.key === 'Enter') submit() }
  const isDrink = form.type === 'drink'

  return (
    <div style={s.formBox}>
      <div style={s.formTitle}>新增品項</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {[['regular', '一般品項'], ['drink', '飲料']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setType(val)}
            style={{
              flex: 1, padding: '9px',
              border: `2px solid ${form.type === val ? '#c0392b' : '#ddd'}`,
              background: form.type === val ? '#fdf2f2' : '#fff',
              color: form.type === val ? '#c0392b' : '#888',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              fontWeight: form.type === val ? 'bold' : 'normal',
            }}
          >{label}</button>
        ))}
      </div>

      <FormRow label="名稱">
        <input style={s.inp} placeholder="品項名稱" value={form.name}
          onChange={e => { set('name', e.target.value); setErr('') }}
          onKeyDown={handleKey} autoFocus />
      </FormRow>
      <FormRow label="備貨量">
        <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="0"
          value={form.stock} onChange={e => { set('stock', e.target.value); setErr('') }}
          onKeyDown={handleKey} />
      </FormRow>
      {!isDrink ? (
        <FormRow label="單價">
          <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
            value={form.price} onChange={e => { set('price', e.target.value); setErr('') }}
            onKeyDown={handleKey} />
        </FormRow>
      ) : (
        <>
          <FormRow label={showSecondPrice ? '套餐價' : '價格'}>
            <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
              value={form.comboPrice} onChange={e => { set('comboPrice', e.target.value); setErr('') }}
              onKeyDown={handleKey} />
          </FormRow>
          {showSecondPrice ? (
            <>
              <FormRow label="單點價">
                <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
                  value={form.aLaCartePrice} onChange={e => { set('aLaCartePrice', e.target.value); setErr('') }}
                  onKeyDown={handleKey} />
              </FormRow>
              <div style={{ marginBottom: '10px' }}>
                <button type="button" onClick={() => { setShowSecondPrice(false); set('aLaCartePrice', '') }}
                  style={{ fontSize: '13px', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  － 移除第二種價格
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '10px' }}>
              <button type="button" onClick={() => setShowSecondPrice(true)}
                style={{ fontSize: '13px', color: '#5b8fa8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ＋ 加第二種價格
              </button>
            </div>
          )}
        </>
      )}
      {err && <div style={s.errMsg}>{err}</div>}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={submit} style={s.submitBtn}>＋ 新增</button>
        <button onClick={onCancel} style={s.cancelBtn}>取消</button>
      </div>
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <label style={{ fontSize: '14px', color: '#555', width: '52px', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  )
}

// ── EditForm ──────────────────────────────────────────────────
function EditForm({ item, onSave, onCancel }) {
  const isDrink = item.type === 'drink'
  const hasDualPrice = isDrink && item.comboPrice != null && item.aLaCartePrice != null
  const [showSecondPrice, setShowSecondPrice] = useState(hasDualPrice)
  const [form, setForm] = useState({
    name:          item.name,
    stock:         String(item.stock),
    price:         String(item.price ?? ''),
    comboPrice:    String(item.comboPrice ?? ''),
    aLaCartePrice: String(item.aLaCartePrice ?? ''),
  })
  const [err, setErr] = useState('')

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); setErr('') }

  function save() {
    if (!validName(form.name))  { setErr('名稱不能空白'); return }
    if (!validNum(form.stock))  { setErr('備貨量須為 0 以上的數字'); return }
    if (!isDrink) {
      if (!validNum(form.price)) { setErr('單價須為 0 以上的數字'); return }
      onSave({ name: form.name.trim(), stock: Number(form.stock), price: Number(form.price) })
    } else {
      if (!validNum(form.comboPrice)) { setErr('價格須為 0 以上的數字'); return }
      if (showSecondPrice && !validNum(form.aLaCartePrice)) { setErr('單點價須為 0 以上的數字'); return }
      onSave({
        name: form.name.trim(),
        stock: Number(form.stock),
        comboPrice: Number(form.comboPrice),
        aLaCartePrice: showSecondPrice ? Number(form.aLaCartePrice) : null,
        ...(showSecondPrice ? {} : { aLaCarteSold: 0 }),
      })
    }
  }

  function handleKey(e) { if (e.key === 'Enter') save() }

  return (
    <div>
      <EditRow label="名稱">
        <input style={s.editInp} value={form.name}
          onChange={e => set('name', e.target.value)} onKeyDown={handleKey} autoFocus />
      </EditRow>
      <EditRow label="備貨量">
        <input style={{ ...s.editInp, width: '100px' }} type="number" min="0"
          value={form.stock} onChange={e => set('stock', e.target.value)} onKeyDown={handleKey} />
      </EditRow>
      {!isDrink ? (
        <EditRow label="單價">
          <input style={{ ...s.editInp, width: '100px' }} type="number" min="0"
            value={form.price} onChange={e => set('price', e.target.value)} onKeyDown={handleKey} />
        </EditRow>
      ) : (
        <>
          <EditRow label={showSecondPrice ? '套餐價' : '價格'}>
            <input style={{ ...s.editInp, width: '100px' }} type="number" min="0"
              value={form.comboPrice} onChange={e => set('comboPrice', e.target.value)} onKeyDown={handleKey} />
          </EditRow>
          {showSecondPrice ? (
            <>
              <EditRow label="單點價">
                <input style={{ ...s.editInp, width: '100px' }} type="number" min="0"
                  value={form.aLaCartePrice} onChange={e => set('aLaCartePrice', e.target.value)} onKeyDown={handleKey} />
              </EditRow>
              <div style={{ marginBottom: '8px' }}>
                <button type="button" onClick={() => { setShowSecondPrice(false); set('aLaCartePrice', '') }}
                  style={{ fontSize: '13px', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  － 移除第二種價格
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '8px' }}>
              <button type="button" onClick={() => setShowSecondPrice(true)}
                style={{ fontSize: '13px', color: '#5b8fa8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ＋ 加第二種價格
              </button>
            </div>
          )}
        </>
      )}
      {err && <div style={s.errMsg}>{err}</div>}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={save} style={s.saveBtn}>儲存</button>
        <button onClick={onCancel} style={s.cancelBtn}>取消</button>
      </div>
    </div>
  )
}

function EditRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <label style={{ fontSize: '14px', color: '#555', width: '52px', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  )
}

// ── Field (expanded area) ─────────────────────────────────────
function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={s.fieldValue}>{value}</span>
    </div>
  )
}

// ── RegularRow ────────────────────────────────────────────────
function RegularRow({ item, today }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const rem = calcRemaining(item)
  const remColor = rem < 0 ? '#c0392b' : rem === 0 ? '#aaa' : '#27ae60'

  function handleDelete() {
    if (window.confirm(`確定要刪除「${item.name}」？`)) today.remove(item.id)
  }

  return (
    <div style={s.row}>
      {/* Collapsed row — tap left area to expand */}
      <div style={s.rowMain} onClick={() => !editing && setExpanded(v => !v)}>
        <span style={s.badgeRegular}>一般</span>
        <div style={s.nameBlock}>
          <span style={s.rowName}>{item.name}</span>
          <span style={s.rowPrice}>${item.price}</span>
        </div>
        <div style={s.remBlock}>
          <span style={s.remLabel}>剩</span>
          <span style={{ ...s.remValue, color: remColor }}>{rem}</span>
        </div>
        <div style={s.soldBlock} onClick={e => e.stopPropagation()}>
          <button onClick={() => today.decSold(item.id)} style={s.minusBtn}>－</button>
          <span style={s.soldCount}>{item.sold}</span>
          <button onClick={() => today.incSold(item.id)} style={s.plusBtn}>＋</button>
        </div>
      </div>

      {/* Expanded: details + edit/delete */}
      {expanded && (
        <div style={s.expandedArea}>
          {!editing ? (
            <>
              <div style={s.fieldRow}>
                <Field label="備貨" value={item.stock} />
                <Field label="單價" value={`$${item.price}`} />
                <Field label="已售" value={item.sold} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setEditing(true)} style={s.actionBtn}>編輯</button>
                <button
                  onClick={handleDelete}
                  style={{ ...s.actionBtn, color: '#c0392b', borderColor: '#e8b4b0' }}
                >刪除</button>
              </div>
            </>
          ) : (
            <EditForm
              item={item}
              onSave={changes => { today.edit(item.id, changes); setEditing(false); setExpanded(false) }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── DrinkRow ──────────────────────────────────────────────────
function DrinkRow({ item, today }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const rem = calcRemaining(item)
  const remColor = rem < 0 ? '#c0392b' : rem === 0 ? '#aaa' : '#27ae60'
  const hasDualPrice = item.comboPrice != null && item.aLaCartePrice != null

  function handleDelete() {
    if (window.confirm(`確定要刪除「${item.name}」？`)) today.remove(item.id)
  }

  return (
    <div style={{ ...s.row, background: '#f5fbff', borderColor: '#b8d8f0' }}>
      {/* Collapsed row */}
      <div style={s.rowMain} onClick={() => !editing && setExpanded(v => !v)}>
        <span style={s.badgeDrink}>飲料</span>
        <div style={s.nameBlock}>
          <span style={s.rowName}>{item.name}</span>
          <span style={s.rowPrice}>
            {hasDualPrice
              ? `套$${item.comboPrice}/單$${item.aLaCartePrice}`
              : `$${item.comboPrice ?? item.aLaCartePrice}`}
          </span>
        </div>
        <div style={s.remBlock}>
          <span style={s.remLabel}>剩</span>
          <span style={{ ...s.remValue, color: remColor }}>{rem}</span>
        </div>
        {hasDualPrice ? (
          <div style={s.drinkButtons} onClick={e => e.stopPropagation()}>
            <div style={s.drinkBtnRow}>
              <span style={s.drinkLabel}>套</span>
              <button onClick={() => today.decSold(item.id, 'comboSold')} style={s.minusBtn}>－</button>
              <span style={s.soldCount}>{item.comboSold}</span>
              <button onClick={() => today.incSold(item.id, 'comboSold')} style={s.plusBtn}>＋</button>
            </div>
            <div style={s.drinkBtnRow}>
              <span style={s.drinkLabel}>單</span>
              <button onClick={() => today.decSold(item.id, 'aLaCarteSold')} style={s.minusBtn}>－</button>
              <span style={s.soldCount}>{item.aLaCarteSold}</span>
              <button onClick={() => today.incSold(item.id, 'aLaCarteSold')} style={s.plusBtn}>＋</button>
            </div>
          </div>
        ) : (
          <div style={s.soldBlock} onClick={e => e.stopPropagation()}>
            <button onClick={() => today.decSold(item.id, 'comboSold')} style={s.minusBtn}>－</button>
            <span style={s.soldCount}>{item.comboSold ?? 0}</span>
            <button onClick={() => today.incSold(item.id, 'comboSold')} style={s.plusBtn}>＋</button>
          </div>
        )}
      </div>

      {/* Expanded: details + edit/delete */}
      {expanded && (
        <div style={{ ...s.expandedArea, background: '#edf6ff', borderColor: '#c8e0f0' }}>
          {!editing ? (
            <>
              <div style={s.fieldRow}>
                {hasDualPrice ? (
                  <>
                    <Field label="備貨" value={item.stock} />
                    <Field label="套餐價" value={`$${item.comboPrice}`} />
                    <Field label="單點價" value={`$${item.aLaCartePrice}`} />
                    <Field label="套餐售" value={item.comboSold} />
                    <Field label="單點售" value={item.aLaCarteSold} />
                  </>
                ) : (
                  <>
                    <Field label="備貨" value={item.stock} />
                    <Field label="價格" value={`$${item.comboPrice}`} />
                    <Field label="已售" value={item.comboSold ?? 0} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setEditing(true)} style={s.actionBtn}>編輯</button>
                <button
                  onClick={handleDelete}
                  style={{ ...s.actionBtn, color: '#c0392b', borderColor: '#e8b4b0' }}
                >刪除</button>
              </div>
            </>
          ) : (
            <EditForm
              item={item}
              onSave={changes => { today.edit(item.id, changes); setEditing(false); setExpanded(false) }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── TodayTab ──────────────────────────────────────────────────
export default function TodayTab() {
  const today = useToday()
  const [showAdd, setShowAdd] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  function handleAdd(type, name, stock, ...prices) {
    if (type === 'regular') {
      today.addRegular(name, stock, prices[0])
    } else {
      today.addDrink(name, stock, prices[0], prices[1])
    }
    setShowAdd(false)
  }

  // Sort: remaining === 0 goes to the bottom; original order preserved within each group
  const sorted = [...today.items].sort((a, b) => {
    const rA = calcRemaining(a), rB = calcRemaining(b)
    if (rA === 0 && rB !== 0) return 1
    if (rA !== 0 && rB === 0) return -1
    return 0
  })

  return (
    <div style={{ padding: '12px' }}>

      {/* Top action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{
            flex: 1, padding: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
            background: showAdd ? '#fdf2f2' : '#c0392b',
            color: showAdd ? '#c0392b' : '#fff',
            border: '2px solid #c0392b', borderRadius: '10px',
          }}
        >
          {showAdd ? '✕ 取消新增' : '＋ 新增品項'}
        </button>
        <button
          onClick={() => today.applyFavorites()}
          style={{
            flex: 1, padding: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
            background: '#fff', color: '#c0392b',
            border: '2px solid #c0392b', borderRadius: '10px',
          }}
        >
          套用常用品項
        </button>
      </div>
      <button
        onClick={() => setShowQuickCreate(true)}
        style={{
          width: '100%', padding: '11px', fontSize: '14px', fontWeight: 'bold',
          cursor: 'pointer', marginBottom: '12px',
          background: '#fff', color: '#2c7a4b',
          border: '2px solid #2c7a4b', borderRadius: '10px',
        }}
      >
        ✎ 文字快速建立品項
      </button>

      {/* Add form */}
      {showAdd && <AddItemForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

      {/* Quick-create modal */}
      {showQuickCreate && (
        <QuickCreateModal
          favorites={getFavorites()}
          todayItems={today.items}
          onConfirm={(rows, conflictMode) => today.bulkApplyParsed(rows, conflictMode)}
          onClose={() => setShowQuickCreate(false)}
        />
      )}

      {/* Empty state */}
      {today.items.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#aaa' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
          <div style={{ fontSize: '15px', color: '#999' }}>今天還沒有品項</div>
        </div>
      )}

      {/* Item count */}
      {today.items.length > 0 && (
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
          今天共 {today.items.length} 筆品項
        </div>
      )}

      {/* Item list — single-column rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.map(item =>
          item.type === 'drink'
            ? <DrinkRow key={item.id} item={item} today={today} />
            : <RegularRow key={item.id} item={item} today={today} />
        )}
      </div>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  formBox: {
    background: '#fafafa', border: '2px solid #c0392b',
    borderRadius: '12px', padding: '16px', marginBottom: '14px',
  },
  formTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', color: '#1a1a1a' },
  inp: {
    padding: '8px 10px', fontSize: '15px', border: '1px solid #ccc',
    borderRadius: '7px', flex: 1, minWidth: 0, boxSizing: 'border-box',
  },
  submitBtn: {
    flex: 1, padding: '11px', fontSize: '15px', fontWeight: 'bold',
    background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
  },
  // ── Row layout ──
  row: {
    background: '#fff', border: '1px solid #e0e0e0',
    borderRadius: '10px', overflow: 'hidden',
  },
  rowMain: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', cursor: 'pointer', userSelect: 'none',
  },
  nameBlock: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
    minWidth: 0,
  },
  rowName: {
    fontSize: '17px', fontWeight: 'bold', color: '#1a1a1a',
    overflowWrap: 'break-word',
  },
  rowPrice: {
    fontSize: '12px', color: '#888', marginTop: '1px',
  },
  remBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    flexShrink: 0, minWidth: '36px',
  },
  remLabel: { fontSize: '10px', color: '#bbb' },
  remValue: { fontSize: '22px', fontWeight: 'bold', lineHeight: 1 },
  soldBlock: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  soldCount: {
    fontSize: '18px', fontWeight: 'bold',
    width: '28px', textAlign: 'center', flexShrink: 0,
  },
  minusBtn: {
    width: '44px', height: '44px', fontSize: '20px',
    border: '1px solid #d0d0d0', borderRadius: '8px',
    background: '#f4f4f4', cursor: 'pointer', flexShrink: 0,
  },
  plusBtn: {
    width: '44px', height: '44px', fontSize: '20px',
    border: '1px solid #a93226', borderRadius: '8px',
    background: '#c0392b', color: '#fff', cursor: 'pointer', flexShrink: 0,
  },
  drinkButtons: { display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 },
  drinkBtnRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  drinkLabel: {
    fontSize: '11px', fontWeight: 'bold', color: '#5b8fa8',
    width: '16px', flexShrink: 0, textAlign: 'center',
  },
  // ── Expanded area ──
  expandedArea: {
    borderTop: '1px solid #efefef', padding: '12px 14px', background: '#fafafa',
  },
  fieldRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  fieldLabel: { fontSize: '11px', color: '#999', marginBottom: '2px' },
  fieldValue: { fontSize: '15px', color: '#444' },
  actionBtn: {
    padding: '6px 14px', fontSize: '13px', background: '#fff', color: '#444',
    border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer',
  },
  // ── Shared ──
  badgeRegular: {
    fontSize: '11px', fontWeight: 'bold', color: '#7a5c1e', background: '#fef3cd',
    padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
  },
  badgeDrink: {
    fontSize: '11px', fontWeight: 'bold', color: '#1a5f8a', background: '#d0eaf8',
    padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
  },
  editInp: {
    padding: '7px 10px', fontSize: '15px', border: '1px solid #ccc',
    borderRadius: '7px', flex: 1, minWidth: 0, boxSizing: 'border-box',
  },
  errMsg: {
    color: '#c0392b', fontSize: '13px', marginTop: '4px',
    padding: '5px 8px', background: '#fdf2f2', borderRadius: '6px',
  },
  saveBtn: {
    flex: 1, padding: '9px', fontSize: '14px', fontWeight: 'bold',
    background: '#27ae60', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 16px', fontSize: '14px', background: '#fff', color: '#666',
    border: '1px solid #ccc', borderRadius: '7px', cursor: 'pointer',
  },
}
