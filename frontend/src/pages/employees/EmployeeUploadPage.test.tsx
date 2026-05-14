import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EmployeeUploadPage from './EmployeeUploadPage'

const mockPost = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: (...args: any[]) => mockToastError(...args), success: (...args: any[]) => mockToastSuccess(...args) },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <EmployeeUploadPage />
    </MemoryRouter>
  )
}

function createCsvFile(content: string): File {
  return new File([content], 'employees.csv', { type: 'text/csv' })
}

function uploadFile(file: File) {
  const input = document.querySelector('input[type="file"]')!
  fireEvent.change(input, { target: { files: [file] } })
}

describe('EmployeeUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload page', () => {
    renderPage()
    expect(screen.getByText('Upload Employees')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop a CSV file/)).toBeInTheDocument()
  })

  it('shows sample CSV format initially', () => {
    renderPage()
    expect(screen.getByText('Sample CSV format:')).toBeInTheDocument()
    expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument()
  })

  it('shows preview after file upload', async () => {
    renderPage()
    const file = createCsvFile('name,department,designation\nAlice,Engineering,Developer\nBob,Sales,Manager')
    uploadFile(file)

    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument()
    })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows import complete screen after successful upload', async () => {
    mockPost.mockResolvedValueOnce({ data: { imported: 2, errors: [] } })
    renderPage()

    const file = createCsvFile('name,department,designation\nAlice,Engineering,Developer\nBob,Sales,Manager')
    uploadFile(file)

    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Import 2 Employees'))

    await waitFor(() => {
      expect(screen.getByText('Import Complete')).toBeInTheDocument()
    })
    expect(screen.getByText('2 employees imported successfully.')).toBeInTheDocument()
    expect(screen.getByText('Upload More')).toBeInTheDocument()
    expect(screen.getByText('View Employees')).toBeInTheDocument()
  })

  it('shows upload error', async () => {
    mockPost.mockRejectedValueOnce(new Error('fail'))
    renderPage()

    const file = createCsvFile('name,department,designation\nAlice,Engineering,Developer')
    uploadFile(file)

    await waitFor(() => {
      expect(screen.getByText('Preview (1 rows)')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Import 1 Employees'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Upload failed')
    })
  })

  it('shows errors from import result', async () => {
    mockPost.mockResolvedValueOnce({ data: { imported: 1, errors: ['Row 2: duplicate name'] } })
    renderPage()

    const file = createCsvFile('name,department,designation\nAlice,Engineering,Developer\nAlice,Sales,Manager')
    uploadFile(file)

    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Import 2 Employees'))

    await waitFor(() => {
      expect(screen.getByText('Row 2: duplicate name')).toBeInTheDocument()
    })
  })

  it('resets to upload more', async () => {
    mockPost.mockResolvedValueOnce({ data: { imported: 1, errors: [] } })
    renderPage()

    const file = createCsvFile('name,department,designation\nAlice,Engineering,Developer')
    uploadFile(file)

    await waitFor(() => {
      expect(screen.getByText('Preview (1 rows)')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Import 1 Employees'))

    await waitFor(() => {
      expect(screen.getByText('Upload More')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Upload More'))
    expect(screen.getByText(/Drag & drop a CSV file/)).toBeInTheDocument()
  })
})
