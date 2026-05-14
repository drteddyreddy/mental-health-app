import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineArrowLeft, HiOutlineChartBarSquare, HiOutlineCog6Tooth } from 'react-icons/hi2'

interface Questionnaire {
  id: number
  name: string
  description: string
  questions: { id: number; text: string; order: number }[]
}

interface GradingConfig {
  rules: {
    grade_boundaries?: Record<string, number>
    composite_formula?: string
    scale_weights?: Record<string, number>
  }
}

export default function PsychiatristCompanyDetailPage() {
  const { id } = useParams()
  const [company, setCompany] = useState<any>(null)
  const [allQuestionnaires, setAllQuestionnaires] = useState<Questionnaire[]>([])
  const [assignedIds, setAssignedIds] = useState<number[]>([])
  const [gradingConfig, setGradingConfig] = useState<GradingConfig | null>(null)
  const [tab, setTab] = useState<'scales' | 'grading'>('scales')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [companyRes, qRes] = await Promise.all([
          api.get(`/psy/companies/${id}/`),
          api.get('/psy/questionnaires/'),
        ])
        setCompany(companyRes.data)
        setAllQuestionnaires(qRes.data)
        setAssignedIds(
          companyRes.data.assigned_questionnaires_data?.map((q: any) => q.id) || []
        )
        if (companyRes.data.grading_config) {
          setGradingConfig(companyRes.data.grading_config)
        }
      } catch { toast.error('Failed to load company') }
    }
    load()
  }, [id])

  const toggleQuestionnaire = (qId: number) => {
    setAssignedIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    )
  }

  const saveAssignments = async () => {
    setSaving(true)
    try {
      await api.put(`/psy/companies/${id}/`, {
        assigned_questionnaire_ids: assignedIds,
      })
      toast.success('Scales updated!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const saveGrading = async () => {
    setSaving(true)
    try {
      await api.put(`/psy/companies/${id}/grading/`, {
        rules: gradingConfig?.rules || {},
      })
      toast.success('Grading rules saved!')
    } catch { toast.error('Failed to save grading') }
    finally { setSaving(false) }
  }

  if (!company) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/psy/companies" className="text-gray-400 hover:text-gray-600"><HiOutlineArrowLeft className="text-xl" /></Link>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-sm text-gray-500">{company.industry} &middot; {company.tier} plan</p>
          </div>
        </div>
        <Link to={`/psy/companies/${id}/analytics`} className="flex items-center gap-1.5 bg-mindwell text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition">
          <HiOutlineChartBarSquare className="text-base" /> Analytics
        </Link>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('scales')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'scales' ? 'border-mindwell text-mindwell' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <HiOutlineCog6Tooth className="inline mr-1" /> Scales
        </button>
        <button onClick={() => setTab('grading')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'grading' ? 'border-mindwell text-mindwell' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <HiOutlineChartBarSquare className="inline mr-1" /> Grading
        </button>
      </div>

      {tab === 'scales' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select which questionnaires this company can use in their campaigns.</p>
          <div className="grid gap-3">
            {allQuestionnaires.map((q) => {
              const isAssigned = assignedIds.includes(q.id)
              return (
                <label key={q.id} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition ${isAssigned ? 'border-mindwell bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={isAssigned} onChange={() => toggleQuestionnaire(q.id)} className="mt-0.5 rounded border-gray-300 text-mindwell focus:ring-mindwell" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{q.name}</p>
                      <span className="text-xs text-gray-400">{q.questions?.length || 0} questions</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
          <button onClick={saveAssignments} disabled={saving} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Scale Assignments'}
          </button>
        </div>
      )}

      {tab === 'grading' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Configure grade boundaries for this company. Scores below each threshold get that grade.</p>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-3">Grade Boundaries</h3>
            {['A', 'B', 'C', 'D', 'F'].map((grade) => {
              const val = gradingConfig?.rules?.grade_boundaries?.[grade] ?? { A: 6, B: 12, C: 18, D: 24, F: 999 }[grade]
              return (
                <div key={grade} className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-mindwell">{grade}</span>
                  <span className="text-sm">Score ≤</span>
                  <input type="number" value={val} onChange={(e) => setGradingConfig((prev) => ({
                    ...prev,
                    rules: { ...prev?.rules, grade_boundaries: { ...prev?.rules?.grade_boundaries, [grade]: Number(e.target.value) } },
                  } as any))} className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
                </div>
              )
            })}
          </div>
          <button onClick={saveGrading} disabled={saving} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Grading Rules'}
          </button>
        </div>
      )}
    </div>
  )
}
