import { useState } from 'react'

const BADGE = {
  KEEP: 'bg-green-100 text-green-800',
  CLOSE: 'bg-red-100 text-red-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
}

export default function AccountTable({ results, onSelect }) {
  const [filter, setFilter] = useState('')
  const [rimFilter, setRimFilter] = useState('')
  const [sortKey, setSortKey] = useState('close_score')
  const [sortAsc, setSortAsc] = useState(false)

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const filtered = results
    .filter((r) => !filter || r.recommendation === filter)
    .filter((r) => !rimFilter || r.rim_number.toLowerCase().includes(rimFilter.toLowerCase()))
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
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="flex flex-wrap gap-3 p-4 border-b">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 text-gray-700"
        >
          <option value="">All recommendations</option>
          <option value="KEEP">KEEP</option>
          <option value="CLOSE">CLOSE</option>
          <option value="REVIEW">REVIEW</option>
        </select>
        <input
          placeholder="Filter by RIM..."
          value={rimFilter}
          onChange={(e) => setRimFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 w-44"
        />
        <span className="text-sm text-gray-400 self-center">{filtered.length} accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="Account ID" k="account_id" />
              <Th label="RIM" k="rim_number" />
              <Th label="Recommendation" k="recommendation" />
              <Th label="Score" k="close_score" />
              <Th label="Confidence" k="confidence" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reasoning</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr
                key={r.account_id}
                onClick={() => onSelect(r)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.account_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.rim_number}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE[r.recommendation]}`}>
                    {r.recommendation}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.close_score?.toFixed(4)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.confidence}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{r.reasoning}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
