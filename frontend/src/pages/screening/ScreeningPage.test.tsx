import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ScreeningPage from './ScreeningPage'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}))

const MOCK_SCREENING = {
  campaign: 'Q1 2026',
  employee_code: 'A7X92K',
  questionnaires: [
    {
      name: 'PHQ-9',
      description: 'Depression screening',
      questions: [
        { id: 1, text: 'Little interest?', order: 1, max_score: 3 },
        { id: 2, text: 'Feeling down?', order: 2, max_score: 3 },
      ],
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/screening/abc-123']}>
      <Routes>
        <Route path="/screening/:linkId" element={<ScreeningPage />} />
        <Route path="/results/:linkId" element={<div>Results page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ScreeningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error for invalid link', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Screening Unavailable')).toBeInTheDocument()
    })
  })

  it('renders questionnaires and questions', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_SCREENING })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })
    expect(screen.getByText('Code: A7X92K')).toBeInTheDocument()
    expect(screen.getByText('1. Little interest?')).toBeInTheDocument()
    expect(screen.getByText('2. Feeling down?')).toBeInTheDocument()
  })

  it('submits responses and navigates to results', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_SCREENING })
    mockPost.mockResolvedValueOnce({ data: {} })
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('PHQ-9')).toBeInTheDocument())

    const q1 = screen.getByText('1. Little interest?').closest('div')!
    const q2 = screen.getByText('2. Feeling down?').closest('div')!

    await user.click(within(q1).getByText('2'))
    await user.click(within(q2).getByText('1'))

    await user.click(screen.getByText('Submit Responses'))
    await waitFor(() => {
      expect(screen.getByText('Results page')).toBeInTheDocument()
    })
    expect(mockPost).toHaveBeenCalledWith('/screening/abc-123/', {
      responses: [
        { question: 1, score: 2 },
        { question: 2, score: 1 },
      ],
    })
  })
})
