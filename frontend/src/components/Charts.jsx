import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = { KEEP: '#22c55e', CLOSE: '#ef4444', REVIEW: '#f59e0b' }

export function RecommendationPie({ summary }) {
  const data = [
    { name: 'KEEP', value: summary.keep },
    { name: 'CLOSE', value: summary.close },
    { name: 'REVIEW', value: summary.review },
  ].filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ScoreHistogram({ results }) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${(i * 0.1).toFixed(1)}–${((i + 1) * 0.1).toFixed(1)}`,
    count: 0,
  }))
  results.forEach((r) => {
    const idx = Math.min(Math.floor(r.close_score * 10), 9)
    buckets[idx].count++
  })
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets}>
        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  )
}
