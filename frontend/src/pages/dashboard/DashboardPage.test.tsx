import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'

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
  PieChart: ({ children }: any) => <div className="mock-pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div className="mock-pie">{children}</div>,
  Cell: () => <div className="mock-cell" />,
  LineChart: ({ children }: any) => <div className="mock-line-chart">{children}</div>,
  Line: () => <div className="mock-line" />,
  CartesianGrid: () => <div className="mock-grid" />,
}))

const MOCK_STATS = {
  total_employees: 50,
  total_campaigns: 3,
  total_sessions: 120,
  completion_rate: 72,
  department_breakdown: [
    { department: 'Engineering', emp_count: 25, session_count: 60, avg_score: 8.5 },
    { department: 'Sales', emp_count: 15, session_count: 40, avg_score: 12.3 },
  ],
  severity_distribution: { Minimal: 30, Mild: 10, Moderate: 5, Severe: 2 },
  campaign_trends: [
    { name: 'Q1', avg_score: 10.2, session_count: 50 },
    { name: 'Q2', avg_score: 8.5, session_count: 70 },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows error when no data', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard.')).toBeInTheDocument()
    })
  })

  it('renders stat cards', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('renders department breakdown', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Avg Score by Department')).toBeInTheDocument()
    })
  })

  it('renders severity distribution', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Severity Distribution')).toBeInTheDocument()
    })
  })

  it('renders campaign trends', async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_STATS })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Campaign Trends')).toBeInTheDocument()
    })
  })

  it('shows empty state for no department data', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ...MOCK_STATS, department_breakdown: [], severity_distribution: {}, campaign_trends: [] },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No department data')).toBeInTheDocument()
    })
    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.getByText('No campaigns yet')).toBeInTheDocument()
  })
})
