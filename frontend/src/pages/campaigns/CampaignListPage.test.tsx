import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CampaignListPage from './CampaignListPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const MOCK_CAMPAIGNS = {
  results: [
    { id: 1, name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', is_active: true, total_sessions: 10, completed_sessions: 5, questionnaires: [{ name: 'PHQ-9' }, { name: 'GAD-7' }] },
    { id: 2, name: 'Q2 2026', start_date: '2026-04-01', end_date: '2026-06-30', is_active: false, total_sessions: 0, completed_sessions: 0, questionnaires: [{ name: 'PHQ-9' }] },
  ],
}

async function renderPage() {
  const page = render(
    <MemoryRouter>
      <CampaignListPage />
    </MemoryRouter>
  )
  await waitFor(() => expect(mockGet).toHaveBeenCalled())
  return page
}

describe('CampaignListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_CAMPAIGNS })
  })

  it('renders campaign list', async () => {
    await renderPage()
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
  })

  it('shows active/inactive badges', async () => {
    await renderPage()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows questionnaire badges', async () => {
    await renderPage()
    expect(screen.getAllByText('PHQ-9').length).toBeGreaterThan(0)
    expect(screen.getByText('GAD-7')).toBeInTheDocument()
  })

  it('shows completion counts', async () => {
    await renderPage()
    expect(screen.getByText('5/10 completed')).toBeInTheDocument()
  })

  it('filters campaigns by search', async () => {
    await renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Search campaigns...'), 'Q2')
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.queryByText('Q1 2026')).not.toBeInTheDocument()
  })

  it('shows empty state when no campaigns', async () => {
    mockGet.mockResolvedValueOnce({ data: { results: [] } })
    await renderPage()
    expect(screen.getByText('No campaigns yet.')).toBeInTheDocument()
  })

  it('has link to create campaign', async () => {
    await renderPage()
    const newLink = screen.getByText('New Campaign')
    expect(newLink.closest('a')).toHaveAttribute('href', '/campaigns/new')
  })

  it('links to campaign detail', async () => {
    await renderPage()
    const q1Link = screen.getByText('Q1 2026').closest('a')
    expect(q1Link).toHaveAttribute('href', '/campaigns/1')
  })
})
