import { useState } from 'react'
import UploadForm from './components/UploadForm'
import Dashboard from './components/Dashboard'
import AccountDetail from './components/AccountDetail'
import ConfigEditor from './components/ConfigEditor'

export default function App() {
  const [page, setPage] = useState('upload') // upload | dashboard | config
  const [batchData, setBatchData] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)

  const nav = (p) => { setPage(p); setSelectedAccount(null) }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
          <span className="font-bold text-gray-800 text-lg">Zero Balance Advisor</span>
          <button onClick={() => nav('upload')} className={`text-sm font-medium px-3 py-1 rounded ${page === 'upload' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Upload</button>
          {batchData && <button onClick={() => nav('dashboard')} className={`text-sm font-medium px-3 py-1 rounded ${page === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Results</button>}
          <button onClick={() => nav('config')} className={`text-sm font-medium px-3 py-1 rounded ${page === 'config' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Config</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'upload' && (
          <UploadForm onComplete={(data) => { setBatchData(data); nav('dashboard') }} />
        )}
        {page === 'dashboard' && batchData && !selectedAccount && (
          <Dashboard
            batchData={batchData}
            onSelectAccount={setSelectedAccount}
          />
        )}
        {page === 'dashboard' && selectedAccount && (
          <AccountDetail
            account={selectedAccount}
            batchId={batchData.batch_id}
            onBack={() => setSelectedAccount(null)}
            onOverrideSaved={() => setSelectedAccount(null)}
          />
        )}
        {page === 'config' && <ConfigEditor />}
      </main>
    </div>
  )
}
