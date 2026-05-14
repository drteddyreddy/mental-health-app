import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineHeart, HiOutlineCheckCircle } from 'react-icons/hi2'

interface Question {
  id: number
  text: string
  order: number
  max_score: number
}

interface QuestionnaireData {
  name: string
  description: string
  questions: Question[]
}

export default function ScreeningPage() {
  const { linkId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<{ campaign: string; employee_code: string; questionnaires: QuestionnaireData[] } | null>(null)
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/screening/${linkId}/`).then(({ data }) => {
      setData(data)
      const initial: Record<number, number> = {}
      data.questionnaires.forEach((q: QuestionnaireData) =>
        q.questions.forEach((qs) => { initial[qs.id] = qs.max_score > 5 ? -1 : 0 })
      )
      setResponses(initial)
    }).catch(() => setError('This screening link is invalid or already completed.')).finally(() => setLoading(false))
  }, [linkId])

  const setScore = (qId: number, score: number) => {
    setResponses((prev) => ({ ...prev, [qId]: score }))
  }

  const isTextInput = (max_score: number) => max_score > 5

  const handleSubmit = async () => {
    const unanswered = Object.entries(responses).filter(([, score]) => score < 0)
    if (unanswered.length > 0) {
      toast.error('Please answer all questions before submitting.')
      return
    }
    const all = Object.entries(responses).map(([question, score]) => ({
      question: Number(question),
      score,
    }))
    if (all.length === 0) return
    setSubmitting(true)
    try {
      await api.post(`/screening/${linkId}/`, { responses: all })
      toast.success('Responses submitted!')
      navigate(`/results/${linkId}`)
    } catch {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-mindwell-dark to-mindwell flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center">
        <HiOutlineHeart className="text-5xl text-mindwell mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Screening Unavailable</h1>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  )
  if (!data) return null

  const radioColor = (val: number, max: number) => {
    if (max === 0) return 'bg-gray-400'
    const pct = val / max
    if (pct === 0) return 'bg-gray-300'
    if (pct <= 0.33) return 'bg-green-500'
    if (pct <= 0.66) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mindwell-dark to-mindwell py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center text-white">
          <HiOutlineHeart className="text-4xl mx-auto mb-2" />
          <h1 className="text-2xl font-bold">MindWell Screening</h1>
          <p className="text-white/70 text-sm mt-1">{data.campaign}</p>
          <p className="text-white/50 text-xs mt-1">Code: {data.employee_code}</p>
        </div>

        {data.questionnaires.map((q) => (
          <div key={q.name} className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold text-lg mb-1">{q.name}</h2>
            {q.description && <p className="text-sm text-gray-500 mb-4">{q.description}</p>}
            <div className="space-y-5">
              {q.questions.map((qs) => (
                <div key={qs.id}>
                  <p className="text-sm font-medium mb-2">{qs.order}. {qs.text}</p>
                  {isTextInput(qs.max_score) ? (
                    <input
                      type="number"
                      min={0}
                      max={qs.max_score}
                      value={responses[qs.id] >= 0 ? responses[qs.id] : ''}
                      onChange={(e) => setScore(qs.id, Math.min(qs.max_score, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell"
                      placeholder={`0–${qs.max_score}`}
                    />
                  ) : (
                    <div className="flex items-center gap-2 sm:gap-3">
                      {Array.from({ length: qs.max_score + 1 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setScore(qs.id, i)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-bold transition border-2 ${
                            responses[qs.id] === i
                              ? `${radioColor(i, qs.max_score)} text-white border-transparent scale-110 shadow-md`
                              : 'bg-white text-gray-500 border-gray-300 hover:border-mindwell hover:text-mindwell'
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-white text-mindwell-dark font-bold px-8 py-3 rounded-xl text-lg hover:bg-gray-100 transition disabled:opacity-50 shadow-lg inline-flex items-center gap-2"
          >
            <HiOutlineCheckCircle className="text-xl" />
            {submitting ? 'Submitting...' : 'Submit Responses'}
          </button>
        </div>
      </div>
    </div>
  )
}
