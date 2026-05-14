import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { HiOutlineArrowLeft } from 'react-icons/hi2'

interface Analytics {
  company_name: string
  total_employees: number
  total_campaigns: number
  total_sessions: number
  department_breakdown: { department: string; avg_score: number | null; grade: string | null; session_count: number }[]
  campaign_trends: { name: string; avg_score: number | null; grade: string | null; session_count: number }[]
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null
  const colors: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[grade] || 'bg-gray-100'}`}>{grade}</span>
}

export default function PsychiatristAnalyticsPage() {
  const { id } = useParams()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/psy/companies/${id}/analytics/`).then(({ data }) => setData(data)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (!data) return <p className="text-center py-20 text-gray-500">No data yet.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/psy/companies" className="text-gray-400 hover:text-gray-600"><HiOutlineArrowLeft className="text-xl" /></Link>
        <div>
          <h1 className="text-xl font-bold">{data.company_name} — Analytics</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Employees</p>
          <p className="text-2xl font-bold">{data.total_employees}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-bold">{data.total_sessions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Campaigns</p>
          <p className="text-2xl font-bold">{data.total_campaigns}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4">Department Grades</h2>
        {data.department_breakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Department</th>
                  <th className="text-center px-3 py-2 font-medium">Sessions</th>
                  <th className="text-center px-3 py-2 font-medium">Avg Score</th>
                  <th className="text-center px-3 py-2 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.department_breakdown.map((d) => (
                  <tr key={d.department} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{d.department}</td>
                    <td className="px-3 py-2 text-center">{d.session_count}</td>
                    <td className="px-3 py-2 text-center">{d.avg_score ?? '—'}</td>
                    <td className="px-3 py-2 text-center"><GradeBadge grade={d.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-center py-6">No department data available</p>}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4">Campaign Grade Trends</h2>
        {data.campaign_trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.campaign_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 27]} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_score" stroke="#0d6e6e" strokeWidth={2} dot={{ fill: '#0d6e6e', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-6">No campaign data yet</p>}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4">Department Score Comparison</h2>
        {data.department_breakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.department_breakdown} margin={{ bottom: 60 }}>
              <XAxis dataKey="department" angle={-20} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 27]} />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#0d6e6e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-6">No department data</p>}
      </div>
    </div>
  )
}
