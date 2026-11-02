import StatusPill from '../shared/StatusPill'

function PipelineRail({ layers, isRunning, lastSync }) {
  return (
    <section className="pipeline-panel panel">
      <div className="section-header pipeline-header">
        <div>
          <span className="eyebrow">Data movement</span>
          <h2>Pipeline health</h2>
        </div>
        <div className="last-sync"><span className="pulse-dot" /> Last sync <b>{lastSync || 'Not available'}</b></div>
      </div>
      <div className="pipeline-rail">
        {layers.map((layer, index) => (
          <div className="layer-wrap" key={layer.id}>
            <article className={`layer-card ${layer.accent} ${isRunning ? 'processing' : ''}`}>
              <div className="layer-card-top"><span className="layer-symbol">{index === 0 ? '↓' : index === 1 ? '◇' : '✦'}</span><StatusPill tone={layer.status === 'Needs attention' ? 'danger' : layer.status === 'Healthy' ? 'success' : 'warning'}>{isRunning ? 'Processing' : layer.status}</StatusPill></div>
              <h3>{layer.label}</h3>
              <p>{layer.description}</p>
              <div className="layer-stats"><span><b>{layer.tables ?? '—'}</b> tables</span><span><b>{layer.rows ?? '—'}</b> rows</span></div>
            </article>
            {index < layers.length - 1 && <div className={`pipeline-connector ${isRunning ? 'active' : ''}`}><span>›</span></div>}
          </div>
        ))}
      </div>
    </section>
  )
}

export default PipelineRail
