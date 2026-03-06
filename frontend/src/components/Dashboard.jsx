import { useState, useEffect } from 'react'
import { getSummary, getExportUrl } from '../api'
import { RecommendationPie, ScoreHistogram } from './Charts'
import AccountTable from './AccountTable'

const BADGE = { KEEP: 'bg-green-100 text-green-800', CLOSE: 'bg-red-100 text-red-800', REVIEW: 'bg-yellow-100 text-yellow-800' }

export default function Dashboard({ batchData, onSelectAccount }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getSummary(batchData.batch_id).then((r) => setSummary(r.data))
  }, [batchData.batch_id])

  const results = batchData.results || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Evaluation Results</h2>
        <a href={getExportUrl(batchData.batch_id)} className="text-sm text-blue-600 hover:underline">⬇ Export CSV</a>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Accounts', value: summary.total, color: 'text-gray-800' },
              { label: 'KEEP', value: summary.keep, color: 'text-green-700' },
              { label: 'CLOSE', value: summary.close, color: 'text-red-700' },
              { label: 'REVIEW', value: summary.review, color: 'text-yellow-700' },
              { label: 'Avg Score', value: summary.average_close_score?.toFixed(3), color: 'text-indigo-700' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Recommendation Distribution</h3>
              <RecommendationPie summary={summary} />
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Close Score Distribution</h3>
              <ScoreHistogram results={results} />
            </div>
          </div>
        </>
      )}

      {batchData.validation_errors?.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠ {batchData.validation_errors.length} row(s) had validation errors and were skipped.
        </div>
      )}

      <AccountTable results={results} onSelect={onSelectAccount} />
    </div>
  )
}
