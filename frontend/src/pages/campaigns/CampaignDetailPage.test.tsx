import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CampaignDetailPage from './CampaignDetailPage'

const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: (...args: any[]) => mockToastError(...args), success: (...args: any[]) => mockToastSuccess(...args) },
}))

const MOCK_CAMPAIGN = { id: 1, name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', is_active: true }
const MOCK_SESSIONS = {
  total: 3, completed: 1, completion_rate: 33,
  sessions: [
    { id: 1, employee_code: 'A7X92K', employee_department: 'Eng', is_completed: true, unique_link: 'http://localhost/screening/abc', completed_at: '2026-02-01T12:00:00Z' },
    { id: 2, employee_code: 'B3X91L', employee_department: 'Sales', is_completed: false, unique_link: 'http://localhost/screening/def', completed_at: null },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/campaigns/1']}>
      <Routes>
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/campaigns" element={<div>Campaigns list</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CampaignDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url === '/campaigns/1/') return Promise.resolve({ data: MOCK_CAMPAIGN })
      if (url === '/campaigns/1/sessions/') return Promise.resolve({ data: MOCK_SESSIONS })
      return Promise.resolve({ data: {} })
    })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders campaign details', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Q1 2026')).toBeInTheDocument()
    })
    expect(screen.getByText('2026-01-01 – 2026-03-31')).toBeInTheDocument()
  })

  it('renders session stats', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('renders session table with codes and status', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('A7X92K')).toBeInTheDocument()
    })
    expect(screen.getByText('B3X91L')).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('shows edit form when edit clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Campaign')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Q1 2026')).toBeInTheDocument()
  })

  it('saves edited campaign', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...MOCK_CAMPAIGN, name: 'Updated' } })
    renderPage()
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByDisplayValue('Q1 2026'))
    await user.type(screen.getByDisplayValue(''), 'Updated Campaign')
    await user.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/campaigns/1/', expect.any(Object))
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Campaign updated!')
  })

  it('shows delete confirmation', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByText('Delete Campaign'))
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
  })

  it('deletes campaign on confirm', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} })
    renderPage()
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByText('Delete Campaign'))
    await user.click(screen.getByText('Delete'))
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/campaigns/1/')
    })
  })

  it('shows copy buttons with correct aria labels', async () => {
    renderPage()
    await waitFor(() => {
      const copyBtns = screen.getAllByRole('button', { name: /Copy link/ })
      expect(copyBtns.length).toBeGreaterThan(0)
    })
  })

  it('shows error when campaign load fails', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to load campaign')
    })
  })
})
