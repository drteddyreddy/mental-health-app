import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineClipboard, HiOutlineArrowLeft, HiOutlineDocumentArrowDown, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

interface SessionInfo {
  id: number
  employee_code: string
  employee_department: string
  is_completed: boolean
  unique_link: string
  completed_at: string | null
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<any>(null)
  const [sessions, setSessions] = useState<{ total: number; completed: number; completion_rate: number; sessions: SessionInfo[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', start_date: '', end_date: '', is_active: true })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [campRes, sessRes] = await Promise.all([
          api.get(`/campaigns/${id}/`),
          api.get(`/campaigns/${id}/sessions/`),
        ])
        const c = campRes.data
        setCampaign(c)
        setEditForm({ name: c.name, start_date: c.start_date, end_date: c.end_date, is_active: c.is_active })
        setSessions(sessRes.data)
      } catch { toast.error('Failed to load campaign') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link copied!')
  }

  const handleSave = async () => {
    if (!editForm.name || !editForm.start_date || !editForm.end_date) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put(`/campaigns/${id}/`, editForm)
      setCampaign(data)
      setEditing(false)
      toast.success('Campaign updated!')
    } catch {
      toast.error('Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/campaigns/${id}/`)
      toast.success('Campaign deleted')
      navigate('/campaigns')
    } catch {
      toast.error('Failed to delete campaign')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (!campaign) return <p className="text-center py-20 text-gray-500">Campaign not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="text-gray-400 hover:text-gray-600 transition"><HiOutlineArrowLeft className="text-xl" /></Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{campaign.name}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{campaign.start_date} – {campaign.end_date}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              <HiOutlinePencilSquare className="text-base" /> Edit
            </button>
          )}
          <a href={`/api/campaigns/${id}/report.csv/`} className="flex items-center gap-1.5 border border-mindwell text-mindwell px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-50 transition">
            CSV
          </a>
          <a href={`/api/campaigns/${id}/report.pdf/`} className="flex items-center gap-1.5 bg-mindwell text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition">
            <HiOutlineDocumentArrowDown className="text-base" /> PDF Report
          </a>
        </div>
      </div>

      {editing && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold">Edit Campaign</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="date" value={editForm.start_date} onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input type="date" value={editForm.end_date} onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300 text-mindwell focus:ring-mindwell" />
            Active
          </label>
          <div className="flex justify-between">
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition">
              <HiOutlineTrash className="text-base" /> Delete Campaign
            </button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl sm:text-2xl font-bold">{sessions?.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-xl sm:text-2xl font-bold">{sessions?.completed || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Rate</p>
          <p className="text-xl sm:text-2xl font-bold">{sessions?.completion_rate || 0}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm sm:text-base">Anonymous Links</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Department</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions?.sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="code-badge text-xs">{s.employee_code}</span></td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{s.employee_department}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.is_completed ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => copyLink(s.unique_link)} className="flex items-center gap-1 text-xs text-mindwell font-medium hover:underline" aria-label={`Copy link for ${s.employee_code}`}>
                      <HiOutlineClipboard className="text-sm" /> Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
