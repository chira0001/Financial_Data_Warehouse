import { useEffect, useState } from 'react'
import { warehouseApi } from './api/warehouseApi'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import KpiStrip from './components/dashboard/KpiStrip'
import PipelineRail from './components/dashboard/PipelineRail'
import VolumeChart from './components/dashboard/VolumeChart'
import CurrencyMix from './components/dashboard/CurrencyMix'
import RunLedger from './components/dashboard/RunLedger'
import { LoanOperationsView, LoansView, QualityView, QueryGroupsView, TransactionsView } from './components/views/DataViews'
import ControlRoomView from './components/views/ControlRoomView'
import { pipelineLayers } from './data/warehouseData'

function Overview({ isRunning, onNavigate, overview, error }) {
  return <div className="view-stack">{error && <div className="api-error"><strong>Warehouse connection unavailable</strong><span>{error}</span></div>}<KpiStrip metrics={overview?.metrics} /><PipelineRail layers={overview?.layers || pipelineLayers} isRunning={isRunning} lastSync={overview?.lastSync} /><div className="dashboard-grid"><VolumeChart volume={overview?.volume} /><CurrencyMix currencies={overview?.currencyMix} /></div><RunLedger runs={overview?.runs} /><div className="overview-footer"><span><i className="footer-dot" /> {overview ? 'Warehouse data loaded' : 'Warehouse data is not loaded'}</span><button onClick={() => onNavigate('quality')}>Open quality center <span>→</span></button></div></div>
}

function App() {
  const [activeView, setActiveView] = useState('overview')
  const [isRunning, setIsRunning] = useState(false)
  const [overview, setOverview] = useState(null)
  const [apiError, setApiError] = useState('')
  const [analyticsRefresh, setAnalyticsRefresh] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('checking')

  useEffect(() => {
    let active = true
    const checkConnection = () => warehouseApi.health()
      .then((data) => {
        if (active) setConnectionStatus(data.status === 'ok' && data.database === 'connected' ? 'connected' : 'disconnected')
      })
      .catch(() => {
        if (active) setConnectionStatus('disconnected')
      })

    checkConnection()
    const interval = window.setInterval(checkConnection, 15000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    warehouseApi.overview().then((data) => {
      setOverview(data)
      setApiError('')
    }).catch((error) => setApiError(error.message))
  }, [isRunning])

  const handleRunPipeline = async () => {
    setIsRunning(true)
    try {
      await warehouseApi.runPipeline()
      setAnalyticsRefresh((current) => current + 1)
      const data = await warehouseApi.overview()
      setOverview(data)
      setApiError('')
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsRunning(false)
    }
  }

  const renderView = () => {
    if (activeView === 'transactions') return <TransactionsView />
    if (activeView === 'loans') return <LoansView refreshKey={analyticsRefresh} />
    if (activeView === 'loan-operations') return <LoanOperationsView refreshKey={analyticsRefresh} />
    if (activeView === 'quality') return <QualityView />
    if (activeView === 'queries') return <QueryGroupsView />
    if (activeView === 'analytics') return <ControlRoomView refreshKey={analyticsRefresh} />
    return <Overview isRunning={isRunning} onNavigate={setActiveView} overview={overview} error={apiError} />
  }

  return <div className="app-shell"><Sidebar activeView={activeView} onNavigate={setActiveView} connectionStatus={connectionStatus} /><main className="main-content"><Topbar activeView={activeView} isRunning={isRunning} onRun={handleRunPipeline} connectionStatus={connectionStatus} /><div className="page-content">{renderView()}</div></main></div>
}

export default App
