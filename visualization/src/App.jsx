import { useEffect, useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import KpiStrip from './components/dashboard/KpiStrip'
import PipelineRail from './components/dashboard/PipelineRail'
import VolumeChart from './components/dashboard/VolumeChart'
import CurrencyMix from './components/dashboard/CurrencyMix'
import RunLedger from './components/dashboard/RunLedger'
import { LoansView, QualityView, TransactionsView } from './components/views/DataViews'
import { pipelineLayers } from './data/warehouseData'

function Overview({ isRunning, onNavigate }) {
  return <div className="view-stack"><KpiStrip /><PipelineRail layers={pipelineLayers} isRunning={isRunning} /><div className="dashboard-grid"><VolumeChart /><CurrencyMix /></div><RunLedger /><div className="overview-footer"><span><i className="footer-dot" /> Warehouse data is not loaded</span><button onClick={() => onNavigate('quality')}>Open quality center <span>→</span></button></div></div>
}

function App() {
  const [activeView, setActiveView] = useState('overview')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return undefined
    const timer = setTimeout(() => setIsRunning(false), 2800)
    return () => clearTimeout(timer)
  }, [isRunning])

  const renderView = () => {
    if (activeView === 'transactions') return <TransactionsView />
    if (activeView === 'loans') return <LoansView />
    if (activeView === 'quality') return <QualityView />
    return <Overview isRunning={isRunning} onNavigate={setActiveView} />
  }

  return <div className="app-shell"><Sidebar activeView={activeView} onNavigate={setActiveView} /><main className="main-content"><Topbar activeView={activeView} isRunning={isRunning} onRun={() => setIsRunning(true)} /><div className="page-content">{renderView()}</div></main></div>
}

export default App
