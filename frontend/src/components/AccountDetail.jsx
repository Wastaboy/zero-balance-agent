import { useState, useEffect } from 'react'
import { getRim, postOverride } from '../api'

const BADGE = {
  KEEP: 'bg-green-100 text-green-800',
  CLOSE: 'bg-red-100 text-red-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
}

function CriteriaBar({ label, score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 70 ? 'bg-red-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-xs text-gray-500">{score?.toFixed(4)}</span>
    </div>
  )
}

export default function AccountDetail({ account, batchId, onBack, onOverrideSaved }) {
  const [rimData, setRimData] = useState(null)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideRec, setOverrideRec] = useState(account.recommendation)
  const [reviewer, setReviewer] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      setTimeout(onOverrideSaved, 1200)
    } finally {
      setSaving(false)
    }
  }

  const bd = account.criteria_breakdown || {}

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-4">← Back to results</button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main detail */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{account.account_id}</h2>
                <p className="text-sm text-gray-500">RIM: {account.rim_number}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${BADGE[account.recommendation]}`}>
                {account.recommendation}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Close Score</p>
              <p className="text-3xl font-bold text-gray-800">{account.close_score?.toFixed(4)}</p>
              <p className="text-xs text-gray-400">Confidence: {account.confidence}</p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {account.reasoning}
            </div>

            {account.hard_override_applied && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                ⚡ Hard override: {account.hard_override_applied}
              </div>
            )}
          </div>

          {/* Criteria breakdown */}
          {!account.hard_override_applied && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Criteria Breakdown</h3>
              <div className="space-y-3">
                <CriteriaBar label="Zero Balance Days (30%)" score={bd.zero_balance_days} />
                <CriteriaBar label="Last Activity Days (25%)" score={bd.last_activity_days} />
                <CriteriaBar label="Has Other Products (25%)" score={bd.has_other_products} />
                <CriteriaBar label="Account Age (10%)" score={bd.account_age_days} />
                <CriteriaBar label="Open Reason (10%)" score={bd.account_open_reason} />
              </div>
            </div>
          )}

          {/* Override */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {!showOverride ? (
              <button onClick={() => setShowOverride(true)} className="text-sm text-blue-600 hover:underline font-medium">
                Override this recommendation
              </button>
            ) : saved ? (
              <p className="text-green-600 font-medium text-sm">✓ Override saved</p>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Manual Override</h3>
                <select value={overrideRec} onChange={(e) => setOverrideRec(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="KEEP">KEEP</option>
                  <option value="CLOSE">CLOSE</option>
                  <option value="REVIEW">REVIEW</option>
                </select>
                <input placeholder="Your name" value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <textarea placeholder="Reason for override" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" />
                <div className="flex gap-2">
                  <button onClick={handleOverride} disabled={!reviewer || !reason || saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40">
                    {saving ? 'Saving...' : 'Save Override'}
                  </button>
                  <button onClick={() => setShowOverride(false)} className="px-4 py-2 text-sm text-gray-600 hover:underline">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIM panel */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">RIM Relationship</h3>
          <p className="text-xs text-gray-400 mb-3">All accounts under RIM {account.rim_number}</p>
          {rimData ? (
            <div className="space-y-2">
              {rimData.accounts.map((a) => (
                <div key={a.account_id + a.evaluated_at} className={`p-2 rounded-lg border text-xs ${a.account_id === account.account_id ? 'border-blue-300 bg-blue-50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{a.account_id}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${BADGE[a.recommendation]}`}>{a.recommendation}</span>
                  </div>
                  <p className="text-gray-400 mt-0.5">Score: {a.close_score?.toFixed(4)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </div>
      </div>
    </div>
  )
}
