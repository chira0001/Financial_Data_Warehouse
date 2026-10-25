import React from 'react'
import { CheckIcon, ArrowRightIcon, CalculatorIcon } from './Icons'

export default function LoanProducts({ products, onSelectProduct, onCalculateProduct }) {
  return (
    <section className="section" id="products">
      <div className="section-head">
        <span className="section-tag">Credit Facilities Portfolio</span>
        <h2>Structured Loan Facilities</h2>
        <p>Review our core retail and commercial lending facilities designed in accordance with statutory guidelines.</p>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="product-card"
            style={{ '--product-color': product.color }}
          >
            <div className="product-top">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className="product-badge" style={{ color: product.color, border: `1px solid ${product.color}40` }}>
                  {product.badge}
                </span>
                {product.productCode && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    {product.productCode}
                  </span>
                )}
              </div>
              <div className="product-rate-pill">
                {product.rate}% <small>p.a. fixed</small>
              </div>
            </div>

            <h3>{product.name}</h3>
            <p className="tagline">{product.tagline}</p>

            <div className="product-specs">
              <div className="spec-item">
                <span>Maximum Ceiling</span>
                <strong>LKR {(product.maxAmount / 1000000).toFixed(1)} Million</strong>
              </div>
              <div className="spec-item">
                <span>Maximum Term</span>
                <strong>{(product.maxTenure / 12).toFixed(0)} Years ({product.maxTenure} Mo)</strong>
              </div>
            </div>

            <ul className="product-features">
              {product.features.map((feat, idx) => (
                <li key={idx}>
                  <CheckIcon size={14} className="feature-check" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="actions">
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => onCalculateProduct(product)}
              >
                <CalculatorIcon size={14} />
                <span>Estimate EMI</span>
              </button>
              <button 
                type="button"
                className="btn-primary"
                onClick={() => onSelectProduct(product)}
              >
                <span>Apply Facility</span>
                <ArrowRightIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
