import { useState, useEffect } from 'react'
import api from '../../api/client'

interface Question {
  id: number
  text: string
  order: number
  max_score: number
}

interface Questionnaire {
  id: number
  name: string
  description: string
  scoring_type: string
  max_score: number
  questions: Question[]
}

export default function PsychiatristQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    api.get('/psy/questionnaires/').then(({ data }) => setQuestionnaires(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Questionnaires</h1>
      <p className="text-sm text-gray-500">View all available screening questionnaires and their questions.</p>

      <div className="grid gap-4">
        {questionnaires.map((q) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left">
              <div>
                <h3 className="font-semibold">{q.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{q.questions?.length || 0} questions</span>
                <span>max {q.max_score}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.scoring_type === 'sum' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{q.scoring_type}</span>
              </div>
            </button>
            {expanded === q.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <ol className="space-y-1.5">
                  {q.questions?.map((question) => (
                    <li key={question.id} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-400 font-mono min-w-6">{question.order}.</span>
                      <span className="text-gray-700">{question.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
