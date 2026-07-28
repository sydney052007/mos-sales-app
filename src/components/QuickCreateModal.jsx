import { useState } from 'react'
import { parseText } from '../logic/textParser'

// ── PreviewRow ────────────────────────────────────────────────────────────────
// One editable card per parsed item. All fields can be changed before confirming.

function PreviewRow({ row, favorites, knownItems, onChange, onRemove }) {
  const isDrink = row.type === 'drink'

  const favNames = new Set(favorites.map(f => f.name))
  const otherKnown = knownItems.filter(k => !favNames.has(k.name))

  function handlePick(e) {
    const val = e.target.value
    // Reset select to placeholder so it's clear it's an action trigger
    e.target.value = ''
    if (!val) return
    const sep = val.indexOf(':')
    const kind = val.slice(0, sep), key = val.slice(sep + 1)

    if (kind === 'fav') {
      const fav = favorites.find(f => f.id === key)
      if (!fav) return
      onChange({
        type:           fav.type,
        name:           fav.name,
        price:          fav.defaultPrice          != null ? String(fav.defaultPrice)          : '',
        comboPrice:     fav.defaultComboPrice     != null ? String(fav.defaultComboPrice)     : '',
        aLaCartePrice:  fav.defaultALaCartePrice  != null ? String(fav.defaultALaCartePrice)  : '',
        showSecondPrice: fav.type === 'drink' && fav.defaultALaCartePrice != null,
      })
    } else if (kind === 'known') {
      const known = knownItems.find(k => k.name === key)
      if (!known) return
      onChange({
        type:           known.type,
        name:           known.name,
        price:          known.price          != null ? String(known.price)          : '',
        comboPrice:     known.comboPrice     != null ? String(known.comboPrice)     : '',
        aLaCartePrice:  known.aLaCartePrice  != null ? String(known.aLaCartePrice)  : '',
        showSecondPrice: known.type === 'drink' && known.aLaCartePrice != null,
      })
    }
  }

  function switchType(val) {
    onChange({ type: val, price: '', comboPrice: '', aLaCartePrice: '', showSecondPrice: false })
  }

  return (
    <div style={rs.card}>
      {/* Original line + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: '#aaa', flex: 1, marginRight: '8px', wordBreak: 'break-all' }}>
          原始：{row.originalLine}
          {!row.matched && (
            <span style={{ marginLeft: '6px', color: '#e67e22', fontWeight: 'bold' }}>未比對到</span>
          )}
        </div>
        <button onClick={onRemove} style={rs.deleteBtn}>刪除</button>
      </div>

      {/* Favorites / known items picker (action trigger only) */}
      <select defaultValue="" onChange={handlePick} style={rs.select}>
        <option value="" disabled>── 從曾用過的品項選（自動帶入）──</option>
        <optgroup label="⭐ 常用品項">
          {favorites.map(f => <option key={f.id} value={`fav:${f.id}`}>{f.name}</option>)}
        </optgroup>
        <optgroup label="🕘 其他曾用過的品項">
          {otherKnown.map(k => <option key={k.name} value={`known:${k.name}`}>{k.name}</option>)}
        </optgroup>
      </select>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[['regular', '一般品項'], ['drink', '飲料']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => switchType(val)}
            style={{
              flex: 1, padding: '6px 0', fontSize: '13px', cursor: 'pointer',
              border: `2px solid ${row.type === val ? '#c0392b' : '#ddd'}`,
              background: row.type === val ? '#fdf2f2' : '#fff',
              color: row.type === val ? '#c0392b' : '#888',
              borderRadius: '6px',
              fontWeight: row.type === val ? 'bold' : 'normal',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Name */}
      <FieldRow label="名稱">
        <input
          style={rs.inp}
          value={row.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="品項名稱"
        />
      </FieldRow>

      {/* Qty */}
      <FieldRow label="備貨量">
        <input
          style={{ ...rs.inp, width: '80px' }}
          type="number" min="0"
          value={row.qty}
          onChange={e => onChange({ qty: e.target.value })}
        />
      </FieldRow>

      {/* Price fields */}
      {!isDrink ? (
        <FieldRow label="單價">
          <input
            style={{ ...rs.inp, width: '80px' }}
            type="number" min="0" placeholder="$"
            value={row.price}
            onChange={e => onChange({ price: e.target.value })}
          />
        </FieldRow>
      ) : (
        <>
          <FieldRow label={row.showSecondPrice ? '套餐價' : '價格'}>
            <input
              style={{ ...rs.inp, width: '80px' }}
              type="number" min="0" placeholder="$"
              value={row.comboPrice}
              onChange={e => onChange({ comboPrice: e.target.value })}
            />
          </FieldRow>
          {row.showSecondPrice ? (
            <>
              <FieldRow label="單點價">
                <input
                  style={{ ...rs.inp, width: '80px' }}
                  type="number" min="0" placeholder="$"
                  value={row.aLaCartePrice}
                  onChange={e => onChange({ aLaCartePrice: e.target.value })}
                />
              </FieldRow>
              <button
                onClick={() => onChange({ showSecondPrice: false, aLaCartePrice: '' })}
                style={rs.secondPriceBtn}
              >－ 移除第二種價格</button>
            </>
          ) : (
            <button
              onClick={() => onChange({ showSecondPrice: true })}
              style={rs.secondPriceBtn}
            >＋ 加第二種價格</button>
          )}
        </>
      )}
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <label style={{ fontSize: '13px', color: '#555', width: '48px', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  )
}

// ── QuickCreateModal ──────────────────────────────────────────────────────────

export function QuickCreateModal({ favorites, knownItems, matchCandidates, todayItems, onConfirm, onClose }) {
  const [step, setStep] = useState('input')   // 'input' | 'preview'
  const [text, setText] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [conflictNames, setConflictNames] = useState([])  // names that already exist in today

  // ── Parse ──
  function handleParse() {
    if (!text.trim()) { setError('請先貼上備貨筆記'); return }
    const parsed = parseText(text, matchCandidates)
    if (!parsed.length) { setError('找不到任何可解析的品項，請確認文字格式'); return }
    setRows(parsed)
    setStep('preview')
    setError('')
    setConflictNames([])
  }

  // ── Row edits ──
  function updateRow(id, changes) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  }

  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id))
    setConflictNames([])
    setError('')
  }

  // ── Validation ──
  function validate() {
    for (const row of rows) {
      if (!row.name.trim()) return '有品項的名稱不能空白'
      const qty = Number(row.qty)
      if (row.qty === '' || isNaN(qty) || qty < 0) return `「${row.name}」的備貨量有誤`
      if (row.type === 'regular') {
        const p = Number(row.price)
        if (row.price === '' || isNaN(p) || p < 0) return `「${row.name}」的單價不能空白`
      } else {
        const cp = Number(row.comboPrice)
        if (row.comboPrice === '' || isNaN(cp) || cp < 0) return `「${row.name}」的價格不能空白`
        if (row.showSecondPrice) {
          const ap = Number(row.aLaCartePrice)
          if (row.aLaCartePrice === '' || isNaN(ap) || ap < 0) return `「${row.name}」的單點價不能空白`
        }
      }
    }
    return null
  }

  // ── Build ──
  function handleBuild() {
    if (!rows.length) { setError('沒有任何品項可建立'); return }
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    // Check name conflicts with existing today items
    const existingNames = new Set(todayItems.map(i => i.name))
    const conflicts = [...new Set(
      rows.filter(r => existingNames.has(r.name.trim())).map(r => r.name.trim())
    )]

    if (conflicts.length) {
      setConflictNames(conflicts)
    } else {
      doCreate('skip')
    }
  }

  function doCreate(conflictMode) {
    onConfirm(rows, conflictMode)
    onClose()
  }

  // ── Render ──
  return (
    <div style={ms.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={ms.modal}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ flex: 1, fontSize: '17px', fontWeight: 'bold', color: '#c0392b' }}>
            {step === 'input' ? '文字快速建立品項' : `確認品項清單（${rows.length} 筆）`}
          </div>
          <button onClick={onClose} style={ms.closeBtn}>✕</button>
        </div>

        {step === 'input' ? (
          /* ── Step 1: Text input ── */
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px', lineHeight: 1.6 }}>
              貼上備貨筆記，系統自動解析品項名稱與數量，並比對常用品項。
            </p>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              placeholder={'例如：\n亞麻豬排-16\n元氣-4\n紅茶16+4（有糖/無糖）\n奶茶4～6\n有糖豆奶/無糖豆奶/鮮奶-2/2/6'}
              style={ms.textarea}
              autoFocus
            />
            {error && <div style={ms.err}>{error}</div>}
            <button onClick={handleParse} style={ms.primaryBtn}>解析預覽 →</button>
          </>
        ) : (
          /* ── Step 2: Preview list ── */
          <>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
              所有欄位均可修改；未比對到範本的品項請手動填入價格。
            </div>

            {/* Scrollable row list */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, marginBottom: '12px' }}>
              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>
                  所有品項已刪除
                </div>
              ) : (
                rows.map(row => (
                  <PreviewRow
                    key={row.id}
                    row={row}
                    favorites={favorites}
                    knownItems={knownItems}
                    onChange={changes => updateRow(row.id, changes)}
                    onRemove={() => removeRow(row.id)}
                  />
                ))
              )}
            </div>

            {/* Conflict resolution panel */}
            {conflictNames.length > 0 && (
              <div style={ms.conflictBox}>
                <div style={{ fontWeight: 'bold', color: '#c0392b', marginBottom: '4px' }}>
                  以下品項今天已存在：
                </div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>
                  {conflictNames.join('、')}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => doCreate('overwrite')} style={{ ...ms.primaryBtn, flex: 1 }}>
                    覆蓋備貨量
                  </button>
                  <button onClick={() => doCreate('skip')} style={{ ...ms.secondaryBtn, flex: 1 }}>
                    略過重複
                  </button>
                </div>
              </div>
            )}

            {error && <div style={ms.err}>{error}</div>}

            {/* Action buttons (hidden while conflict panel is open) */}
            {!conflictNames.length && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleBuild} style={{ ...ms.primaryBtn, flex: 2 }}>
                  建立（{rows.length} 筆）
                </button>
                <button
                  onClick={() => { setStep('input'); setError(''); setConflictNames([]) }}
                  style={{ ...ms.secondaryBtn, flex: 1 }}
                >
                  重新輸入
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ms = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    padding: '20px 16px 24px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '20px',
    color: '#aaa', cursor: 'pointer', padding: '4px 8px',
  },
  textarea: {
    width: '100%', minHeight: '160px', padding: '10px',
    fontSize: '14px', lineHeight: 1.7,
    border: '1px solid #ccc', borderRadius: '8px',
    resize: 'vertical', boxSizing: 'border-box',
    fontFamily: 'inherit',
    marginBottom: '10px',
  },
  primaryBtn: {
    width: '100%', padding: '13px', fontSize: '15px', fontWeight: 'bold',
    background: '#c0392b', color: '#fff',
    border: 'none', borderRadius: '10px', cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '13px', fontSize: '15px', fontWeight: 'bold',
    background: '#fff', color: '#c0392b',
    border: '2px solid #c0392b', borderRadius: '10px', cursor: 'pointer',
  },
  err: {
    color: '#c0392b', fontSize: '13px', marginBottom: '10px',
    padding: '8px 10px', background: '#fdf2f2',
    borderRadius: '6px', border: '1px solid #e8b4b4',
  },
  conflictBox: {
    background: '#fff8e1', border: '1px solid #f0c040',
    borderRadius: '10px', padding: '12px 14px', marginBottom: '10px',
  },
}

const rs = {
  card: {
    background: '#fafafa', border: '1px solid #e0e0e0',
    borderRadius: '10px', padding: '12px', marginBottom: '10px',
  },
  deleteBtn: {
    fontSize: '12px', color: '#c0392b', background: 'none',
    border: '1px solid #e8b4b4', borderRadius: '5px',
    padding: '2px 8px', cursor: 'pointer', flexShrink: 0,
  },
  select: {
    width: '100%', padding: '7px 8px', fontSize: '13px',
    border: '1px solid #ccc', borderRadius: '7px',
    background: '#fff', marginBottom: '8px',
    boxSizing: 'border-box',
  },
  inp: {
    padding: '7px 9px', fontSize: '14px',
    border: '1px solid #ccc', borderRadius: '7px',
    flex: 1, minWidth: 0, boxSizing: 'border-box',
  },
  secondPriceBtn: {
    fontSize: '12px', color: '#5b8fa8', background: 'none',
    border: 'none', cursor: 'pointer', padding: '0 0 8px 0',
  },
}
