import { useState } from 'react'

const BADGE = {
  KEEP:   'bg-green-100 text-green-800',
  CLOSE:  'bg-red-100 text-red-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
}

const BADGE_ICON = { KEEP: '✅', CLOSE: '🔴', REVIEW: '🟡' }

function RiskBar({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const color = pct >= 70 ? 'bg-red-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 font-medium w-10">{pct}/100</span>
    </div>
  )
}

export default function AccountTable({ results, onSelect }) {
  const [filter, setFilter]       = useState('')
  const [rimFilter, setRimFilter] = useState('')
  const [sortKey, setSortKey]     = useState('close_score')
  const [sortAsc, setSortAsc]     = useState(false)

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const filtered = results
    .filter((r) => !filter || r.recommendation === filter)
    .filter((r) => !rimFilter || r.rim_number?.toLowerCase().includes(rimFilter.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortAsc ? cmp : -cmp
    })

  const Th = ({ label, k }) => (
    <th
      onClick={() => toggleSort(k)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : <span className="text-gray-300">↕</span>}
    </th>
  )

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-gray-50">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Filter by outcome</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 bg-white"
          >
            <option value="">All accounts</option>
            <option value="KEEP">✅ Keep open</option>
            <option value="CLOSE">🔴 Close</option>
            <option value="REVIEW">🟡 Needs review</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Filter by customer ID</label>
          <input
            placeholder="Search customer ID..."
            value={rimFilter}
            onChange={(e) => setRimFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 w-48 bg-white"
          />
        </div>
        <div className="ml-auto self-end">
          <p className="text-sm text-gray-500">
            Showing <strong>{filtered.length}</strong> of <strong>{results.length}</strong> accounts
          </p>
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
        💡 Click any row to see the full explanation for that account.
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <Th label="Account ID"    k="account_id" />
              <Th label="Customer ID"   k="rim_number" />
              <Th label="Outcome"       k="recommendation" />
              <Th label="Risk Score"    k="close_score" />
              <Th label="Confidence"    k="confidence" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <tr
                key={r.account_id}
                onClick={() => onSelect(r)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{r.account_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.rim_number}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE[r.recommendation]}`}>
                    {BADGE_ICON[r.recommendation]} {r.recommendation}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RiskBar score={r.close_score} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${
                    r.confidence === 'HIGH' ? 'text-green-700' :
                    r.confidence === 'MEDIUM' ? 'text-yellow-700' : 'text-gray-500'
                  }`}>
                    {r.confidence === 'HIGH' ? 'Very confident' :
                     r.confidence === 'MEDIUM' ? 'Fairly confident' : 'Close call'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-sm">
                  <span className="line-clamp-2 leading-relaxed">
                    {r.hard_override_applied
                      ? `⚡ Rule applied: ${r.hard_override_applied}`
                      : r.reasoning?.replace(/^Recommended \w+ \(score: [\d.]+\)\. /, '')}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">🔍</div>
                  No accounts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
