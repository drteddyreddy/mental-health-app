import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PsychiatristCompanyDetailPage from './PsychiatristCompanyDetailPage'

const mockGet = vi.fn()
const mockPut = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: (...args: any[]) => mockToastError(...args), success: (...args: any[]) => mockToastSuccess(...args) },
}))

const MOCK_COMPANY = {
  id: 1, name: 'Acme Corp', industry: 'Technology', tier: 'pro',
  assigned_questionnaires_data: [{ id: 1, name: 'PHQ-9' }],
  grading_config: { rules: { grade_boundaries: { A: 6, B: 12, C: 18, D: 24, F: 999 } } },
}

const MOCK_QUESTIONNAIRES = [
  { id: 1, name: 'PHQ-9', description: 'Depression', questions: [{ id: 1, text: 'Little interest?', order: 1 }] },
  { id: 2, name: 'GAD-7', description: 'Anxiety', questions: [{ id: 2, text: 'Feeling nervous?', order: 1 }] },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/psy/companies/1']}>
      <Routes>
        <Route path="/psy/companies/:id" element={<PsychiatristCompanyDetailPage />} />
        <Route path="/psy/companies" element={<div>Companies list</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PsychiatristCompanyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url === '/psy/companies/1/') return Promise.resolve({ data: MOCK_COMPANY })
      if (url === '/psy/questionnaires/') return Promise.resolve({ data: MOCK_QUESTIONNAIRES })
      return Promise.resolve({ data: {} })
    })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders company header', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText(/Technology/)).toBeInTheDocument()
    expect(screen.getByText(/pro plan/)).toBeInTheDocument()
  })

  it('shows scales tab by default', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })
    expect(screen.getByText('GAD-7')).toBeInTheDocument()
  })

  it('shows checked questionnaires as assigned', async () => {
    renderPage()
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })
  })

  it('saves scale assignments', async () => {
    mockPut.mockResolvedValueOnce({ data: {} })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Save Scale Assignments'))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/psy/companies/1/', {
        assigned_questionnaire_ids: [1],
      })
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Scales updated!')
  })

  it('switches to grading tab', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Scales')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Grading'))

    expect(screen.getByText('Grade Boundaries')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
    expect(screen.getByDisplayValue('18')).toBeInTheDocument()
    expect(screen.getByDisplayValue('24')).toBeInTheDocument()
  })

  it('saves grading rules', async () => {
    mockPut.mockResolvedValueOnce({ data: {} })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Scales')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Grading'))

    await waitFor(() => {
      expect(screen.getByText('Save Grading Rules')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Save Grading Rules'))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/psy/companies/1/grading/', expect.any(Object))
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Grading rules saved!')
  })

  it('has link to analytics', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
    expect(screen.getByText('Analytics').closest('a')).toHaveAttribute('href', '/psy/companies/1/analytics')
  })

  it('shows back link', async () => {
    renderPage()
    await waitFor(() => {
      expect(document.querySelector('[href="/psy/companies"]')).toBeInTheDocument()
    })
  })
})
