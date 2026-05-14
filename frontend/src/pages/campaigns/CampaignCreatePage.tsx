import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'

interface Questionnaire {
  id: number
  name: string
  description: string
  max_score: number
}

export default function CampaignCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loadingQs, setLoadingQs] = useState(true)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', questionnaire_ids: [] as number[], is_active: true })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [companyRes, qsRes] = await Promise.all([
          api.get('/company/'),
          api.get('/questionnaires/'),
        ])
        if (cancelled) return
        const assignedIds: number[] = companyRes.data.assigned_questionnaires ?? []
        const allQs: Questionnaire[] = qsRes.data.results ?? qsRes.data
        setQuestionnaires(allQs.filter((q) => assignedIds.includes(q.id)))
      } catch {
        if (!cancelled) setQuestionnaires([])
      } finally {
        if (!cancelled) setLoadingQs(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }))

  const toggleQ = (id: number) => {
    setForm((prev) => ({
      ...prev,
      questionnaire_ids: prev.questionnaire_ids.includes(id)
        ? prev.questionnaire_ids.filter((i) => i !== id)
        : [...prev.questionnaire_ids, id],
    }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.start_date || !form.end_date || form.questionnaire_ids.length === 0) {
      toast.error('Please fill in all fields and select at least one questionnaire.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/campaigns/', form)
      toast.success('Campaign created!')
      navigate(`/campaigns/${data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-mindwell text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
            <span className={`text-sm ${step >= s ? 'text-mindwell font-medium' : 'text-gray-400'} hidden sm:inline`}>
              {s === 1 ? 'Details' : s === 2 ? 'Questionnaires' : 'Review'}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-mindwell' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Campaign Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="e.g. Q2 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} className={inputClass} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="rounded border-gray-300 text-mindwell focus:ring-mindwell" />
              Active immediately
            </label>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)} disabled={!form.name || !form.start_date || !form.end_date} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Select Questionnaires</h2>
            {loadingQs ? (
              <p className="text-gray-400 text-sm">Loading questionnaires...</p>
            ) : questionnaires.length === 0 ? (
              <p className="text-gray-400 text-sm">No questionnaires assigned to your company yet. Contact your psychiatrist to configure them.</p>
            ) : (
              <div className="grid gap-3">
                {questionnaires.map((q) => (
                  <label key={q.id} className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition ${form.questionnaire_ids.includes(q.id) ? 'border-mindwell bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.questionnaire_ids.includes(q.id)} onChange={() => toggleQ(q.id)} className="mt-0.5 rounded border-gray-300 text-mindwell focus:ring-mindwell" />
                    <div>
                      <p className="font-medium text-sm">{q.name}</p>
                      <p className="text-xs text-gray-500">{q.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Back</button>
              <button onClick={() => setStep(3)} disabled={form.questionnaire_ids.length === 0} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Review & Launch</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {form.name}</div>
              <div><span className="font-medium">Period:</span> {form.start_date} to {form.end_date}</div>
              <div><span className="font-medium">Status:</span> {form.is_active ? 'Active' : 'Inactive'}</div>
              <div>
                <span className="font-medium">Questionnaires:</span>{' '}
                {questionnaires.filter((q) => form.questionnaire_ids.includes(q.id)).map((q) => q.name).join(', ') || 'None'}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="bg-mindwell text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
