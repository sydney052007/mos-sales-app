import { useState } from 'react'
import { getTodayString } from './services/storage'
import ItemsTab from './components/ItemsTab'
import AnalyticsTab from './components/AnalyticsTab'
import FavoritesTab from './components/FavoritesTab'

const TABS = [
  { key: 'items',     label: '品項' },
  { key: 'analytics', label: '分析' },
  { key: 'favorites', label: '常用品項' },
]

function App() {
  const [activeTab, setActiveTab] = useState('items')
  const [selectedDate, setSelectedDate] = useState(() => getTodayString())

  function navigateToDate(dateStr) {
    setSelectedDate(dateStr)
    setActiveTab('items')
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: '#c0392b',
        color: '#fff',
        padding: '14px 16px',
        fontSize: '17px',
        fontWeight: 'bold',
      }}>
        摩斯外賣銷售記錄
      </header>

      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '0 12px',
        display: 'flex',
      }}>
        {TABS.map(({ key, label }) => (
          <div
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 14px',
              fontSize: '15px',
              fontWeight: activeTab === key ? 'bold' : 'normal',
              color: activeTab === key ? '#c0392b' : '#888',
              borderBottom: activeTab === key ? '3px solid #c0392b' : '3px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {activeTab === 'items'     && <ItemsTab selectedDate={selectedDate} onDateChange={setSelectedDate} />}
      {activeTab === 'analytics' && <AnalyticsTab onNavigateToDate={navigateToDate} />}
      {activeTab === 'favorites' && <FavoritesTab />}
    </div>
  )
}

export default App
