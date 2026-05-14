import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/client'
import { HiOutlineHeart, HiOutlineLightBulb } from 'react-icons/hi2'

interface ResultEntry {
  questionnaire_name: string
  score: number
  max_score: number
  severity: string
  recommendations: string[]
}

interface ResultData {
  campaign: string
  employee_code: string
  completed_at: string
  is_pro: boolean
  results: ResultEntry[]
  overall_score: number
}

const severityClass = (sev: string) => {
  const map: Record<string, string> = {
    Minimal: 'severity-minimal',
    Mild: 'severity-mild',
    Moderate: 'severity-moderate',
    Severe: 'severity-severe',
    Low: 'severity-minimal',
    High: 'severity-moderate',
    Poor: 'severity-severe',
    Fair: 'severity-mild',
    Good: 'severity-minimal',
    Excellent: 'severity-minimal',
  }
  return map[sev] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function ResultPage() {
  const { linkId } = useParams()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/results/${linkId}/`).then(({ data }) => setData(data))
      .catch(() => setError('Results not found or screening not yet completed.'))
      .finally(() => setLoading(false))
  }, [linkId])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-mindwell-dark to-mindwell flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center">
        <HiOutlineHeart className="text-5xl text-mindwell mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">No Results Yet</h1>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  )
  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-mindwell-dark to-mindwell py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center text-white">
          <HiOutlineHeart className="text-4xl mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Your Results</h1>
          <p className="text-white/70 text-sm mt-1">{data.campaign}</p>
          <p className="text-white/50 text-xs mt-1">Code: {data.employee_code}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
          <p className="text-sm text-gray-500 mb-1">Overall Score</p>
          <p className="text-5xl font-bold text-mindwell">{data.overall_score}</p>
        </div>

        {data.results.map((r) => (
          <div key={r.questionnaire_name} className="bg-white rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{r.questionnaire_name}</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${severityClass(r.severity)}`}>
                {r.severity}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-mindwell transition-all"
                  style={{ width: `${r.max_score > 0 ? (r.score / r.max_score) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-mono text-gray-600">{r.score}/{r.max_score}</span>
            </div>

            {data.is_pro && r.recommendations.length > 0 && (
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-800 mb-2">
                  <HiOutlineLightBulb className="text-base" />
                  Recommendations
                </div>
                <ul className="space-y-1.5">
                  {r.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-teal-700 flex items-start gap-2">
                      <span className="text-teal-400 mt-0.5">&bull;</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <p className="text-center text-white/50 text-xs">
          Completed: {new Date(data.completed_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
