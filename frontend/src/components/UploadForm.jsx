import { useState, useRef } from 'react'
import { evaluateFile } from '../api'

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

    </div>
  )
}
