import { useState } from 'react'
import TodayTab from './components/TodayTab'
import YesterdayTab from './components/YesterdayTab'
import AnalyticsTab from './components/AnalyticsTab'
import FavoritesTab from './components/FavoritesTab'

const TABS = [
  { key: 'today',     label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'analytics', label: '分析' },
  { key: 'favorites', label: '常用品項' },
]

function App() {
  const [activeTab, setActiveTab] = useState('today')

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

      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'yesterday' && <YesterdayTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'favorites' && <FavoritesTab />}
    </div>
  )
}

export default App
