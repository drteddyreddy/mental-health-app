import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PsychiatristQuestionnairesPage from './PsychiatristQuestionnairesPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const MOCK_QUESTIONNAIRES = [
  {
    id: 1, name: 'PHQ-9', description: 'Depression screening', scoring_type: 'sum', max_score: 27,
    questions: [
      { id: 1, text: 'Little interest or pleasure in doing things?', order: 1 },
      { id: 2, text: 'Feeling down, depressed, or hopeless?', order: 2 },
    ],
  },
  {
    id: 2, name: 'GAD-7', description: 'Anxiety screening', scoring_type: 'sum', max_score: 21,
    questions: [
      { id: 3, text: 'Feeling nervous, anxious, or on edge?', order: 1 },
    ],
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <PsychiatristQuestionnairesPage />
    </MemoryRouter>
  )
}

describe('PsychiatristQuestionnairesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_QUESTIONNAIRES })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders questionnaire list', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('All Questionnaires')).toBeInTheDocument()
    })
    expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    expect(screen.getByText('GAD-7')).toBeInTheDocument()
  })

  it('shows questionnaire descriptions', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Depression screening')).toBeInTheDocument()
    })
    expect(screen.getByText('Anxiety screening')).toBeInTheDocument()
  })

  it('shows question count and max score', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('2 questions')).toBeInTheDocument()
    })
    expect(screen.getByText('max 27')).toBeInTheDocument()
  })

  it('shows scoring type badges', async () => {
    renderPage()
    await waitFor(() => {
      const badges = screen.getAllByText('sum')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  it('expands questionnaire to show questions', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('PHQ-9'))

    await waitFor(() => {
      expect(screen.getByText('Little interest or pleasure in doing things?')).toBeInTheDocument()
    })
    expect(screen.getByText('Feeling down, depressed, or hopeless?')).toBeInTheDocument()
  })

  it('collapses questionnaire on second click', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('PHQ-9'))

    await waitFor(() => {
      expect(screen.getByText('Little interest or pleasure in doing things?')).toBeInTheDocument()
    })

    await user.click(screen.getByText('PHQ-9'))

    expect(screen.queryByText('Little interest or pleasure in doing things?')).not.toBeInTheDocument()
  })

  it('replaces expanded questionnaire when clicking another', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('PHQ-9'))

    await waitFor(() => {
      expect(screen.getByText('Little interest or pleasure in doing things?')).toBeInTheDocument()
    })

    await user.click(screen.getByText('GAD-7'))

    expect(screen.queryByText('Little interest or pleasure in doing things?')).not.toBeInTheDocument()
    expect(screen.getByText('Feeling nervous, anxious, or on edge?')).toBeInTheDocument()
  })
})
