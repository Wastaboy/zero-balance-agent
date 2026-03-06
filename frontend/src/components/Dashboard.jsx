import { useState, useEffect } from 'react'
import { getSummary, getExportUrl } from '../api'
import { RecommendationPie, ScoreHistogram } from './Charts'
import AccountTable from './AccountTable'

const SUMMARY_CARDS = [
  {
    key: 'total',
    label: 'Total accounts reviewed',
    desc: 'Number of accounts in your file that were successfully evaluated.',
    color: 'border-l-gray-400',
    textColor: 'text-gray-800',
  },
  {
    key: 'keep',
    label: 'Keep open',
    desc: 'These accounts show signs of activity or have an important customer relationship.',
    color: 'border-l-green-500',
    textColor: 'text-green-700',
    icon: '✅',
  },
  {
    key: 'close',
    label: 'Recommended for closure',
    desc: 'These accounts appear inactive with no customer relationship to protect.',
    color: 'border-l-red-500',
    textColor: 'text-red-700',
    icon: '🔴',
  },
  {
    key: 'review',
    label: 'Needs human review',
    desc: 'These are borderline cases — a staff member should decide.',
    color: 'border-l-yellow-500',
    textColor: 'text-yellow-700',
    icon: '🟡',
  },
]

export default function Dashboard({ batchData, onSelectAccount }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getSummary(batchData.batch_id).then((r) => setSummary(r.data))
  }, [batchData.batch_id])

  const results = batchData.results || []
  const errors  = batchData.validation_errors || []

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Evaluation Complete</h2>
          <p className="text-gray-500 mt-1">
            Here is a summary of what the system found. Click any account in the table below to see a full explanation.
          </p>
        </div>
        <a
          href={getExportUrl(batchData.batch_id)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors"
        >
          ⬇ Download results as CSV
        </a>
      </div>

      {/* Validation errors banner */}
      {errors.length > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-2xl">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-800">
              {errors.length} row{errors.length > 1 ? 's' : ''} could not be processed
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              These rows were skipped because they had missing or invalid data (for example, a missing customer ID or an unrecognisable date).
              All other accounts were evaluated normally.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {SUMMARY_CARDS.map((c) => (
              <div key={c.key} className={`bg-white rounded-2xl border border-l-4 ${c.color} p-5 shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  {c.icon && <span className="text-lg">{c.icon}</span>}
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                </div>
                <p className={`text-4xl font-bold ${c.textColor}`}>{summary[c.key]}</p>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Breakdown by recommendation</h3>
              <p className="text-sm text-gray-500 mb-4">
                How your accounts are split across the three outcomes.
              </p>
              <RecommendationPie summary={summary} />
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Risk score distribution</h3>
              <p className="text-sm text-gray-500 mb-4">
                How risky each account scored — accounts on the left are safer to keep, accounts on the right are stronger candidates for closure.
              </p>
              <ScoreHistogram results={results} />
            </div>
          </div>

          {/* Average score callout */}
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="text-4xl">📈</div>
            <div>
              <p className="font-semibold text-indigo-800">
                Average risk score across all accounts: <span className="text-2xl">{Math.round((summary.average_close_score ?? 0) * 100)}/100</span>
              </p>
              <p className="text-sm text-indigo-600 mt-0.5">
                Scores below 40 suggest keeping the account. Scores above 70 suggest closure.
                Scores in between need a human decision.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Account table */}
      <AccountTable results={results} onSelect={onSelectAccount} />
    </div>
  )
}
