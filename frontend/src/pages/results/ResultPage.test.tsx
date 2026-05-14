import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ResultPage from './ResultPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const MOCK_RESULTS_PRO = {
  campaign: 'Q1 2026',
  employee_code: 'A7X92K',
  completed_at: '2026-05-14T12:00:00Z',
  is_pro: true,
  overall_score: 5,
  results: [
    {
      questionnaire_name: 'PHQ-9',
      score: 5,
      max_score: 27,
      severity: 'Mild',
      recommendations: ['Monitor symptoms', 'Consider therapy'],
    },
  ],
}

const MOCK_RESULTS_BASIC = {
  ...MOCK_RESULTS_PRO,
  is_pro: false,
  results: [{
    ...MOCK_RESULTS_PRO.results[0],
    recommendations: [],
  }],
}

function renderPage(linkId = 'abc-123') {
  return render(
    <MemoryRouter initialEntries={[`/results/${linkId}`]}>
      <Routes>
        <Route path="/results/:linkId" element={<ResultPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error when results not found', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No Results Yet')).toBeInTheDocument()
    })
  })

  it('renders results for basic tier', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULTS_BASIC })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Your Results')).toBeInTheDocument()
    })
    expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    expect(screen.getByText('5/27')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.queryByText('Recommendations')).not.toBeInTheDocument()
  })

  it('renders recommendations for pro tier', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULTS_PRO })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Your Results')).toBeInTheDocument()
    })
    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Consider therapy')).toBeInTheDocument()
  })

  it('shows severity badge', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULTS_PRO })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Mild')).toBeInTheDocument()
    })
  })
})
