function SectionHeader({ eyebrow, title, action, onAction }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && <button className="text-button" onClick={onAction}>{action}</button>}
    </div>
  )
}

export default SectionHeader