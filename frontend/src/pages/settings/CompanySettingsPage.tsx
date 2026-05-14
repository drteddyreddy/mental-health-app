import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'

export default function CompanySettingsPage() {
  const [form, setForm] = useState({ name: '', industry: '', tier: 'basic' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/company/').then(({ data }) => setForm({ name: data.name, industry: data.industry || '', tier: data.tier })).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/company/', form)
      toast.success('Company profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HiOutlineBuildingOffice2 className="text-2xl text-mindwell" />
        <h1 className="text-xl sm:text-2xl font-bold">Company Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className={inputClass} placeholder="e.g. Technology, Healthcare" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            {form.tier === 'pro' ? 'Pro — Screening + Recommendations' : 'Basic — Screening Only'}
          </p>
        </div>
        <button type="submit" disabled={saving} className="w-full bg-mindwell text-white font-semibold py-2.5 rounded-lg hover:bg-mindwell-dark transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
