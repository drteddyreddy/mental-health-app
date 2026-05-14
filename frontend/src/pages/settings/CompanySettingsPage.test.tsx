import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CompanySettingsPage from './CompanySettingsPage'

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

const MOCK_COMPANY = { name: 'Acme Corp', industry: 'Technology', tier: 'pro' }

function renderPage() {
  return render(
    <MemoryRouter>
      <CompanySettingsPage />
    </MemoryRouter>
  )
}

describe('CompanySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_COMPANY })
  })

  it('shows loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders company settings form', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Company Settings')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Technology')).toBeInTheDocument()
    expect(screen.getByText('Pro — Screening + Recommendations')).toBeInTheDocument()
  })

  it('saves company settings', async () => {
    mockPut.mockResolvedValueOnce({ data: {} })
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.clear(screen.getByDisplayValue('Acme Corp'))
    await user.type(screen.getByDisplayValue(''), 'New Corp')
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/company/', expect.objectContaining({ name: 'New Corp' }))
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Company profile updated!')
  })

  it('shows error on save failure', async () => {
    mockPut.mockRejectedValueOnce(new Error('fail'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to save')
    })
  })

  it('shows basic tier plan', async () => {
    mockGet.mockResolvedValueOnce({ data: { name: 'Acme', industry: '', tier: 'basic' } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Basic — Screening Only')).toBeInTheDocument()
    })
  })
})
