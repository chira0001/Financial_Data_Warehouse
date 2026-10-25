import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import LoanProducts from './components/LoanProducts'
import EmiCalculator from './components/EmiCalculator'
import ApplicationWizard from './components/ApplicationWizard'
import LoanTracker from './components/LoanTracker'
import Footer from './components/Footer'
import AdbmsConsoleModal from './components/AdbmsConsoleModal'
import RoleWorkstation from './components/RoleWorkstation'
import { loanApi } from './api/loanApi'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [products, setProducts] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [trackedLoanId, setTrackedLoanId] = useState(null)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState('customer') // 'customer' | 'officer' | 'manager' | 'auditor'

  useEffect(() => {
    loanApi.getProducts().then(setProducts)
  }, [])

  const handleSelectProduct = (product) => {
    setSelectedPlan({
      productName: product.name.replace(' Loan', '').replace(' Facility', ''),
      rate: product.rate,
      amount: product.minAmount ? Math.max(product.minAmount, 1000000) : 1500000,
      tenureYears: product.maxTenure ? Math.min(Math.round(product.maxTenure / 12), 5) : 5,
    })
    setActiveTab('apply')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCalculateProduct = (product) => {
    setSelectedPlan({
      productName: product.name.replace(' Loan', '').replace(' Facility', ''),
      rate: product.rate,
      amount: product.minAmount ? Math.max(product.minAmount, 1000000) : 1500000,
      tenureYears: product.maxTenure ? Math.min(Math.round(product.maxTenure / 12), 5) : 5,
    })
    setActiveTab('calculator')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleApplyWithPlan = (plan) => {
    setSelectedPlan(plan)
    setActiveTab('apply')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCompleteAndTrack = (loanId) => {
    setTrackedLoanId(loanId)
    setActiveTab('track')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="portal-app">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenConsole={() => setIsConsoleOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      />

      {currentRole !== 'customer' ? (
        <RoleWorkstation 
          currentRole={currentRole} 
          onSwitchRole={setCurrentRole} 
        />
      ) : (
        <main>
          {activeTab === 'home' && (
            <>
              <Hero 
                onExplore={() => {
                  const el = document.getElementById('products')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                onCalculate={() => setActiveTab('calculator')}
                onApply={() => setActiveTab('apply')}
              />
              <LoanProducts 
                products={products}
                onSelectProduct={handleSelectProduct}
                onCalculateProduct={handleCalculateProduct}
              />
              <EmiCalculator 
                initialProduct={selectedPlan}
                onApplyWithPlan={handleApplyWithPlan}
              />
            </>
          )}

          {activeTab === 'calculator' && (
            <div style={{ paddingTop: '20px' }}>
              <EmiCalculator 
                initialProduct={selectedPlan}
                onApplyWithPlan={handleApplyWithPlan}
              />
            </div>
          )}

          {activeTab === 'apply' && (
            <div style={{ paddingTop: '20px' }}>
              <ApplicationWizard 
                initialPlan={selectedPlan}
                onCompleteAndTrack={handleCompleteAndTrack}
              />
            </div>
          )}

          {activeTab === 'track' && (
            <div style={{ paddingTop: '20px' }}>
              <LoanTracker 
                initialLoanId={trackedLoanId}
              />
            </div>
          )}
        </main>
      )}

      <Footer />
      <AdbmsConsoleModal 
        isOpen={isConsoleOpen} 
        onClose={() => setIsConsoleOpen(false)} 
      />
    </div>
  )
}
