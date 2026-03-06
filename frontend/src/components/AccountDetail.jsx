import { useState, useEffect } from 'react'
import { getRim, postOverride } from '../api'

// ── Plain-English helpers ────────────────────────────────────────────────────

const REC_CONFIG = {
  KEEP: {
    icon: '✅',
    color: 'bg-green-50 border-green-300',
    titleColor: 'text-green-800',
    badgeColor: 'bg-green-100 text-green-800',
    headline: 'Keep this account open',
    explanation:
      'Based on the information available, this account should remain open. There are enough signs that the customer is still active or has an important relationship with the bank.',
  },
  CLOSE: {
    icon: '🔴',
    color: 'bg-red-50 border-red-300',
    titleColor: 'text-red-800',
    badgeColor: 'bg-red-100 text-red-800',
    headline: 'Recommended for closure',
    explanation:
      'This account shows strong signs of being truly inactive — it has had no balance, no transactions, and no other banking relationship for a significant period of time.',
  },
  REVIEW: {
    icon: '🟡',
    color: 'bg-yellow-50 border-yellow-300',
    titleColor: 'text-yellow-800',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    headline: 'Needs a human reviewer',
    explanation:
      'This account is borderline — the system cannot make a confident call on its own. A staff member should look at this account before any decision is made.',
  },
}

const CONFIDENCE_TEXT = {
  HIGH: 'The system is very confident in this recommendation.',
  MEDIUM: 'The system is fairly confident, but a quick review is worthwhile.',
  LOW: 'This is a very close call — please review carefully before deciding.',
}

function factorSummary(key, score) {
  const s = score ?? 0
  if (key === 'zero_balance_days') {
    if (s === 0) return { status: 'good', text: 'The account went to zero balance recently — less than 3 months ago.' }
    if (s < 0.5) return { status: 'neutral', text: 'The account has had no funds for a few months.' }
    if (s < 1) return { status: 'warning', text: 'The account has had no funds for roughly 6 to 12 months.' }
    return { status: 'bad', text: 'The account has had no funds for over a year.' }
  }
  if (key === 'last_activity_days') {
    if (s === 0) return { status: 'good', text: 'There was a transaction within the last 3 months — the account is being used.' }
    if (s < 0.5) return { status: 'neutral', text: 'The last transaction was a few months ago.' }
    if (s < 1) return { status: 'warning', text: 'No transactions in around 4 to 6 months.' }
    return { status: 'bad', text: 'No transactions for over 6 months — the account appears dormant.' }
  }
  if (key === 'has_other_products') {
    if (s === 0) return { status: 'good', text: 'This customer has other active accounts or products with the bank — they are an active customer.' }
    return { status: 'bad', text: "This appears to be the customer's only account with the bank — there is no other banking relationship to consider." }
  }
  if (key === 'account_age_days') {
    if (s === 0) return { status: 'good', text: 'This account was opened very recently — it is too new to evaluate for closure.' }
    if (s < 0.3) return { status: 'good', text: 'This is a relatively young account.' }
    return { status: 'neutral', text: 'This is a well-established account that has been open for over a year.' }
  }
  if (key === 'account_open_reason') {
    if (s === 0) return { status: 'good', text: 'This account was opened for a protected reason (e.g. salary payments, regulatory requirement, or government benefit) — it should be kept open.' }
    return { status: 'neutral', text: 'This is a standard account with no special protected status.' }
  }
  return { status: 'neutral', text: '' }
}

const FACTOR_META = {
  zero_balance_days:  { label: 'How long has the balance been zero?', weight: '30%' },
  last_activity_days: { label: 'When was the last transaction?',       weight: '25%' },
  has_other_products: { label: 'Does this customer bank elsewhere with us?', weight: '25%' },
  account_age_days:   { label: 'How old is this account?',              weight: '10%' },
  account_open_reason:{ label: 'Why was this account opened?',          weight: '10%' },
}

const STATUS_STYLE = {
  good:    { dot: 'bg-green-500', bar: 'bg-green-400', bg: 'bg-green-50 border-green-200' },
  neutral: { dot: 'bg-gray-400',  bar: 'bg-gray-300',  bg: 'bg-gray-50 border-gray-200'  },
  warning: { dot: 'bg-yellow-500',bar: 'bg-yellow-400',bg: 'bg-yellow-50 border-yellow-200' },
  bad:     { dot: 'bg-red-500',   bar: 'bg-red-400',   bg: 'bg-red-50 border-red-200'    },
}

