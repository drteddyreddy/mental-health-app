import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import LoginPage from './LoginPage'

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
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
    mockToastError.mockReset()
  })

  it('renders login form', () => {
    renderPage()
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByText('Log In')).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid credentials' } },
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'bad')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong')
    await user.click(screen.getByText('Log In'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Invalid credentials')
    })
  })

  it('has link to register', () => {
    renderPage()
    expect(screen.getByText('Register')).toBeInTheDocument()
    expect(screen.getByText('Register').closest('a')).toHaveAttribute('href', '/register')
  })
})
