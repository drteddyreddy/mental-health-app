import { useState } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineKey } from 'react-icons/hi2'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (form.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password/', { old_password: form.old_password, new_password: form.new_password })
      toast.success('Password changed!')
      setForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HiOutlineKey className="text-2xl text-mindwell" />
        <h1 className="text-xl sm:text-2xl font-bold">Change Password</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input type="password" value={form.old_password} onChange={(e) => setForm((f) => ({ ...f, old_password: e.target.value }))} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" value={form.new_password} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} className={inputClass} required minLength={8} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} className={inputClass} required />
        </div>
        <button type="submit" disabled={saving} className="w-full bg-mindwell text-white font-semibold py-2.5 rounded-lg hover:bg-mindwell-dark transition disabled:opacity-50">
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