function FactorCard({ factorKey, score }) {
  const { label, weight } = FACTOR_META[factorKey]
  const { status, text } = factorSummary(factorKey, score)
  const style = STATUS_STYLE[status]
  const pct = Math.round((score ?? 0) * 100)

  return (
    <div className={`rounded-xl border p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">Weight: {weight}</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{text}</p>
          <div className="bg-white bg-opacity-60 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${style.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RiskGauge({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const markerLeft = Math.min(Math.max(pct, 2), 98)

  return (
    <div>
      <div className="relative h-5 rounded-full overflow-visible bg-gradient-to-r from-green-400 via-yellow-400 to-red-500">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow-md"
          style={{ left: `calc(${markerLeft}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
        <span>Keep (low risk)</span>
        <span>Review</span>
        <span>Close (high risk)</span>
      </div>
    </div>
  )
}

const RIM_BADGE = {
  KEEP:   'bg-green-100 text-green-800',
  CLOSE:  'bg-red-100 text-red-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AccountDetail({ account, batchId, onBack, onOverrideSaved }) {
  const [rimData, setRimData]       = useState(null)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideRec, setOverrideRec]   = useState(account.recommendation)
  const [reviewer, setReviewer]     = useState('')
  const [reason, setReason]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    getRim(account.rim_number).then((r) => setRimData(r.data)).catch(() => {})
  }, [account.rim_number])

  const handleOverride = async () => {
    if (!reviewer || !reason) return
    setSaving(true)
    try {
      await postOverride({
        account_id: account.account_id,
        rim_number: account.rim_number,
        batch_id: batchId,
        new_recommendation: overrideRec,
        reviewer_name: reviewer,
        reason,
      })
      setSaved(true)
      setTimeout(onOverrideSaved, 1500)
    } finally {
      setSaving(false)
    }
  }

  const rec    = REC_CONFIG[account.recommendation]
  const bd     = account.criteria_breakdown || {}
  const scored = !account.hard_override_applied

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-5 flex items-center gap-1">
        ← Back to all results
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left / Main column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recommendation banner */}
          <div className={`rounded-2xl border-2 p-6 ${rec.color}`}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Account {account.account_id}</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{rec.icon}</span>
                  <h2 className={`text-2xl font-bold ${rec.titleColor}`}>{rec.headline}</h2>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${rec.badgeColor}`}>
                {account.recommendation}
              </span>
            </div>

            <p className="mt-4 text-gray-700 leading-relaxed">{rec.explanation}</p>

            <p className="mt-3 text-sm text-gray-500 italic">
              {CONFIDENCE_TEXT[account.confidence]}
            </p>

            {/* Hard override notice */}
            {account.hard_override_applied && (
              <div className="mt-4 flex items-start gap-2 bg-white bg-opacity-60 rounded-xl p-3 border border-blue-200">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Automatic rule applied</p>
                  <p className="text-sm text-blue-700">{account.hard_override_applied} — the system applied a rule that overrides the usual scoring process.</p>
                </div>
              </div>
            )}
          </div>

          {/* Risk gauge */}
          {scored && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Overall Risk Score</h3>
              <p className="text-sm text-gray-500 mb-4">
                This account scored <strong>{Math.round((account.close_score ?? 0) * 100)} out of 100</strong> on the closure risk scale.
                The higher the score, the stronger the case for closing the account.
              </p>
              <RiskGauge score={account.close_score} />
            </div>
          )}

          {/* Factor breakdown */}
          {scored && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Why was this recommendation made?</h3>
              <p className="text-sm text-gray-500 mb-4">
                The system looks at 5 factors. Each one contributes a different amount to the final decision.
                Here is what each factor found for this account:
              </p>
              <div className="space-y-3">
                {Object.keys(FACTOR_META).map((key) => (
                  <FactorCard key={key} factorKey={key} score={bd[key]} />
                ))}
              </div>
            </div>
          )}

          {/* Override section */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Disagree with this recommendation?</h3>
            <p className="text-sm text-gray-500 mb-4">
              If you believe the system got it wrong, you can override the recommendation below.
              Your name and reason will be saved to the audit log.
            </p>

            {!showOverride ? (
              <button
                onClick={() => setShowOverride(true)}
                className="px-4 py-2 border-2 border-blue-600 text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors"
              >
                Override this recommendation
              </button>
            ) : saved ? (
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <span className="text-xl">✅</span> Override saved successfully.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Change recommendation to</label>
                  <select
                    value={overrideRec}
                    onChange={(e) => setOverrideRec(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="KEEP">KEEP — Keep the account open</option>
                    <option value="CLOSE">CLOSE — Close the account</option>
                    <option value="REVIEW">REVIEW — Send for further review</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Your name</label>
                  <input
                    placeholder="e.g. Sarah Al-Mutairi"
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Reason for override</label>
                  <textarea
                    placeholder="Explain why you are overriding this recommendation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOverride}
                    disabled={!reviewer || !reason || saving}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Override'}
                  </button>
                  <button onClick={() => setShowOverride(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right / RIM panel ── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Customer's Other Accounts</h3>
            <p className="text-sm text-gray-500 mb-4">
              All accounts belonging to customer <strong>{account.rim_number}</strong>.
              Reviewing the full picture helps you make a better decision.
            </p>

            {rimData ? (
              rimData.accounts.length === 0 ? (
                <p className="text-sm text-gray-400">No other accounts found.</p>
              ) : (
                <div className="space-y-2">
                  {rimData.accounts.map((a) => {
                    const isThis = a.account_id === account.account_id
                    return (
                      <div
                        key={a.account_id + a.evaluated_at}
                        className={`p-3 rounded-xl border text-sm ${isThis ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">{a.account_id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RIM_BADGE[a.recommendation]}`}>
                            {a.recommendation}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          Risk score: <strong>{Math.round((a.close_score ?? 0) * 100)}/100</strong>
                        </p>
                        {isThis && (
                          <p className="text-blue-600 text-xs mt-1 font-medium">← You are viewing this account</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}
          </div>

          {/* Quick facts */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Facts</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Account ID</dt>
                <dd className="font-mono font-medium text-gray-800">{account.account_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer RIM</dt>
                <dd className="font-mono font-medium text-gray-800">{account.rim_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Risk score</dt>
                <dd className="font-medium text-gray-800">{Math.round((account.close_score ?? 0) * 100)} / 100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Confidence</dt>
                <dd className="font-medium text-gray-800">{account.confidence}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Evaluated</dt>
                <dd className="text-gray-800">{account.evaluated_at ? new Date(account.evaluated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Config version</dt>
                <dd className="font-mono text-xs text-gray-400">{account.config_version}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>
    </div>
  )
}
