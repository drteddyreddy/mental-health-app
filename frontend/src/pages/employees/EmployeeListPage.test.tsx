import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EmployeeListPage from './EmployeeListPage'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const MOCK_EMPLOYEES = {
  count: 3,
  results: [
    { id: 1, name: 'Alice', department: 'Eng', designation: 'Dev', code_short: 'A7X92K', is_active: true },
    { id: 2, name: 'Bob', department: 'Sales', designation: 'Rep', code_short: 'B3X91L', is_active: true },
    { id: 3, name: 'Charlie', department: 'Eng', designation: 'Lead', code_short: 'C9Y81M', is_active: false },
  ],
}

async function loadPage() {
  const page = render(
    <MemoryRouter>
      <EmployeeListPage />
    </MemoryRouter>
  )
  await waitFor(() => expect(mockGet).toHaveBeenCalled())
  return page
}

describe('EmployeeListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: MOCK_EMPLOYEES })
  })

  it('renders employee list', async () => {
    await loadPage()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows search input', async () => {
    await loadPage()
    expect(screen.getByPlaceholderText('Search by name, department, or code...')).toBeInTheDocument()
  })

  it('shows inactive toggle', async () => {
    await loadPage()
    expect(screen.getByText('Show inactive')).toBeInTheDocument()
  })

  it('shows status badges', async () => {
    await loadPage()
    const badges = screen.getAllByText(/Active|Inactive/)
    expect(badges).toHaveLength(3)
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('calls include_inactive when toggled on', async () => {
    await loadPage()
    const user = userEvent.setup()
    await user.click(screen.getByText('Show inactive'))
    await waitFor(() => {
      expect(mockGet).toHaveBeenLastCalledWith(
        expect.stringContaining('include_inactive=true')
      )
    })
  })

  it('opens deactivate dialog for active employee', async () => {
    await loadPage()
    const user = userEvent.setup()
    const deactivateBtns = screen.getAllByLabelText(/Deactivate/)
    await user.click(deactivateBtns[0])
    expect(screen.getByText('Deactivate Employee')).toBeInTheDocument()
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0)
  })

  it('deactivates employee on confirm', async () => {
    mockPatch.mockResolvedValue({ data: {} })
    await loadPage()
    const user = userEvent.setup()
    const deactivateBtns = screen.getAllByLabelText(/Deactivate/)
    await user.click(deactivateBtns[0])
    await user.click(screen.getByText('Deactivate'))
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/employees/1/', { is_active: false })
    })
  })
})
