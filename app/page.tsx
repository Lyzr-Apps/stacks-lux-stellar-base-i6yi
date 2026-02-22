'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  FiHome, FiDollarSign, FiGift, FiPieChart, FiCalendar, FiSettings,
  FiMenu, FiChevronRight, FiChevronLeft, FiPlus, FiTrash2,
  FiCheck, FiAlertCircle, FiTrendingUp, FiTrendingDown, FiArrowRight,
  FiUser, FiEdit2, FiExternalLink, FiLoader, FiClock
} from 'react-icons/fi'

/* ─────────────────── Constants ─────────────────── */

const AGENT_IDS = {
  tax: '6999b6c22b9e1319f70b144d',
  aid: '6999b6c29b6b3fc30ee87332',
  advisor: '6999b6c2fdb12766dbc0175a',
}

const COMMUNES = [
  'Luxembourg City','Esch-sur-Alzette','Differdange','Dudelange','Ettelbruck',
  'Diekirch','Wiltz','Vianden','Echternach','Remich','Grevenmacher','Mersch',
  'Capellen','Steinfort','Petange','Bascharage','Sanem','Schifflange',
  'Bettembourg','Hesperange','Strassen','Bertrange','Mamer','Walferdange','Sandweiler'
]

const DEDUCTION_CATEGORIES = [
  { key: 'art111bis', label: 'Art. 111bis — Pension Contributions', max: 3200 },
  { key: 'art111', label: 'Art. 111 — Insurance Premiums', max: 672 },
  { key: 'epargneLogement', label: 'Epargne-logement — Building Savings', max: 1344 },
  { key: 'mortgageInterest', label: 'Mortgage Interest — Habitation Principale', max: 2000 },
  { key: 'childcare', label: 'Childcare Costs', max: 5400 },
  { key: 'soldeRestantDu', label: 'Solde Restant Du — Balance Insurance', max: 6400 },
  { key: 'amvp', label: 'AMVP — Old-Age Voluntary Insurance', max: 3200 },
]

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiHome },
  { key: 'tax', label: 'Tax Optimization', icon: FiDollarSign },
  { key: 'aid', label: 'Aid Discovery', icon: FiGift },
  { key: 'wealth', label: 'Wealth Overview', icon: FiPieChart },
  { key: 'advisor', label: 'Advisor Booking', icon: FiCalendar },
  { key: 'settings', label: 'Settings', icon: FiSettings },
]

const fmt = (v: number) =>
  new Intl.NumberFormat('de-LU', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

/* ─────────────────── Types ─────────────────── */

interface ProfileData {
  fullName: string; dob: string; commune: string
  maritalStatus: string; taxClass: string; numChildren: number; childrenAges: number[]
  employmentStatus: string; employer: string; grossSalary: number; partnerSalary: number
  housingStatus: string; monthlyRent: number; purchaseYear: number; loanAmount: number; remainingBalance: number
}

interface DeductionInputs { [key: string]: number }

interface TaxCategory { category_name: string; current_amount: number; maximum_amount: number; gap_amount: number; usage_percentage: number }
interface TaxRecommendation { category: string; action: string; potential_saving: number; priority: string }
interface TaxResults {
  opti_score: number; marginal_tax_rate: number; total_missed_savings: number
  total_potential_savings: number; categories: TaxCategory[]; recommendations: TaxRecommendation[]
}

interface AidItem { aid_name: string; category: string; status: string; estimated_annual_value: number; description: string; requirements_summary: string }
interface AidResults { total_eligible_aids_count: number; total_estimated_annual_value: number; aids: AidItem[] }

interface AdvisorKeyGap { category: string; gap_amount: number; potential_saving: number }
interface AdvisorKeyAid { name: string; annual_value: number; status: string }
interface AdvisorSummary {
  profile_summary: { full_name: string; age: number; commune: string; marital_status: string; tax_class: string; dependents: number; employment: string; gross_salary: number; housing_status: string }
  tax_status: { opti_score: number; total_potential_savings: number; marginal_tax_rate: number; key_gaps: AdvisorKeyGap[]; priority_recommendations: string[] }
  aid_status: { total_eligible: number; total_annual_value: number; key_aids: AdvisorKeyAid[] }
  wealth_snapshot: { net_worth: number; total_assets: number; total_debts: number; monthly_cash_flow: number; debt_to_asset_ratio: number }
  talking_points: { priority_items: string[]; quick_wins: string[]; long_term_strategies: string[] }
  generated_date: string
}

interface BankAccount { name: string; balance: number }
interface Investment { type: string; value: number }
interface DebtItem { type: string; amount: number }
interface WealthData {
  bankAccounts: BankAccount[]; investments: Investment[]; debts: DebtItem[]
  monthlyIncome: number; monthlyExpenses: number
}

/* ─────────────────── Helpers ─────────────────── */

function parseAgentJson(result: any): any {
  let parsed = result?.response?.result
  if (!parsed) return null
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return null }
  }
  return parsed
}

/* ─────────────────── Opti-Score Gauge ─────────────────── */

function OptiScoreGauge({ score, size = 180 }: { score: number | null; size?: number }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0
  const offset = circ - (circ * pct) / 100
  const color = score == null ? 'hsl(30 8% 55%)' : pct <= 30 ? 'hsl(0 50% 50%)' : pct <= 60 ? 'hsl(40 50% 55%)' : 'hsl(140 40% 45%)'

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(30 6% 20%)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="butt"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-4xl tracking-wider" style={{ color }}>{score != null ? score : '--'}</span>
        <span className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Opti-Score</span>
      </div>
    </div>
  )
}

/* ─────────────────── Progress Bar ─────────────────── */

function CategoryProgressBar({ name, current, max }: { name: string; current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-foreground tracking-wide">{name}</span>
        <span className="text-xs text-muted-foreground">{fmt(current)} / {fmt(max)}</span>
      </div>
      <div className="h-2 w-full bg-muted border border-border">
        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ─────────────────── Stat Card ─────────────────── */

function StatCard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend?: 'up' | 'down' | null }) {
  return (
    <div className="bg-card border border-border p-5 space-y-2">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-primary" />
        {trend === 'up' && <FiTrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <FiTrendingDown className="w-4 h-4 text-destructive" />}
      </div>
      <p className="text-2xl font-serif tracking-wider">{value}</p>
      <p className="text-xs text-muted-foreground tracking-widest uppercase">{label}</p>
    </div>
  )
}

/* ─────────────────── Main Component ─────────────────── */

