import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { HiOutlineMagnifyingGlass, HiOutlineLink } from 'react-icons/hi2'

interface SessionInfo {
  id: number
  campaign: string
  completed: boolean
  completed_at: string | null
  result_url: string
}

interface EmployeeInfo {
  name: string
  department: string
  designation: string
  code_short: string
}

export default function EmployeeLookupPage() {
  const [code, setCode] = useState('')
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEmployee(null)
    setSessions([])
    try {
      const { data } = await api.get(`/employees/lookup/?code=${encodeURIComponent(code)}`)
      setEmployee(data.employee)
      setSessions(data.sessions)
    } catch {
      setError('Employee not found with that code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Look Up Employee</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter anonymous code (e.g. A7X92K...)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" required />
        <button type="submit" disabled={loading} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50 flex items-center gap-1">
          <HiOutlineMagnifyingGlass className="text-base" /> Search
        </button>
      </form>

      {error && <p className="text-red-600 bg-red-50 rounded-lg p-3 text-sm">{error}</p>}

      {employee && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">{employee.name}</h2>
            <p className="text-sm text-gray-500">{employee.department} — {employee.designation}</p>
            <p className="text-xs mt-1"><span className="code-badge">{employee.code_short}</span></p>
          </div>

          {sessions.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-600 mb-2">Screening History</h3>
              <div className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{s.campaign}</p>
                      <p className="text-xs text-gray-400">{s.completed ? new Date(s.completed_at!).toLocaleDateString() : 'Pending'}</p>
                    </div>
                    {s.completed ? (
                      <Link to={s.result_url} className="text-mindwell text-sm font-medium flex items-center gap-1 hover:underline">
                        View <HiOutlineLink className="text-xs" />
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
