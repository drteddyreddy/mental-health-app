import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PsychiatristAnalyticsPage from './PsychiatristAnalyticsPage'

const mockGet = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div className="mock-responsive">{children}</div>,
  BarChart: ({ children }: any) => <div className="mock-bar-chart">{children}</div>,
  Bar: () => <div className="mock-bar" />,
  XAxis: () => <div className="mock-xaxis" />,
  YAxis: () => <div className="mock-yaxis" />,
  Tooltip: () => <div className="mock-tooltip" />,
  LineChart: ({ children }: any) => <div className="mock-line-chart">{children}</div>,
  Line: () => <div className="mock-line" />,
  CartesianGrid: () => <div className="mock-grid" />,
}))

const MOCK_ANALYTICS = {
  company_name: 'Acme Corp',
  total_employees: 50,
  total_campaigns: 3,
  total_sessions: 120,
  department_breakdown: [
    { department: 'Engineering', avg_score: 8.5, grade: 'B', session_count: 60 },
    { department: 'Sales', avg_score: 15.2, grade: 'C', session_count: 40 },
  ],
  campaign_trends: [
    { name: 'Q1 2026', avg_score: 10.2, grade: 'B', session_count: 50 },
  ],
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/psy/companies/${id}/analytics`]}>
      <Routes>
        <Route path="/psy/companies/:id/analytics" element={<PsychiatristAnalyticsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PsychiatristAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_ANALYTICS })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error when no data', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No data yet.')).toBeInTheDocument()
    })
  })

  it('renders analytics header', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Corp — Analytics')).toBeInTheDocument()
    })
  })

  it('renders summary stats', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders department grades table', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })
    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument()
    expect(screen.getByText('15.2')).toBeInTheDocument()
  })

  it('renders grade badges', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('B')).toBeInTheDocument()
    })
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('shows empty state for no department data', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ...MOCK_ANALYTICS, department_breakdown: [], campaign_trends: [] },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No department data available')).toBeInTheDocument()
    })
    expect(screen.getByText('No campaign data yet')).toBeInTheDocument()
  })

  it('shows back link', async () => {
    renderPage()
    await waitFor(() => {
      expect(document.querySelector('[href="/psy/companies"]')).toBeInTheDocument()
    })
  })
})
