import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ChangePasswordPage from './ChangePasswordPage'

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

function getSubmitBtn() {
  return screen.getByRole('button', { name: 'Change Password' })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ChangePasswordPage />
    </MemoryRouter>
  )
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders change password form', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
    expect(screen.getByText('Current Password')).toBeInTheDocument()
    expect(screen.getByText('New Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument()
    expect(getSubmitBtn()).toBeInTheDocument()
  })

  it('validates password mismatch', async () => {
    const user = userEvent.setup()
    renderPage()

    const passwordInputs = screen.getAllByDisplayValue('')
    await user.type(passwordInputs[0], 'oldpass123')
    await user.type(passwordInputs[1], 'newpass123')
    await user.type(passwordInputs[2], 'different456')
    await user.click(getSubmitBtn())

    expect(mockToastError).toHaveBeenCalledWith('Passwords do not match')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('validates minimum password length', async () => {
    const user = userEvent.setup()
    renderPage()

    const passwordInputs = screen.getAllByDisplayValue('')
    await user.type(passwordInputs[0], 'oldpass123')
    await user.type(passwordInputs[1], 'short')
    await user.type(passwordInputs[2], 'short')
    await user.click(getSubmitBtn())

    expect(mockToastError).toHaveBeenCalledWith('Password must be at least 8 characters')
  })

  it('submits password change successfully', async () => {
    mockPost.mockResolvedValueOnce({ data: {} })
    const user = userEvent.setup()
    renderPage()

    const passwordInputs = screen.getAllByDisplayValue('')
    await user.type(passwordInputs[0], 'oldpass123')
    await user.type(passwordInputs[1], 'newpass123')
    await user.type(passwordInputs[2], 'newpass123')
    await user.click(getSubmitBtn())

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/change-password/', {
        old_password: 'oldpass123',
        new_password: 'newpass123',
      })
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Password changed!')
  })

  it('shows error on failure', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Wrong password' } },
    })
    const user = userEvent.setup()
    renderPage()

    const passwordInputs = screen.getAllByDisplayValue('')
    await user.type(passwordInputs[0], 'wrong')
    await user.type(passwordInputs[1], 'newpass123')
    await user.type(passwordInputs[2], 'newpass123')
    await user.click(getSubmitBtn())

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Wrong password')
    })
  })
})
