import { useState, useRef } from 'react'
import { evaluateFile } from '../api'

export default function UploadForm({ onComplete }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await evaluateFile(file)
      onComplete(res.data)
    } catch (e) {
      setError(e.response?.data?.detail?.message || e.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-16">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Evaluate Zero-Balance Accounts</h1>
      <p className="text-gray-500 mb-6">Upload a CSV or Excel file with your zero-balance account data.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 bg-white'}`}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
        <div className="text-4xl mb-3">📂</div>
        {file ? (
          <p className="font-medium text-gray-700">{file.name}</p>
        ) : (
          <>
            <p className="font-medium text-gray-700">Drag & drop your file here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse — CSV or Excel</p>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Evaluating...' : 'Run Evaluation'}
      </button>
    </div>
  )
}
