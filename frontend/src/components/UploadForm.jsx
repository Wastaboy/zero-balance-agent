import { useState, useRef } from 'react'
import { evaluateFile } from '../api'

const STEPS = [
  { icon: '📂', title: 'Upload your file', desc: 'Choose a CSV or Excel file containing your zero-balance account data.' },
  { icon: '⚙️', title: 'System evaluates each account', desc: 'Each account is scored against 5 criteria — balance duration, last activity, customer relationships, account age, and reason for opening.' },
  { icon: '📊', title: 'Review the results', desc: 'Every account gets a clear recommendation: Keep Open, Close, or Needs Review — with a plain-English explanation.' },
]

const REQUIRED_COLUMNS = [
  { col: 'account_id',           desc: 'A unique code for each account' },
  { col: 'rim_number',           desc: 'The customer identifier (links accounts belonging to the same person)' },
  { col: 'current_balance',      desc: 'Must be 0.00 for all rows' },
  { col: 'zero_balance_since',   desc: 'The date the balance became zero (e.g. 2024-06-01)' },
  { col: 'last_transaction_date',desc: 'Date of the most recent transaction' },
  { col: 'account_open_date',    desc: 'Date the account was originally opened' },
]

export default function UploadForm({ onComplete }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setError(null) }
  }

  const handlePick = (e) => {
    const f = e.target.files[0]
    if (f) { setFile(f); setError(null) }
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await evaluateFile(file)
      onComplete(res.data)
    } catch (e) {
      setError(e.response?.data?.detail?.message || e.message || 'Something went wrong. Please check your file and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🏦</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Zero Balance Account Advisor</h1>
        <p className="text-gray-500 text-lg">
          Upload your account data and get a clear, explainable recommendation for each account —
          no guesswork, no black boxes.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border p-5 shadow-sm text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <p className="font-semibold text-gray-800 text-sm mb-1">
              <span className="text-gray-400 mr-1">Step {i + 1}.</span>{s.title}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <h2 className="font-bold text-gray-800 text-lg mb-1">Upload your file</h2>
        <p className="text-sm text-gray-500 mb-5">Accepted formats: CSV (.csv) or Excel (.xlsx, .xls)</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-blue-400 bg-blue-50 scale-[1.01]'
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handlePick} />

          {file ? (
            <>
              <div className="text-4xl mb-2">✅</div>
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB — click to change
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">📂</div>
              <p className="font-semibold text-gray-700">Drag & drop your file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse your computer</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="mt-5 w-full py-4 bg-blue-600 text-white font-bold text-base rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Analysing accounts — please wait...
            </span>
          ) : (
            'Run Evaluation →'
          )}
        </button>
      </div>

      {/* File format guide */}
      <div className="mt-6 bg-white rounded-2xl border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>📋 What columns does my file need?</span>
          <span className="text-gray-400">{showGuide ? '▲' : '▼'}</span>
        </button>

        {showGuide && (
          <div className="px-6 pb-6 border-t">
            <p className="text-sm text-gray-500 mt-4 mb-4">
              Your file must include these columns. Column names are not case-sensitive and spaces are ignored.
            </p>
            <div className="space-y-2">
              {REQUIRED_COLUMNS.map((c) => (
                <div key={c.col} className="flex items-start gap-3 text-sm">
                  <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">
                    {c.col}
                  </code>
                  <span className="text-gray-600">{c.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Optional columns: <code className="bg-gray-100 px-1 rounded">account_open_reason</code> and <code className="bg-gray-100 px-1 rounded">other_active_products</code>
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
