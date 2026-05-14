import { useState, useEffect } from 'react'
import api from '../../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { HiOutlineUsers, HiOutlineMegaphone, HiOutlineClipboard, HiOutlineChartBarSquare } from 'react-icons/hi2'
import { SkeletonStats } from '../../components/ui/Skeleton'

const COLORS = { Minimal: '#22c55e', Mild: '#eab308', Moderate: '#f97316', Severe: '#ef4444' }

interface Stats {
  total_employees: number
  total_campaigns: number
  total_sessions: number
  completion_rate: number
  department_breakdown: { department: string; emp_count: number; session_count: number; avg_score: number | null }[]
  severity_distribution: Record<string, number>
  campaign_trends: { name: string; avg_score: number | null; session_count: number }[]
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="text-2xl sm:text-3xl text-gray-300" />
      </div>
    </div>
  )
}

function SeverityPie({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  if (entries.length === 0) return <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={entries.map(([k, v]) => ({ name: k, value: v }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
          {entries.map(([k]) => <Cell key={k} fill={COLORS[k as keyof typeof COLORS] || '#9ca3af'} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats/').then(({ data }) => setStats(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-6"><SkeletonStats /><SkeletonStats count={2} /></div>
  if (!stats) return <p className="text-center py-20 text-gray-500">Failed to load dashboard.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={HiOutlineUsers} label="Employees" value={stats.total_employees} color="border-l-mindwell" />
        <StatCard icon={HiOutlineMegaphone} label="Campaigns" value={stats.total_campaigns} color="border-l-emerald-500" />
        <StatCard icon={HiOutlineClipboard} label="Sessions" value={stats.total_sessions} color="border-l-amber-500" />
        <StatCard icon={HiOutlineChartBarSquare} label="Completion" value={`${stats.completion_rate}%`} color="border-l-blue-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4 text-sm sm:text-base">Avg Score by Department</h2>
          {stats.department_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.department_breakdown} margin={{ bottom: 60 }}>
                <XAxis dataKey="department" angle={-20} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 27]} />
                <Tooltip />
                <Bar dataKey="avg_score" fill="#0d6e6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">No department data</p>}
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4 text-sm sm:text-base">Severity Distribution</h2>
          <SeverityPie data={stats.severity_distribution} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4 text-sm sm:text-base">Campaign Trends</h2>
        {stats.campaign_trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.campaign_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 27]} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_score" stroke="#0d6e6e" strokeWidth={2} dot={{ fill: '#0d6e6e', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-sm text-center py-8">No campaigns yet</p>}
      </div>
    </div>
  )
}
