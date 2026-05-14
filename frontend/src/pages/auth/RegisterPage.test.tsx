import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import RegisterPage from './RegisterPage'

const mockPost = vi.fn()
const mockGet = vi.fn()
const mockToastError = vi.fn()

vi.mock('../../api/client', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: (...args: any[]) => mockToastError(...args) },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
    mockToastError.mockReset()
  })

  it('renders registration form', () => {
    renderPage()
    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your Company Inc.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('hr@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
  })

  it('shows error on failed registration', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Username already taken' } },
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Your Company Inc.'), 'Acme')
    await user.type(screen.getByPlaceholderText('Choose a username'), 'testuser')
    await user.type(screen.getByPlaceholderText('hr@company.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Min. 8 characters'), 'password123')
    await user.click(screen.getByText('Create Account'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Username already taken')
    })
  })

  it('has link to login', () => {
    renderPage()
    const loginLink = screen.getByText('Log in')
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  it('submits form successfully', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        access: 'header.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3R1c2VyIn0=.sig',
        refresh: 'refresh-token',
        user: { id: 1, username: 'testuser', email: 'a@b.com', role: 'hr' },
      },
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Your Company Inc.'), 'Acme')
    await user.type(screen.getByPlaceholderText('Choose a username'), 'testuser')
    await user.type(screen.getByPlaceholderText('hr@company.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Min. 8 characters'), 'password123')
    await user.click(screen.getByText('Create Account'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/register/', {
        company_name: 'Acme',
        username: 'testuser',
        email: 'a@b.com',
        password: 'password123',
        tier: 'basic',
      })
    })
  })
})
