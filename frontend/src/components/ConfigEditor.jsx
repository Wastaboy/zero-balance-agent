import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '../api'

export default function ConfigEditor() {
  const [config, setConfig] = useState(null)
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    getConfig().then((r) => {
      setConfig(r.data)
      setRaw(JSON.stringify(r.data, null, 2))
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const parsed = JSON.parse(raw)
      await updateConfig(parsed)
      setMessage({ type: 'success', text: 'Config saved successfully' })
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || e.message })
    } finally {
      setSaving(false)
    }
  }

  if (!config) return <div className="text-gray-400 text-sm">Loading config...</div>

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Scoring Configuration</h2>
      <p className="text-sm text-gray-500 mb-4">
        Edit thresholds and weights below. All weights must sum to 1.0. Changes are logged in the audit trail.
      </p>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="w-full h-96 font-mono text-sm border rounded-xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        spellCheck={false}
      />

      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save Config'}
      </button>
    </div>
  )
}
