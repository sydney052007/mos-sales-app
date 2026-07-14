import { useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'

// ── Validation helpers ────────────────────────────────────────

function validName(s) { return s.trim().length > 0 }
function validNum(s)  { return s !== '' && !isNaN(Number(s)) && Number(s) >= 0 }

// ── AddFavForm ────────────────────────────────────────────────

const EMPTY = { type: 'regular', name: '', defaultStock: '', defaultPrice: '', defaultComboPrice: '', defaultALaCartePrice: '' }

function AddFavForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [err, setErr]   = useState('')
  const [showSecondPrice, setShowSecondPrice] = useState(false)
  const isDrink = form.type === 'drink'

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); setErr('') }
  function setType(val) { setForm(p => ({ ...p, type: val })); setErr(''); setShowSecondPrice(false) }

  function submit() {
    if (!validName(form.name))         { setErr('名稱不能空白'); return }
    if (!validNum(form.defaultStock))  { setErr('備貨量須為 0 以上的數字'); return }
    if (!isDrink) {
      if (!validNum(form.defaultPrice)) { setErr('單價須為 0 以上的數字'); return }
      onAdd('regular', form.name.trim(), Number(form.defaultStock), Number(form.defaultPrice))
    } else {
      if (!validNum(form.defaultComboPrice)) { setErr('價格須為 0 以上的數字'); return }
      if (showSecondPrice && !validNum(form.defaultALaCartePrice)) { setErr('單點價須為 0 以上的數字'); return }
      onAdd('drink', form.name.trim(), Number(form.defaultStock), Number(form.defaultComboPrice), showSecondPrice ? Number(form.defaultALaCartePrice) : null)
    }
  }

  function handleKey(e) { if (e.key === 'Enter') submit() }

  return (
    <div style={s.formBox}>
      <div style={s.formTitle}>新增常用品項範本</div>

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
          >
            {label}
          </button>
        ))}
      </div>

      <FormRow label="名稱">
        <input style={s.inp} placeholder="品項名稱" value={form.name}
          onChange={e => set('name', e.target.value)} onKeyDown={handleKey} autoFocus />
      </FormRow>
      <FormRow label="預設備貨">
        <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="0"
          value={form.defaultStock} onChange={e => set('defaultStock', e.target.value)} onKeyDown={handleKey} />
      </FormRow>

      {!isDrink ? (
        <FormRow label="預設單價">
          <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
            value={form.defaultPrice} onChange={e => set('defaultPrice', e.target.value)} onKeyDown={handleKey} />
        </FormRow>
      ) : (
        <>
          <FormRow label={showSecondPrice ? '預設套餐價' : '預設價格'}>
            <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
              value={form.defaultComboPrice} onChange={e => set('defaultComboPrice', e.target.value)} onKeyDown={handleKey} />
          </FormRow>
          {showSecondPrice ? (
            <>
              <FormRow label="預設單點價">
                <input style={{ ...s.inp, width: '110px' }} type="number" min="0" placeholder="$"
                  value={form.defaultALaCartePrice} onChange={e => set('defaultALaCartePrice', e.target.value)} onKeyDown={handleKey} />
              </FormRow>
              <div style={{ marginBottom: '10px' }}>
                <button type="button" onClick={() => { setShowSecondPrice(false); set('defaultALaCartePrice', '') }}
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
      <label style={{ fontSize: '13px', color: '#555', width: '68px', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  )
}

// ── EditFavForm ───────────────────────────────────────────────

function EditFavForm({ fav, onSave, onCancel }) {
  const isDrink = fav.type === 'drink'
  const hasDualPrice = isDrink && fav.defaultComboPrice != null && fav.defaultALaCartePrice != null
  const [showSecondPrice, setShowSecondPrice] = useState(hasDualPrice)
  const [form, setForm] = useState({
    name:                 fav.name,
    defaultStock:         String(fav.defaultStock ?? ''),
    defaultPrice:         String(fav.defaultPrice ?? ''),
    defaultComboPrice:    String(fav.defaultComboPrice ?? ''),
    defaultALaCartePrice: String(fav.defaultALaCartePrice ?? ''),
  })
  const [err, setErr] = useState('')

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); setErr('') }

  function save() {
    if (!validName(form.name))        { setErr('名稱不能空白'); return }
    if (!validNum(form.defaultStock)) { setErr('備貨量須為 0 以上的數字'); return }
    if (!isDrink) {
      if (!validNum(form.defaultPrice)) { setErr('單價須為 0 以上的數字'); return }
      onSave({ name: form.name.trim(), defaultStock: Number(form.defaultStock), defaultPrice: Number(form.defaultPrice) })
    } else {
      if (!validNum(form.defaultComboPrice)) { setErr('價格須為 0 以上的數字'); return }
      if (showSecondPrice && !validNum(form.defaultALaCartePrice)) { setErr('單點價須為 0 以上的數字'); return }
      onSave({
        name: form.name.trim(),
        defaultStock: Number(form.defaultStock),
        defaultComboPrice: Number(form.defaultComboPrice),
        defaultALaCartePrice: showSecondPrice ? Number(form.defaultALaCartePrice) : null,
      })
    }
  }

  function handleKey(e) { if (e.key === 'Enter') save() }

  return (
    <div>
      <EditRow label="名稱">
        <input style={s.editInp} value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={handleKey} autoFocus />
      </EditRow>
      <EditRow label="預設備貨">
        <input style={{ ...s.editInp, width: '100px' }} type="number" min="0" value={form.defaultStock} onChange={e => set('defaultStock', e.target.value)} onKeyDown={handleKey} />
      </EditRow>
      {!isDrink ? (
        <EditRow label="預設單價">
          <input style={{ ...s.editInp, width: '100px' }} type="number" min="0" value={form.defaultPrice} onChange={e => set('defaultPrice', e.target.value)} onKeyDown={handleKey} />
        </EditRow>
      ) : (
        <>
          <EditRow label={showSecondPrice ? '預設套餐價' : '預設價格'}>
            <input style={{ ...s.editInp, width: '100px' }} type="number" min="0" value={form.defaultComboPrice} onChange={e => set('defaultComboPrice', e.target.value)} onKeyDown={handleKey} />
          </EditRow>
          {showSecondPrice ? (
            <>
              <EditRow label="預設單點價">
                <input style={{ ...s.editInp, width: '100px' }} type="number" min="0" value={form.defaultALaCartePrice} onChange={e => set('defaultALaCartePrice', e.target.value)} onKeyDown={handleKey} />
              </EditRow>
              <div style={{ marginBottom: '8px' }}>
                <button type="button" onClick={() => { setShowSecondPrice(false); set('defaultALaCartePrice', '') }}
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
      <label style={{ fontSize: '13px', color: '#555', width: '68px', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  )
}

// ── FavCard ───────────────────────────────────────────────────

function FavCard({ fav, favHook }) {
  const [editing, setEditing] = useState(false)
  const isDrink = fav.type === 'drink'
  const hasDualPrice = isDrink && fav.defaultComboPrice != null && fav.defaultALaCartePrice != null

  function handleDelete() {
    if (window.confirm(`確定要刪除範本「${fav.name}」？`)) favHook.remove(fav.id)
  }

  return (
    <div style={{ ...s.card, ...(isDrink ? s.drinkCard : {}) }}>
      <div style={s.cardHeader}>
        <span style={isDrink ? s.badgeDrink : s.badgeRegular}>{isDrink ? '飲料' : '一般'}</span>
        <span style={s.itemName}>{fav.name}</span>
      </div>

      {editing ? (
        <EditFavForm
          fav={fav}
          onSave={changes => { favHook.edit(fav.id, changes); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div style={s.fieldRow}>
            <Field label="備貨" value={fav.defaultStock} />
            {!isDrink
              ? <Field label="單價" value={`$${fav.defaultPrice}`} />
              : hasDualPrice
                ? <>
                    <Field label="套餐價" value={`$${fav.defaultComboPrice}`} />
                    <Field label="單點價" value={`$${fav.defaultALaCartePrice}`} />
                  </>
                : <Field label="價格" value={`$${fav.defaultComboPrice}`} />
            }
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditing(true)} style={s.actionBtn}>編輯</button>
              <button onClick={handleDelete} style={{ ...s.actionBtn, color: '#c0392b', borderColor: '#e8b4b0' }}>刪除</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={s.fieldValue}>{value}</span>
    </div>
  )
}

// ── FavoritesTab ──────────────────────────────────────────────

export default function FavoritesTab() {
  const favHook = useFavorites()
  const [showAdd, setShowAdd] = useState(false)

  function handleAdd(type, name, defaultStock, ...prices) {
    if (type === 'regular') {
      favHook.addRegular(name, defaultStock, prices[0])
    } else {
      favHook.addDrink(name, defaultStock, prices[0], prices[1])
    }
    setShowAdd(false)
  }

  return (
    <div style={{ padding: '12px' }}>

      <button
        onClick={() => setShowAdd(v => !v)}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '15px',
          fontWeight: 'bold',
          cursor: 'pointer',
          background: showAdd ? '#fdf2f2' : '#c0392b',
          color: showAdd ? '#c0392b' : '#fff',
          border: '2px solid #c0392b',
          borderRadius: '10px',
          marginBottom: '12px',
        }}
      >
        {showAdd ? '✕ 取消新增' : '＋ 新增範本'}
      </button>

      {showAdd && (
        <AddFavForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {favHook.favorites.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#aaa' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>⭐</div>
          <div style={{ fontSize: '15px' }}>還沒有常用品項範本</div>
          <div style={{ fontSize: '13px', marginTop: '6px', color: '#bbb' }}>
            新增後可在「今天」頁籤一鍵套用
          </div>
        </div>
      )}

      {favHook.favorites.length > 0 && (
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
          共 {favHook.favorites.length} 筆範本
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {favHook.favorites.map(fav => (
          <FavCard key={fav.id} fav={fav} favHook={favHook} />
        ))}
      </div>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const s = {
  formBox: {
    background: '#fafafa',
    border: '2px solid #c0392b',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '14px',
  },
  formTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '14px',
    color: '#1a1a1a',
  },
  inp: {
    padding: '8px 10px',
    fontSize: '15px',
    border: '1px solid #ccc',
    borderRadius: '7px',
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
  },
  editInp: {
    padding: '7px 10px',
    fontSize: '15px',
    border: '1px solid #ccc',
    borderRadius: '7px',
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
  },
  errMsg: {
    color: '#c0392b',
    fontSize: '13px',
    marginTop: '4px',
    padding: '5px 8px',
    background: '#fdf2f2',
    borderRadius: '6px',
  },
  submitBtn: {
    flex: 1,
    padding: '11px',
    fontSize: '15px',
    fontWeight: 'bold',
    background: '#c0392b',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '9px',
    fontSize: '14px',
    fontWeight: 'bold',
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 16px',
    fontSize: '14px',
    background: '#fff',
    color: '#666',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  drinkCard: {
    background: '#f0f8ff',
    borderColor: '#b8d8f0',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  itemName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  badgeRegular: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#7a5c1e',
    background: '#fef3cd',
    padding: '2px 7px',
    borderRadius: '4px',
    marginRight: '8px',
    flexShrink: 0,
  },
  badgeDrink: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1a5f8a',
    background: '#d0eaf8',
    padding: '2px 7px',
    borderRadius: '4px',
    marginRight: '8px',
    flexShrink: 0,
  },
  fieldRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '2px',
  },
  fieldValue: {
    fontSize: '15px',
    color: '#444',
  },
  actionBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    background: '#fff',
    color: '#444',
    border: '1px solid #ccc',
    borderRadius: '5px',
    cursor: 'pointer',
    flexShrink: 0,
  },
}