export default function StacksApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [communeSearch, setCommuneSearch] = useState('')
  const [communeDropdownOpen, setCommuneDropdownOpen] = useState(false)

  const [profile, setProfile] = useState<ProfileData>({
    fullName: '', dob: '', commune: '', maritalStatus: 'Single', taxClass: '1',
    numChildren: 0, childrenAges: [], employmentStatus: 'Employed', employer: '',
    grossSalary: 0, partnerSalary: 0, housingStatus: 'Renter', monthlyRent: 0,
    purchaseYear: 2020, loanAmount: 0, remainingBalance: 0,
  })
  const [editingProfile, setEditingProfile] = useState(false)

  const [deductions, setDeductions] = useState<DeductionInputs>(
    Object.fromEntries(DEDUCTION_CATEGORIES.map(c => [c.key, 0]))
  )
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  const [taxResults, setTaxResults] = useState<TaxResults | null>(null)
  const [aidResults, setAidResults] = useState<AidResults | null>(null)
  const [advisorSummary, setAdvisorSummary] = useState<AdvisorSummary | null>(null)

  const [taxLoading, setTaxLoading] = useState(false)
  const [aidLoading, setAidLoading] = useState(false)
  const [advisorLoading, setAdvisorLoading] = useState(false)

  const [taxError, setTaxError] = useState<string | null>(null)
  const [aidError, setAidError] = useState<string | null>(null)
  const [advisorError, setAdvisorError] = useState<string | null>(null)

  const [wealth, setWealth] = useState<WealthData>({
    bankAccounts: [{ name: '', balance: 0 }],
    investments: [{ type: '', value: 0 }],
    debts: [{ type: '', amount: 0 }],
    monthlyIncome: 0, monthlyExpenses: 0,
  })

  const [lastTaxAnalysis, setLastTaxAnalysis] = useState<string | null>(null)
  const [lastAidCheck, setLastAidCheck] = useState<string | null>(null)

  const updateProfile = useCallback((key: keyof ProfileData, value: any) => {
    setProfile(p => {
      const updated = { ...p, [key]: value }
      if (key === 'numChildren') {
        const n = Math.max(0, Number(value))
        const ages = [...p.childrenAges]
        while (ages.length < n) ages.push(0)
        updated.childrenAges = ages.slice(0, n)
        updated.numChildren = n
      }
      return updated
    })
  }, [])

  const totalAssets = useMemo(() => {
    const bank = wealth.bankAccounts.reduce((s, a) => s + (a.balance || 0), 0)
    const inv = wealth.investments.reduce((s, i) => s + (i.value || 0), 0)
    return bank + inv
  }, [wealth.bankAccounts, wealth.investments])

  const totalDebts = useMemo(() => wealth.debts.reduce((s, d) => s + (d.amount || 0), 0), [wealth.debts])
  const netWorth = totalAssets - totalDebts
  const cashFlow = wealth.monthlyIncome - wealth.monthlyExpenses
  const dta = totalAssets > 0 ? ((totalDebts / totalAssets) * 100).toFixed(1) : '0.0'

  /* ── Agent Calls ── */
  const runTaxAnalysis = async () => {
    setTaxLoading(true); setTaxError(null)
    const msg = `Analyze tax deductions for Luxembourg resident:
Profile: Name=${profile.fullName}, Commune=${profile.commune}, MaritalStatus=${profile.maritalStatus}, TaxClass=${profile.taxClass}, Children=${profile.numChildren}, ChildrenAges=${profile.childrenAges.join(',')}, Employment=${profile.employmentStatus}, GrossSalary=${profile.grossSalary}, PartnerSalary=${profile.partnerSalary}, Housing=${profile.housingStatus}, MortgagePurchaseYear=${profile.purchaseYear}, LoanAmount=${profile.loanAmount}, RemainingBalance=${profile.remainingBalance}.
Current Deductions: Art111bis(Pension)=${deductions.art111bis}, Art111(Insurance)=${deductions.art111}, EpargneLogement=${deductions.epargneLogement}, MortgageInterest=${deductions.mortgageInterest}, Childcare=${deductions.childcare}, SoldeRestantDu=${deductions.soldeRestantDu}, AMVP=${deductions.amvp}.
Calculate all gaps against 2026 Luxembourg legal maximums, marginal tax rate, Opti-Score (0-100), and personalized recommendations.`
    try {
      const result = await callAIAgent(msg, AGENT_IDS.tax)
      const parsed = parseAgentJson(result)
      if (parsed && typeof parsed.opti_score === 'number') {
        setTaxResults(parsed as TaxResults)
        setLastTaxAnalysis(new Date().toLocaleString())
      } else {
        setTaxError('Unexpected response format. Please try again.')
      }
    } catch {
      setTaxError('Failed to analyze. Please try again.')
    }
    setTaxLoading(false)
  }

  const runAidDiscovery = async () => {
    setAidLoading(true); setAidError(null)
    const msg = `Evaluate government aid eligibility for Luxembourg resident:
Name=${profile.fullName}, Commune=${profile.commune}, MaritalStatus=${profile.maritalStatus}, TaxClass=${profile.taxClass}, NumChildren=${profile.numChildren}, ChildrenAges=${profile.childrenAges.join(',')}, GrossSalary=${profile.grossSalary}, PartnerSalary=${profile.partnerSalary}, HousingStatus=${profile.housingStatus}, MonthlyRent=${profile.monthlyRent}.
Evaluate all state-level and commune-level Luxembourg aid programs and return eligibility status with estimated values.`
    try {
      const result = await callAIAgent(msg, AGENT_IDS.aid)
      const parsed = parseAgentJson(result)
      if (parsed && Array.isArray(parsed.aids)) {
        setAidResults(parsed as AidResults)
        setLastAidCheck(new Date().toLocaleString())
      } else {
        setAidError('Unexpected response format. Please try again.')
      }
    } catch {
      setAidError('Failed to check eligibility. Please try again.')
    }
    setAidLoading(false)
  }

  const runAdvisorSummary = async () => {
    setAdvisorLoading(true); setAdvisorError(null)
    const msg = `Compile comprehensive financial advisor summary for Luxembourg resident:
Profile: Name=${profile.fullName}, DOB=${profile.dob}, Commune=${profile.commune}, MaritalStatus=${profile.maritalStatus}, TaxClass=${profile.taxClass}, Children=${profile.numChildren}, ChildrenAges=${profile.childrenAges.join(',')}, Employment=${profile.employmentStatus}, Employer=${profile.employer}, GrossSalary=${profile.grossSalary}, PartnerSalary=${profile.partnerSalary}, Housing=${profile.housingStatus}, MonthlyRent=${profile.monthlyRent}, MortgagePurchaseYear=${profile.purchaseYear}, LoanAmount=${profile.loanAmount}, RemainingBalance=${profile.remainingBalance}.
Tax Analysis Results: OptiScore=${taxResults?.opti_score ?? 'not yet analyzed'}, TotalMissedSavings=${taxResults?.total_missed_savings ?? 'N/A'}, MarginalRate=${taxResults?.marginal_tax_rate ?? 'N/A'}, TotalPotentialSavings=${taxResults?.total_potential_savings ?? 'N/A'}.
Aid Status: EligibleCount=${aidResults?.total_eligible_aids_count ?? 'not yet checked'}, TotalAidValue=${aidResults?.total_estimated_annual_value ?? 'N/A'}.
Wealth Data: TotalAssets=${totalAssets}, TotalDebts=${totalDebts}, NetWorth=${netWorth}, MonthlyCashFlow=${cashFlow}, MonthlyIncome=${wealth.monthlyIncome}, MonthlyExpenses=${wealth.monthlyExpenses}.
Deductions: Art111bis=${deductions.art111bis}, Art111=${deductions.art111}, EpargneLogement=${deductions.epargneLogement}, MortgageInterest=${deductions.mortgageInterest}, Childcare=${deductions.childcare}, SoldeRestantDu=${deductions.soldeRestantDu}, AMVP=${deductions.amvp}.
Generate a complete structured brief with profile, tax status, aid status, wealth snapshot, and talking points for the advisor.`
    try {
      const result = await callAIAgent(msg, AGENT_IDS.advisor)
      const parsed = parseAgentJson(result)
      if (parsed && parsed.profile_summary) {
        setAdvisorSummary(parsed as AdvisorSummary)
      } else {
        setAdvisorError('Unexpected response format. Please try again.')
      }
    } catch {
      setAdvisorError('Failed to generate summary. Please try again.')
    }
    setAdvisorLoading(false)
  }

  /* ── Style Classes ── */
  const inputCls = 'w-full bg-input border border-border p-3 text-sm text-foreground tracking-wide focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground'
  const labelCls = 'block text-xs text-muted-foreground tracking-widest uppercase mb-1.5'
  const btnPrimary = 'bg-primary text-primary-foreground px-6 py-3 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 justify-center'
  const btnSecondary = 'border border-border text-foreground px-6 py-3 text-sm tracking-widest uppercase hover:bg-secondary transition-colors flex items-center gap-2 justify-center'

  /* ─────────── Onboarding ─────────── */

  const filteredCommunes = communeSearch
    ? COMMUNES.filter(c => c.toLowerCase().includes(communeSearch.toLowerCase()))
    : COMMUNES

  const onboardingStepNames = ['Personal Info', 'Family', 'Employment & Income', 'Housing', 'Review & Submit']

  if (!onboardingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <h1 className="font-serif text-3xl tracking-[0.2em] text-center text-primary mb-2">STACKS</h1>
          <p className="text-center text-sm text-muted-foreground tracking-wider mb-10">Personal Finance Dashboard for Luxembourg</p>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-1 mb-10">
            {onboardingStepNames.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 flex items-center justify-center border text-sm tracking-wider transition-colors ${
                    i < onboardingStep ? 'bg-primary text-primary-foreground border-primary' :
                    i === onboardingStep ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                  }`}>
                    {i < onboardingStep ? <FiCheck className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] tracking-widest uppercase whitespace-nowrap hidden sm:block ${
                    i <= onboardingStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{step}</span>
                </div>
                {i < onboardingStepNames.length - 1 && (
                  <div className={`w-8 sm:w-12 h-px mt-[-18px] sm:mt-[-18px] ${i < onboardingStep ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-card border border-border p-8">
            <h2 className="font-serif text-xl tracking-wider mb-6">{onboardingStepNames[onboardingStep]}</h2>

            {/* Step 0: Personal */}
            {onboardingStep === 0 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input className={inputCls} value={profile.fullName} onChange={e => updateProfile('fullName', e.target.value)} placeholder="Enter your full name" />
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" className={inputCls} value={profile.dob} onChange={e => updateProfile('dob', e.target.value)} />
                </div>
                <div className="relative">
                  <label className={labelCls}>Commune</label>
                  <input className={inputCls} value={communeSearch || profile.commune} placeholder="Search commune..."
                    onChange={e => { setCommuneSearch(e.target.value); setCommuneDropdownOpen(true) }}
                    onFocus={() => setCommuneDropdownOpen(true)} />
                  {communeDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border max-h-48 overflow-y-auto">
                      {filteredCommunes.map(c => (
                        <button key={c} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary tracking-wide"
                          onClick={() => { updateProfile('commune', c); setCommuneSearch(''); setCommuneDropdownOpen(false) }}>{c}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Family */}
            {onboardingStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select className={inputCls} value={profile.maritalStatus} onChange={e => updateProfile('maritalStatus', e.target.value)}>
                    {['Single','Married','PACS','Divorced','Widowed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tax Class</label>
                  <div className="flex gap-3">
                    {['1','1a','2'].map(tc => (
                      <button key={tc} onClick={() => updateProfile('taxClass', tc)}
                        className={`flex-1 py-3 border text-sm tracking-widest transition-colors ${profile.taxClass === tc ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}>
                        Class {tc}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Number of Children</label>
                  <input type="number" min={0} className={inputCls} value={profile.numChildren || ''} onChange={e => updateProfile('numChildren', e.target.value)} placeholder="0" />
                </div>
                {profile.numChildren > 0 && (
                  <div className="space-y-2">
                    <label className={labelCls}>Children&apos;s Ages</label>
                    {profile.childrenAges.map((age, i) => (
                      <input key={i} type="number" min={0} max={25} className={inputCls} value={age || ''} placeholder={`Child ${i + 1} age`}
                        onChange={e => { const ages = [...profile.childrenAges]; ages[i] = Number(e.target.value); setProfile(p => ({ ...p, childrenAges: ages })) }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Employment */}
            {onboardingStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Employment Status</label>
                  <select className={inputCls} value={profile.employmentStatus} onChange={e => updateProfile('employmentStatus', e.target.value)}>
                    {['Employed','Self-Employed','Civil Servant','Retired','Unemployed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Employer Name</label>
                  <input className={inputCls} value={profile.employer} onChange={e => updateProfile('employer', e.target.value)} placeholder="Company name" />
                </div>
                <div>
                  <label className={labelCls}>Gross Annual Salary (EUR)</label>
                  <input type="number" className={inputCls} value={profile.grossSalary || ''} onChange={e => updateProfile('grossSalary', Number(e.target.value))} placeholder="60000" />
                </div>
                {(profile.maritalStatus === 'Married' || profile.maritalStatus === 'PACS') && (
                  <div>
                    <label className={labelCls}>Partner Gross Annual Salary (EUR)</label>
                    <input type="number" className={inputCls} value={profile.partnerSalary || ''} onChange={e => updateProfile('partnerSalary', Number(e.target.value))} placeholder="55000" />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Housing */}
            {onboardingStep === 3 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Housing Status</label>
                  <div className="flex gap-3">
                    {['Owner','Renter'].map(h => (
                      <button key={h} onClick={() => updateProfile('housingStatus', h)}
                        className={`flex-1 py-3 border text-sm tracking-widest transition-colors ${profile.housingStatus === h ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}>
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                {profile.housingStatus === 'Renter' && (
                  <div>
                    <label className={labelCls}>Monthly Rent (EUR)</label>
                    <input type="number" className={inputCls} value={profile.monthlyRent || ''} onChange={e => updateProfile('monthlyRent', Number(e.target.value))} placeholder="1500" />
                  </div>
                )}
                {profile.housingStatus === 'Owner' && (
                  <>
                    <div>
                      <label className={labelCls}>Purchase Year</label>
                      <input type="number" className={inputCls} value={profile.purchaseYear || ''} onChange={e => updateProfile('purchaseYear', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Original Loan Amount (EUR)</label>
                      <input type="number" className={inputCls} value={profile.loanAmount || ''} onChange={e => updateProfile('loanAmount', Number(e.target.value))} placeholder="400000" />
                    </div>
                    <div>
                      <label className={labelCls}>Remaining Balance (EUR)</label>
                      <input type="number" className={inputCls} value={profile.remainingBalance || ''} onChange={e => updateProfile('remainingBalance', Number(e.target.value))} placeholder="350000" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {onboardingStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground tracking-wide">Review your information before continuing.</p>
                {[
                  { title: 'Personal', items: [`Name: ${profile.fullName}`, `DOB: ${profile.dob}`, `Commune: ${profile.commune}`] },
                  { title: 'Family', items: [`Status: ${profile.maritalStatus}`, `Tax Class: ${profile.taxClass}`, `Children: ${profile.numChildren}`, ...(profile.numChildren > 0 ? [`Ages: ${profile.childrenAges.join(', ')}`] : [])] },
                  { title: 'Employment', items: [`Status: ${profile.employmentStatus}`, `Employer: ${profile.employer}`, `Salary: ${fmt(profile.grossSalary)}`, ...(profile.partnerSalary > 0 ? [`Partner: ${fmt(profile.partnerSalary)}`] : [])] },
                  { title: 'Housing', items: [`Status: ${profile.housingStatus}`, ...(profile.housingStatus === 'Renter' ? [`Rent: ${fmt(profile.monthlyRent)}`] : [`Loan: ${fmt(profile.loanAmount)}`, `Remaining: ${fmt(profile.remainingBalance)}`])] },
                ].map(section => (
                  <div key={section.title} className="bg-secondary/30 border border-border p-4 space-y-1">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-2">{section.title}</h4>
                    {section.items.map((item, i) => (
                      <p key={i} className="text-sm tracking-wide text-foreground">{item}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Nav Buttons */}
            <div className="flex justify-between mt-8">
              {onboardingStep > 0 ? (
                <button className={btnSecondary} onClick={() => setOnboardingStep(s => s - 1)}>
                  <FiChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}
              {onboardingStep < 4 ? (
                <button className={btnPrimary} onClick={() => { setOnboardingStep(s => s + 1); setCommuneDropdownOpen(false) }}>
                  Next <FiChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button className={btnPrimary} onClick={() => setOnboardingComplete(true)}>
                  Complete Setup <FiCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────── Main App Layout ─────────── */
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] flex flex-col transition-all duration-300
        ${sidebarOpen ? 'w-60' : 'w-16'}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
          {sidebarOpen && <h1 className="font-serif text-xl tracking-[0.2em] text-[hsl(var(--sidebar-primary))]">STACKS</h1>}
          <button onClick={() => { setSidebarOpen(o => !o); if (mobileSidebarOpen) setMobileSidebarOpen(false) }}
            className="p-1.5 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-primary))] transition-colors">
            {sidebarOpen ? <FiChevronLeft className="w-4 h-4" /> : <FiMenu className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const active = currentScreen === item.key
            return (
              <button key={item.key} onClick={() => { setCurrentScreen(item.key); setMobileSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider transition-colors ${
                  active
                    ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]'
                    : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
        {sidebarOpen && (
          <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 flex items-center justify-center">
                <FiUser className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm tracking-wide truncate">{profile.fullName || 'User'}</p>
                <p className="text-[10px] text-muted-foreground tracking-wider">{profile.commune}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileSidebarOpen(true)} className="text-foreground">
          <FiMenu className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-lg tracking-[0.2em] text-primary">STACKS</h1>
        <div className="w-5" />
      </div>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'} pt-14 lg:pt-0`}>
        <div className="max-w-5xl mx-auto p-6 lg:p-10">

          {/* ═══════ DASHBOARD ═══════ */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl tracking-wider">Welcome back, {profile.fullName.split(' ')[0] || 'User'}</h2>
                <p className="text-sm text-muted-foreground tracking-wide mt-1">Your financial overview at a glance</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FiDollarSign} label="Missed Tax Savings" value={taxResults ? fmt(taxResults.total_missed_savings) : '--'} trend={taxResults ? 'down' : null} />
                <StatCard icon={FiGift} label="Eligible Aid Value" value={aidResults ? fmt(aidResults.total_estimated_annual_value) : '--'} trend={aidResults ? 'up' : null} />
                <StatCard icon={FiPieChart} label="Net Worth" value={totalAssets > 0 || totalDebts > 0 ? fmt(netWorth) : '--'} />
                <StatCard icon={FiTrendingUp} label="Monthly Cash Flow" value={wealth.monthlyIncome > 0 ? fmt(cashFlow) : '--'} />
              </div>

              <div className="bg-card border border-border p-8 flex flex-col items-center">
                <OptiScoreGauge score={taxResults?.opti_score ?? null} size={200} />
                {!taxResults && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground tracking-wide mb-3">Complete your tax deduction inputs to see your Opti-Score</p>
                    <button className={btnPrimary} onClick={() => setCurrentScreen('tax')}>
                      Run Tax Analysis <FiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-serif text-lg tracking-wider mb-4">What&apos;s Changed</h3>
                {!taxResults && !aidResults ? (
                  <div className="bg-card border border-border p-6 text-center">
                    <FiClock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground tracking-wide">Complete your first analysis to see updates here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taxResults && (
                      <div className="bg-card border border-border p-4 flex items-start gap-3">
                        <FiDollarSign className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm tracking-wide">Tax Analysis Complete</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Opti-Score: {taxResults.opti_score} | Potential savings: {fmt(taxResults.total_missed_savings)}</p>
                        </div>
                      </div>
                    )}
                    {aidResults && (
                      <div className="bg-card border border-border p-4 flex items-start gap-3">
                        <FiGift className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm tracking-wide">Aid Eligibility Checked</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{aidResults.total_eligible_aids_count} aids found worth {fmt(aidResults.total_estimated_annual_value)}/year</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-serif text-lg tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Tax Optimization', icon: FiDollarSign, screen: 'tax' },
                    { label: 'Aid Discovery', icon: FiGift, screen: 'aid' },
                    { label: 'Wealth Overview', icon: FiPieChart, screen: 'wealth' },
                    { label: 'Advisor Booking', icon: FiCalendar, screen: 'advisor' },
                  ].map(item => (
                    <button key={item.screen} onClick={() => setCurrentScreen(item.screen)}
                      className="bg-card border border-border p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors group">
                      <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TAX OPTIMIZATION ═══════ */}
          {currentScreen === 'tax' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl tracking-wider">Tax Optimization</h2>
                <p className="text-sm text-muted-foreground tracking-wide mt-1">Input your deductions and analyze gaps against 2026 Luxembourg maximums</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="space-y-3">
                  <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-2">Deduction Categories</h3>
                  {DEDUCTION_CATEGORIES.map(cat => (
                    <div key={cat.key} className="border border-border bg-card">
                      <button className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                        onClick={() => setOpenAccordion(openAccordion === cat.key ? null : cat.key)}>
                        <span className="text-sm tracking-wide">{cat.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Max {fmt(cat.max)}</span>
                          <FiChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${openAccordion === cat.key ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {openAccordion === cat.key && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <label className={labelCls}>Current Annual Amount (EUR)</label>
                          <input type="number" className={inputCls} value={deductions[cat.key] || ''}
                            onChange={e => setDeductions(d => ({ ...d, [cat.key]: Number(e.target.value) }))}
                            placeholder="0" />
                          <div className="mt-2 h-1.5 bg-muted">
                            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, ((deductions[cat.key] || 0) / cat.max) * 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">
                            {fmt(deductions[cat.key] || 0)} of {fmt(cat.max)} used ({Math.round(((deductions[cat.key] || 0) / cat.max) * 100)}%)
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className={`${btnPrimary} w-full mt-4`} onClick={runTaxAnalysis} disabled={taxLoading}>
                    {taxLoading ? <><FiLoader className="w-4 h-4 animate-spin" /> Analyzing...</> : <>Analyze Tax Gaps <FiArrowRight className="w-4 h-4" /></>}
                  </button>
                  {taxError && <p className="text-sm text-destructive tracking-wide flex items-center gap-2"><FiAlertCircle className="w-4 h-4" /> {taxError}</p>}
                </div>

                {/* Results Panel */}
                <div className="space-y-4">
                  {!taxResults && !taxLoading && (
                    <div className="bg-card border border-border p-8 flex flex-col items-center justify-center min-h-[300px]">
                      <FiDollarSign className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground tracking-wide text-center">Enter your deductions and click &quot;Analyze Tax Gaps&quot; to see your results</p>
                    </div>
                  )}

                  {taxLoading && (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="bg-card border border-border p-4 animate-pulse">
                          <div className="h-4 bg-muted w-3/4 mb-2" /><div className="h-2 bg-muted w-full" />
                        </div>
                      ))}
                    </div>
                  )}

                  {taxResults && !taxLoading && (
                    <>
                      <div className="bg-card border border-border p-6 flex flex-col items-center">
                        <OptiScoreGauge score={taxResults.opti_score} size={150} />
                        <p className="text-xs text-muted-foreground mt-3 tracking-wide">
                          Marginal Rate: {typeof taxResults.marginal_tax_rate === 'number' ? (taxResults.marginal_tax_rate > 1 ? taxResults.marginal_tax_rate.toFixed(1) : (taxResults.marginal_tax_rate * 100).toFixed(1)) : '0'}%
                        </p>
                      </div>

                      <div className="bg-card border border-primary/30 p-4 text-center">
                        <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Total Missed Savings</p>
                        <p className="font-serif text-2xl text-primary tracking-wider">{fmt(taxResults.total_missed_savings)}</p>
                      </div>

                      <div className="bg-card border border-border p-5 space-y-4">
                        <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Category Breakdown</h4>
                        {Array.isArray(taxResults.categories) && taxResults.categories.map((cat, idx) => (
                          <CategoryProgressBar key={idx} name={cat.category_name} current={cat.current_amount} max={cat.maximum_amount} />
                        ))}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Recommendations</h4>
                        {Array.isArray(taxResults.recommendations) && taxResults.recommendations.map((rec, i) => (
                          <div key={i} className="bg-card border border-border p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium tracking-wide">{rec.category}</span>
                              <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${
                                rec.priority?.toLowerCase() === 'high' ? 'text-destructive border-destructive/30' :
                                rec.priority?.toLowerCase() === 'medium' ? 'text-primary border-primary/30' :
                                'text-green-500 border-green-500/30'
                              }`}>{rec.priority}</span>
                            </div>
                            <p className="text-sm text-muted-foreground tracking-wide">{rec.action}</p>
                            <p className="text-sm text-primary mt-1 tracking-wide">Potential saving: {fmt(rec.potential_saving)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ AID DISCOVERY ═══════ */}
          {currentScreen === 'aid' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl tracking-wider">Aid Discovery</h2>
                <p className="text-sm text-muted-foreground tracking-wide mt-1">Check your eligibility for Luxembourg state and commune-level aids</p>
              </div>

              <button className={`${btnPrimary} w-full sm:w-auto`} onClick={runAidDiscovery} disabled={aidLoading}>
                {aidLoading ? <><FiLoader className="w-4 h-4 animate-spin" /> Checking Eligibility...</> : <>Check Aid Eligibility <FiArrowRight className="w-4 h-4" /></>}
              </button>
              {aidError && <p className="text-sm text-destructive tracking-wide flex items-center gap-2"><FiAlertCircle className="w-4 h-4" /> {aidError}</p>}

              {!aidResults && !aidLoading && (
                <div className="bg-card border border-border p-8 text-center">
                  <FiGift className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground tracking-wide">Click &quot;Check Aid Eligibility&quot; to discover available government aids</p>
                </div>
              )}

              {aidLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-card border border-border p-5 animate-pulse">
                      <div className="h-4 bg-muted w-2/3 mb-3" /><div className="h-3 bg-muted w-1/2 mb-2" /><div className="h-3 bg-muted w-full" />
                    </div>
                  ))}
                </div>
              )}

              {aidResults && !aidLoading && (
                <>
                  <div className="bg-card border border-primary/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground">Total Potential Annual Aid</p>
                      <p className="font-serif text-2xl text-primary tracking-wider">{fmt(aidResults.total_estimated_annual_value)}</p>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground">Eligible Aids</p>
                      <p className="font-serif text-2xl tracking-wider">{aidResults.total_eligible_aids_count}</p>
                    </div>
                  </div>

                  {(() => {
                    const allAids = Array.isArray(aidResults.aids) ? aidResults.aids : []
                    const stateAids = allAids.filter(a => a.category?.toLowerCase().includes('state'))
                    const communeAids = allAids.filter(a => a.category?.toLowerCase().includes('commune'))
                    const otherAids = allAids.filter(a => !a.category?.toLowerCase().includes('state') && !a.category?.toLowerCase().includes('commune'))
                    const groups = [
                      { title: 'State Aids', aids: stateAids.length > 0 ? stateAids : (communeAids.length === 0 && otherAids.length === 0 ? allAids : []) },
                      { title: 'Commune Aids', aids: communeAids },
                      ...(otherAids.length > 0 ? [{ title: 'Other Aids', aids: otherAids }] : []),
                    ].filter(g => g.aids.length > 0)

                    return groups.map(group => (
                      <div key={group.title}>
                        <h3 className="font-serif text-lg tracking-wider mb-3">{group.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.aids.map((aid, i) => (
                            <div key={i} className="bg-card border border-border p-5 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-medium tracking-wide">{aid.aid_name}</h4>
                                <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border whitespace-nowrap flex-shrink-0 ${
                                  aid.status?.toLowerCase().includes('eligible') && !aid.status?.toLowerCase().includes('not')
                                    ? 'text-green-400 border-green-400/30 bg-green-400/10'
                                    : aid.status?.toLowerCase().includes('not')
                                    ? 'text-muted-foreground border-border bg-muted/50'
                                    : 'text-primary border-primary/30 bg-primary/10'
                                }`}>{aid.status}</span>
                              </div>
                              <p className="text-sm text-primary tracking-wide">{fmt(aid.estimated_annual_value)}/year</p>
                              <p className="text-xs text-muted-foreground tracking-wide leading-relaxed">{aid.description}</p>
                              <p className="text-[10px] text-muted-foreground/70 tracking-wide">{aid.requirements_summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </>
              )}
            </div>
          )}

          {/* ═══════ WEALTH OVERVIEW ═══════ */}
          {currentScreen === 'wealth' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl tracking-wider">Wealth Overview</h2>
                <p className="text-sm text-muted-foreground tracking-wide mt-1">Track your assets, debts, and cash flow</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {/* Bank Accounts */}
                  <div className="bg-card border border-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Bank Accounts</h4>
                      <button className="text-primary hover:text-primary/80 transition-colors" onClick={() => setWealth(w => ({ ...w, bankAccounts: [...w.bankAccounts, { name: '', balance: 0 }] }))}>
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    {wealth.bankAccounts.map((acc, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input className={`${inputCls} flex-1`} placeholder="Bank name" value={acc.name}
                          onChange={e => { const ba = [...wealth.bankAccounts]; ba[i] = { ...ba[i], name: e.target.value }; setWealth(w => ({ ...w, bankAccounts: ba })) }} />
                        <input type="number" className={`${inputCls} w-32`} placeholder="Balance" value={acc.balance || ''}
                          onChange={e => { const ba = [...wealth.bankAccounts]; ba[i] = { ...ba[i], balance: Number(e.target.value) }; setWealth(w => ({ ...w, bankAccounts: ba })) }} />
                        {wealth.bankAccounts.length > 1 && (
                          <button className="p-3 text-muted-foreground hover:text-destructive transition-colors" onClick={() => setWealth(w => ({ ...w, bankAccounts: w.bankAccounts.filter((_, j) => j !== i) }))}>
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Investments */}
                  <div className="bg-card border border-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Investments</h4>
                      <button className="text-primary hover:text-primary/80 transition-colors" onClick={() => setWealth(w => ({ ...w, investments: [...w.investments, { type: '', value: 0 }] }))}>
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    {wealth.investments.map((inv, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input className={`${inputCls} flex-1`} placeholder="Type (stocks, bonds...)" value={inv.type}
                          onChange={e => { const invs = [...wealth.investments]; invs[i] = { ...invs[i], type: e.target.value }; setWealth(w => ({ ...w, investments: invs })) }} />
                        <input type="number" className={`${inputCls} w-32`} placeholder="Value" value={inv.value || ''}
                          onChange={e => { const invs = [...wealth.investments]; invs[i] = { ...invs[i], value: Number(e.target.value) }; setWealth(w => ({ ...w, investments: invs })) }} />
                        {wealth.investments.length > 1 && (
                          <button className="p-3 text-muted-foreground hover:text-destructive transition-colors" onClick={() => setWealth(w => ({ ...w, investments: w.investments.filter((_, j) => j !== i) }))}>
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Debts */}
                  <div className="bg-card border border-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Debts</h4>
                      <button className="text-primary hover:text-primary/80 transition-colors" onClick={() => setWealth(w => ({ ...w, debts: [...w.debts, { type: '', amount: 0 }] }))}>
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    {wealth.debts.map((debt, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input className={`${inputCls} flex-1`} placeholder="Type (mortgage, loan...)" value={debt.type}
                          onChange={e => { const ds = [...wealth.debts]; ds[i] = { ...ds[i], type: e.target.value }; setWealth(w => ({ ...w, debts: ds })) }} />
                        <input type="number" className={`${inputCls} w-32`} placeholder="Amount" value={debt.amount || ''}
                          onChange={e => { const ds = [...wealth.debts]; ds[i] = { ...ds[i], amount: Number(e.target.value) }; setWealth(w => ({ ...w, debts: ds })) }} />
                        {wealth.debts.length > 1 && (
                          <button className="p-3 text-muted-foreground hover:text-destructive transition-colors" onClick={() => setWealth(w => ({ ...w, debts: w.debts.filter((_, j) => j !== i) }))}>
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Monthly Cash Flow */}
                  <div className="bg-card border border-border p-5 space-y-3">
                    <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Monthly Cash Flow</h4>
                    <div>
                      <label className={labelCls}>Monthly Income (EUR)</label>
                      <input type="number" className={inputCls} value={wealth.monthlyIncome || ''} placeholder="5000"
                        onChange={e => setWealth(w => ({ ...w, monthlyIncome: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Monthly Expenses (EUR)</label>
                      <input type="number" className={inputCls} value={wealth.monthlyExpenses || ''} placeholder="3500"
                        onChange={e => setWealth(w => ({ ...w, monthlyExpenses: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                {/* Wealth Display */}
                <div className="space-y-4">
                  <div className="bg-card border border-primary/30 p-6 text-center">
                    <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Net Worth</p>
                    <p className={`font-serif text-3xl tracking-wider ${netWorth >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netWorth)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border p-4 text-center">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Total Assets</p>
                      <p className="font-serif text-xl tracking-wider text-green-400">{fmt(totalAssets)}</p>
                    </div>
                    <div className="bg-card border border-border p-4 text-center">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Total Debts</p>
                      <p className="font-serif text-xl tracking-wider text-destructive">{fmt(totalDebts)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border p-4 text-center">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Debt-to-Asset</p>
                      <p className="font-serif text-xl tracking-wider">{dta}%</p>
                    </div>
                    <div className="bg-card border border-border p-4 text-center">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Monthly Cash Flow</p>
                      <p className={`font-serif text-xl tracking-wider ${cashFlow >= 0 ? 'text-green-400' : 'text-destructive'}`}>{fmt(cashFlow)}</p>
                    </div>
                  </div>

                  {wealth.monthlyIncome > 0 && (
                    <div className="bg-card border border-border p-4 text-center">
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Savings Rate</p>
                      <p className="font-serif text-xl tracking-wider text-primary">
                        {((cashFlow / wealth.monthlyIncome) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {totalAssets > 0 && (
                    <div className="bg-card border border-border p-5 space-y-3">
                      <h4 className="text-xs tracking-widest uppercase text-muted-foreground">Asset Breakdown</h4>
                      {wealth.bankAccounts.filter(a => a.balance > 0).map((a, i) => {
                        const pct = (a.balance / totalAssets) * 100
                        return (
                          <div key={`b${i}`} className="space-y-1">
                            <div className="flex justify-between text-xs tracking-wide">
                              <span>{a.name || 'Bank Account'}</span><span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        )
                      })}
                      {wealth.investments.filter(inv => inv.value > 0).map((inv, i) => {
                        const pct = (inv.value / totalAssets) * 100
                        return (
                          <div key={`i${i}`} className="space-y-1">
                            <div className="flex justify-between text-xs tracking-wide">
                              <span>{inv.type || 'Investment'}</span><span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ ADVISOR BOOKING ═══════ */}
          {currentScreen === 'advisor' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl tracking-wider">Advisor Booking</h2>
                <p className="text-sm text-muted-foreground tracking-wide mt-1">Generate a financial summary and book a consultation</p>
              </div>

              <button className={`${btnPrimary} w-full sm:w-auto`} onClick={runAdvisorSummary} disabled={advisorLoading}>
                {advisorLoading ? <><FiLoader className="w-4 h-4 animate-spin" /> Preparing Summary...</> : <>Prepare Advisor Summary <FiArrowRight className="w-4 h-4" /></>}
              </button>
              {advisorError && <p className="text-sm text-destructive tracking-wide flex items-center gap-2"><FiAlertCircle className="w-4 h-4" /> {advisorError}</p>}

              {!advisorSummary && !advisorLoading && (
                <div className="bg-card border border-border p-8 text-center">
                  <FiCalendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground tracking-wide">Generate a comprehensive summary for your financial advisor</p>
                  <p className="text-xs text-muted-foreground/60 tracking-wide mt-2">Tip: Run tax analysis and aid check first for a more complete summary</p>
                </div>
              )}

              {advisorLoading && (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-card border border-border p-5 animate-pulse">
                      <div className="h-3 bg-muted w-1/4 mb-3" /><div className="h-3 bg-muted w-full mb-2" /><div className="h-3 bg-muted w-3/4" />
                    </div>
                  ))}
                </div>
              )}

              {advisorSummary && !advisorLoading && (
                <div className="space-y-4">
                  <div className="bg-card border border-border p-5">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Client Profile</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm tracking-wide">
                      <p>Name: {advisorSummary.profile_summary.full_name}</p>
                      <p>Age: {advisorSummary.profile_summary.age}</p>
                      <p>Commune: {advisorSummary.profile_summary.commune}</p>
                      <p>Status: {advisorSummary.profile_summary.marital_status}</p>
                      <p>Tax Class: {advisorSummary.profile_summary.tax_class}</p>
                      <p>Dependents: {advisorSummary.profile_summary.dependents}</p>
                      <p>Employment: {advisorSummary.profile_summary.employment}</p>
                      <p>Salary: {fmt(advisorSummary.profile_summary.gross_salary)}</p>
                      <p>Housing: {advisorSummary.profile_summary.housing_status}</p>
                    </div>
                  </div>

                  <div className="bg-card border border-border p-5">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Tax Optimization Status</h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground tracking-wide">Opti-Score</p>
                        <p className="font-serif text-xl">{advisorSummary.tax_status.opti_score}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground tracking-wide">Potential Savings</p>
                        <p className="font-serif text-xl text-primary">{fmt(advisorSummary.tax_status.total_potential_savings)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground tracking-wide">Marginal Rate</p>
                        <p className="font-serif text-xl">
                          {typeof advisorSummary.tax_status.marginal_tax_rate === 'number'
                            ? (advisorSummary.tax_status.marginal_tax_rate > 1
                              ? advisorSummary.tax_status.marginal_tax_rate.toFixed(1)
                              : (advisorSummary.tax_status.marginal_tax_rate * 100).toFixed(1))
                            : '0'}%
                        </p>
                      </div>
                    </div>
                    {Array.isArray(advisorSummary.tax_status.key_gaps) && advisorSummary.tax_status.key_gaps.length > 0 && (
                      <div className="space-y-1 mt-3 border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">Key Gaps</p>
                        {advisorSummary.tax_status.key_gaps.map((g, i) => (
                          <p key={i} className="text-sm tracking-wide">{g.category}: {fmt(g.gap_amount)} gap (save {fmt(g.potential_saving)})</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-card border border-border p-5">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Government Aid Status</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground tracking-wide">Eligible Aids</p>
                        <p className="font-serif text-xl">{advisorSummary.aid_status.total_eligible}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground tracking-wide">Annual Value</p>
                        <p className="font-serif text-xl text-primary">{fmt(advisorSummary.aid_status.total_annual_value)}</p>
                      </div>
                    </div>
                    {Array.isArray(advisorSummary.aid_status.key_aids) && advisorSummary.aid_status.key_aids.length > 0 && (
                      <div className="space-y-1 mt-2 border-t border-border pt-3">
                        {advisorSummary.aid_status.key_aids.map((a, i) => (
                          <div key={i} className="flex justify-between text-sm tracking-wide">
                            <span>{a.name}</span>
                            <span className={a.status?.toLowerCase().includes('eligible') && !a.status?.toLowerCase().includes('not') ? 'text-green-400' : 'text-muted-foreground'}>{fmt(a.annual_value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-card border border-border p-5">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Wealth Snapshot</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="text-center"><p className="text-xs text-muted-foreground tracking-wide">Net Worth</p><p className="font-serif text-lg">{fmt(advisorSummary.wealth_snapshot.net_worth)}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground tracking-wide">Assets</p><p className="font-serif text-lg text-green-400">{fmt(advisorSummary.wealth_snapshot.total_assets)}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground tracking-wide">Debts</p><p className="font-serif text-lg text-destructive">{fmt(advisorSummary.wealth_snapshot.total_debts)}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground tracking-wide">Cash Flow</p><p className="font-serif text-lg">{fmt(advisorSummary.wealth_snapshot.monthly_cash_flow)}/mo</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground tracking-wide">Debt-to-Asset</p><p className="font-serif text-lg">{typeof advisorSummary.wealth_snapshot.debt_to_asset_ratio === 'number' ? (advisorSummary.wealth_snapshot.debt_to_asset_ratio > 1 ? advisorSummary.wealth_snapshot.debt_to_asset_ratio.toFixed(1) : (advisorSummary.wealth_snapshot.debt_to_asset_ratio * 100).toFixed(1)) : '0'}%</p></div>
                    </div>
                  </div>

                  <div className="bg-card border border-border p-5">
                    <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Advisor Talking Points</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">Priority Items</p>
                        {Array.isArray(advisorSummary.talking_points.priority_items) && advisorSummary.talking_points.priority_items.map((item, i) => (
                          <p key={i} className="text-sm tracking-wide mb-1.5 flex items-start gap-2">
                            <FiAlertCircle className="w-3 h-3 text-destructive mt-1 flex-shrink-0" /><span>{item}</span>
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">Quick Wins</p>
                        {Array.isArray(advisorSummary.talking_points.quick_wins) && advisorSummary.talking_points.quick_wins.map((item, i) => (
                          <p key={i} className="text-sm tracking-wide mb-1.5 flex items-start gap-2">
                            <FiCheck className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" /><span>{item}</span>
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">Long-term Strategies</p>
                        {Array.isArray(advisorSummary.talking_points.long_term_strategies) && advisorSummary.talking_points.long_term_strategies.map((item, i) => (
                          <p key={i} className="text-sm tracking-wide mb-1.5 flex items-start gap-2">
                            <FiTrendingUp className="w-3 h-3 text-primary mt-1 flex-shrink-0" /><span>{item}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground tracking-wide text-center">Generated: {advisorSummary.generated_date}</p>

                  <a href="https://calendly.com" target="_blank" rel="noopener noreferrer"
                    className={`${btnPrimary} w-full`}>
                    Book Your Consultation <FiExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ═══════ SETTINGS ═══════ */}
          {currentScreen === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-serif text-2xl tracking-wider">Settings & Profile</h2>
                  <p className="text-sm text-muted-foreground tracking-wide mt-1">Manage your profile and preferences</p>
                </div>
                <button className={editingProfile ? btnPrimary : btnSecondary}
                  onClick={() => setEditingProfile(!editingProfile)}>
                  {editingProfile ? <><FiCheck className="w-4 h-4" /> Save</> : <><FiEdit2 className="w-4 h-4" /> Edit Profile</>}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border p-5 space-y-3">
                  <h4 className="text-xs tracking-widest uppercase text-primary">Personal Information</h4>
                  {editingProfile ? (
                    <div className="space-y-2">
                      <div><label className={labelCls}>Full Name</label>
                        <input className={inputCls} value={profile.fullName} onChange={e => updateProfile('fullName', e.target.value)} /></div>
                      <div><label className={labelCls}>Date of Birth</label>
                        <input type="date" className={inputCls} value={profile.dob} onChange={e => updateProfile('dob', e.target.value)} /></div>
                      <div><label className={labelCls}>Commune</label>
                        <select className={inputCls} value={profile.commune} onChange={e => updateProfile('commune', e.target.value)}>
                          {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm tracking-wide">
                      <p>Name: {profile.fullName}</p>
                      <p>DOB: {profile.dob}</p>
                      <p>Commune: {profile.commune}</p>
                    </div>
                  )}
                </div>

                <div className="bg-card border border-border p-5 space-y-3">
                  <h4 className="text-xs tracking-widest uppercase text-primary">Family</h4>
                  {editingProfile ? (
                    <div className="space-y-2">
                      <div><label className={labelCls}>Marital Status</label>
                        <select className={inputCls} value={profile.maritalStatus} onChange={e => updateProfile('maritalStatus', e.target.value)}>
                          {['Single','Married','PACS','Divorced','Widowed'].map(s => <option key={s}>{s}</option>)}
                        </select></div>
                      <div><label className={labelCls}>Tax Class</label>
                        <select className={inputCls} value={profile.taxClass} onChange={e => updateProfile('taxClass', e.target.value)}>
                          {['1','1a','2'].map(c => <option key={c} value={c}>Class {c}</option>)}
                        </select></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm tracking-wide">
                      <p>Status: {profile.maritalStatus}</p>
                      <p>Tax Class: {profile.taxClass}</p>
                      <p>Children: {profile.numChildren}</p>
                      {profile.numChildren > 0 && <p>Ages: {profile.childrenAges.join(', ')}</p>}
                    </div>
                  )}
                </div>

                <div className="bg-card border border-border p-5 space-y-3">
                  <h4 className="text-xs tracking-widest uppercase text-primary">Employment</h4>
                  <div className="space-y-1.5 text-sm tracking-wide">
                    <p>Status: {profile.employmentStatus}</p>
                    <p>Employer: {profile.employer}</p>
                    <p>Salary: {fmt(profile.grossSalary)}</p>
                    {profile.partnerSalary > 0 && <p>Partner Salary: {fmt(profile.partnerSalary)}</p>}
                  </div>
                </div>

                <div className="bg-card border border-border p-5 space-y-3">
                  <h4 className="text-xs tracking-widest uppercase text-primary">Housing</h4>
                  <div className="space-y-1.5 text-sm tracking-wide">
                    <p>Status: {profile.housingStatus}</p>
                    {profile.housingStatus === 'Renter' && <p>Monthly Rent: {fmt(profile.monthlyRent)}</p>}
                    {profile.housingStatus === 'Owner' && (
                      <>
                        <p>Purchase Year: {profile.purchaseYear}</p>
                        <p>Loan: {fmt(profile.loanAmount)}</p>
                        <p>Remaining: {fmt(profile.remainingBalance)}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-5">
                <h4 className="text-xs tracking-widest uppercase text-primary mb-3">Application Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm tracking-wide">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-muted-foreground" />
                    <span>Last Tax Analysis: {lastTaxAnalysis || 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-muted-foreground" />
                    <span>Last Aid Check: {lastAidCheck || 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
