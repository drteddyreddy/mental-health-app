import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EmployeeLookupPage from './EmployeeLookupPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const MOCK_RESULT = {
  employee: { name: 'Alice Johnson', department: 'Engineering', designation: 'Developer', code_short: 'A7X92K' },
  sessions: [
    { id: 1, campaign: 'Q1 2026', completed: true, completed_at: '2026-02-01T12:00:00Z', result_url: '/results/abc' },
    { id: 2, campaign: 'Q2 2026', completed: false, completed_at: null, result_url: '' },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EmployeeLookupPage />
    </MemoryRouter>
  )
}

describe('EmployeeLookupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search form', () => {
    renderPage()
    expect(screen.getByText('Look Up Employee')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter anonymous code/)).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('shows employee info on successful search', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULT })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/Enter anonymous code/), 'A7X92K')
    await user.click(screen.getByText('Search'))

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.getByText(/Engineering/)).toBeInTheDocument()
    expect(screen.getByText('A7X92K')).toBeInTheDocument()
  })

  it('shows error when employee not found', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/Enter anonymous code/), 'ZZZZZZ')
    await user.click(screen.getByText('Search'))

    await waitFor(() => {
      expect(screen.getByText('Employee not found with that code.')).toBeInTheDocument()
    })
  })

  it('shows screening history with completed links', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULT })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/Enter anonymous code/), 'A7X92K')
    await user.click(screen.getByText('Search'))

    await waitFor(() => {
      expect(screen.getByText('Screening History')).toBeInTheDocument()
    })
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('shows pending badge for incomplete sessions', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_RESULT })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/Enter anonymous code/), 'A7X92K')
    await user.click(screen.getByText('Search'))

    await waitFor(() => {
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    })
  })
})
