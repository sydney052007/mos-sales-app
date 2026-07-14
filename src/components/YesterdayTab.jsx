import { getYesterdayItems } from '../services/storage'
import { calcRemaining } from '../logic/itemUtils'

function SmField({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
      <span style={{ fontSize: '10px', color: '#bbb' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 'bold', color: color || '#555' }}>{value}</span>
    </div>
  )
}

function RegularRowRO({ item }) {
  const rem = calcRemaining(item)
  const remColor = rem < 0 ? '#c0392b' : rem === 0 ? '#aaa' : '#27ae60'
  return (
    <div style={s.row}>
      <span style={s.badgeRegular}>一般</span>
      <span style={s.rowName}>{item.name}</span>
      <div style={s.statsBlock}>
        <SmField label="備" value={item.stock} />
        <SmField label="售" value={item.sold} />
        <SmField label="餘" value={rem} color={remColor} />
      </div>
    </div>
  )
}

function DrinkRowRO({ item }) {
  const rem = calcRemaining(item)
  const remColor = rem < 0 ? '#c0392b' : rem === 0 ? '#aaa' : '#27ae60'
  const hasDualPrice = item.comboPrice != null && item.aLaCartePrice != null
  return (
    <div style={{ ...s.row, background: '#f5fbff', borderColor: '#b8d8f0' }}>
      <span style={s.badgeDrink}>飲料</span>
      <span style={s.rowName}>{item.name}</span>
      <div style={s.statsBlock}>
        <SmField label="備" value={item.stock} />
        {hasDualPrice ? (
          <>
            <SmField label="套售" value={item.comboSold ?? 0} />
            <SmField label="單售" value={item.aLaCarteSold ?? 0} />
          </>
        ) : (
          <SmField label="售" value={item.comboSold ?? 0} />
        )}
        <SmField label="餘" value={rem} color={remColor} />
      </div>
    </div>
  )
}

export default function YesterdayTab() {
  const items = getYesterdayItems()

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 16px', color: '#aaa' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
        <div style={{ fontSize: '15px' }}>昨天沒有記錄</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
        昨天共 {items.length} 筆品項（唯讀）
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map(item =>
          item.type === 'drink'
            ? <DrinkRowRO key={item.id} item={item} />
            : <RegularRowRO key={item.id} item={item} />
        )}
      </div>
    </div>
  )
}

const s = {
  row: {
    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px',
    padding: '8px 14px',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  rowName: {
    flex: 1, fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a',
    minWidth: 0, overflowWrap: 'break-word',
  },
  statsBlock: {
    display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center',
  },
  badgeRegular: {
    fontSize: '11px', fontWeight: 'bold', color: '#7a5c1e', background: '#fef3cd',
    padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
  },
  badgeDrink: {
    fontSize: '11px', fontWeight: 'bold', color: '#1a5f8a', background: '#d0eaf8',
    padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
  },
}
