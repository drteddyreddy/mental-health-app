import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { HiOutlinePlus, HiOutlineCalendarDays, HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'

interface Campaign {
  id: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  total_sessions: number
  completed_sessions: number
  questionnaires: { name: string }[]
}

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/campaigns/').then(({ data }) => setCampaigns(data.results ?? data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = campaigns.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="space-y-4"><div className="h-8 bg-gray-200 rounded w-32 animate-pulse" /><SkeletonCardGrid count={6} /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Campaigns</h1>
        <Link to="/campaigns/new" className="flex items-center gap-1.5 bg-mindwell text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition">
          <HiOutlinePlus className="text-base" /> New Campaign
        </Link>
      </div>

      <div className="relative max-w-md">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition block">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{c.name}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                <HiOutlineCalendarDays />
                {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
              </div>
              <div className="flex gap-1 mb-3 flex-wrap">
                {c.questionnaires?.map((q) => (
                  <span key={q.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.name}</span>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                {c.completed_sessions}/{c.total_sessions} completed
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <HiOutlinePlus className="text-5xl mx-auto mb-3" />
          <p className="mb-1">{search ? 'No campaigns match your search.' : 'No campaigns yet.'}</p>
          {!search && <Link to="/campaigns/new" className="text-mindwell font-medium hover:underline text-sm">Create your first campaign</Link>}
        </div>
      )}
    </div>
  )
}
