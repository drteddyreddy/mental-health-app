import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PsychiatristCompaniesPage from './PsychiatristCompaniesPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const MOCK_COMPANIES = [
  { id: 1, name: 'Acme Corp', tier: 'pro', is_active: true, total_employees: 50, total_campaigns: 3, total_sessions: 120, questionnaires_assigned: 5 },
  { id: 2, name: 'Globex Inc', tier: 'basic', is_active: false, total_employees: 20, total_campaigns: 1, total_sessions: 45, questionnaires_assigned: 2 },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <PsychiatristCompaniesPage />
    </MemoryRouter>
  )
}

describe('PsychiatristCompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_COMPANIES })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders company list', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('Globex Inc')).toBeInTheDocument()
  })

  it('shows active/inactive status', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows tier badges', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pro')).toBeInTheDocument()
    })
    expect(screen.getByText('basic')).toBeInTheDocument()
  })

  it('shows company stats', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No companies registered yet.')).toBeInTheDocument()
    })
  })

  it('links to company detail', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp').closest('a')).toHaveAttribute('href', '/psy/companies/1')
    })
  })
})
