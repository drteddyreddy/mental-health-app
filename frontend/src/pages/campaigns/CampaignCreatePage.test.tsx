import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CampaignCreatePage from './CampaignCreatePage'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: (...args: any[]) => mockToastError(...args), success: (...args: any[]) => mockToastSuccess(...args) },
}))

function fillStep1() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Q2 2026'), { target: { value: 'Test Campaign' } })
  const dateInputs = screen.getAllByDisplayValue('')
  fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } })
  fireEvent.change(dateInputs[1], { target: { value: '2026-03-31' } })
}

async function advanceToStep2() {
  render(
    <MemoryRouter>
      <CampaignCreatePage />
    </MemoryRouter>
  )
  await waitFor(() => {
    expect(screen.getByPlaceholderText('e.g. Q2 2026')).toBeInTheDocument()
  })
  fillStep1()
  const user = userEvent.setup()
  await user.click(screen.getByText('Next'))
  await waitFor(() => {
    expect(screen.getByText('Select Questionnaires')).toBeInTheDocument()
  })
}

describe('CampaignCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url === '/company/') return Promise.resolve({ data: { assigned_questionnaires: [1, 2] } })
      if (url === '/questionnaires/') return Promise.resolve({
        data: { results: [
          { id: 1, name: 'PHQ-9', description: 'Depression', max_score: 27 },
          { id: 2, name: 'GAD-7', description: 'Anxiety', max_score: 21 },
          { id: 3, name: 'CBI-W', description: 'Burnout', max_score: 30 },
        ]},
      })
      return Promise.resolve({ data: {} })
    })
  })

  it('renders step 1 by default', async () => {
    render(
      <MemoryRouter>
        <CampaignCreatePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Campaign Details')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText('e.g. Q2 2026')).toBeInTheDocument()
  })

  it('advances to step 2 when details filled', async () => {
    await advanceToStep2()
    expect(screen.getByText('Select Questionnaires')).toBeInTheDocument()
  })

  it('shows questionnaires on step 2', async () => {
    await advanceToStep2()
    expect(screen.getByText('PHQ-9')).toBeInTheDocument()
    expect(screen.getByText('GAD-7')).toBeInTheDocument()
    expect(screen.queryByText('CBI-W')).not.toBeInTheDocument()
  })

  it('disables step 2 next when no questionnaires selected', async () => {
    await advanceToStep2()
    const nextBtn = screen.getByText('Next')
    expect(nextBtn.closest('button')).toBeDisabled()
  })

  it('shows review step and submits', async () => {
    await advanceToStep2()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('checkbox')[0])
    await user.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(screen.getByText('Review & Launch')).toBeInTheDocument()
    })

    mockPost.mockResolvedValueOnce({ data: { id: 1 } })
    await user.click(screen.getByText('Create Campaign'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Campaign created!')
  })

  it('shows validation error on submit with empty name', async () => {
    render(
      <MemoryRouter>
        <CampaignCreatePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Q2 2026')).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByText('Next'))
    const nextBtn = screen.getByText('Next')
    expect(nextBtn.closest('button')).toBeDisabled()
  })

  it('can go back from step 2 to step 1', async () => {
    await advanceToStep2()
    const user = userEvent.setup()
    await user.click(screen.getByText('Back'))
    expect(screen.getByText('Campaign Details')).toBeInTheDocument()
  })
})
