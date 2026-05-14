import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { HiOutlineBuildingOffice2, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2'

interface CompanySummary {
  id: number
  name: string
  tier: string
  is_active: boolean
  total_employees: number
  total_campaigns: number
  total_sessions: number
  questionnaires_assigned: number
}

export default function PsychiatristCompaniesPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/psy/dashboard/').then(({ data }) => setCompanies(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Psychiatrist Dashboard</h1>

      <div className="grid gap-4">
        {companies.map((c) => (
          <Link key={c.id} to={`/psy/companies/${c.id}`} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition block">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <HiOutlineBuildingOffice2 className="text-2xl text-mindwell" />
                <div>
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? <HiOutlineCheckCircle /> : <HiOutlineXCircle />}
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{c.tier}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div><p className="font-bold text-lg">{c.total_employees}</p><p className="text-gray-400 text-xs">Employees</p></div>
                <div><p className="font-bold text-lg">{c.total_sessions}</p><p className="text-gray-400 text-xs">Sessions</p></div>
                <div><p className="font-bold text-lg">{c.questionnaires_assigned}</p><p className="text-gray-400 text-xs">Scales</p></div>
              </div>
            </div>
          </Link>
        ))}
        {companies.length === 0 && <p className="text-center py-10 text-gray-400">No companies registered yet.</p>}
      </div>
    </div>
  )
}
