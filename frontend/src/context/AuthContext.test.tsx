import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import type { ReactNode } from 'react'

const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('../api/client', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
  },
}))

const TOKEN_PAYLOAD = { user_id: 1, username: 'testuser' }
function encodeToken(payload: object): string {
  const b64 = btoa(JSON.stringify(payload))
  return `header.${b64}.signature`
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
  })

  it('starts with no user and not loading after init', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toBeNull()
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('restores user from stored token', async () => {
    localStorage.setItem('access_token', encodeToken(TOKEN_PAYLOAD))
    mockGet.mockResolvedValueOnce({ data: { role: 'hr', email: 'a@b.com' } })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.user).toEqual({
      id: 1, username: 'testuser', email: 'a@b.com', role: 'hr',
    })
  })

  it('login sets user and returns role', async () => {
    mockPost.mockResolvedValueOnce({
      data: { access: encodeToken(TOKEN_PAYLOAD), refresh: 'refresh-token' },
    })
    mockGet.mockResolvedValueOnce({ data: { role: 'psychiatrist', email: 'doc@b.com' } })

    const { result } = renderHook(() => useAuth(), { wrapper })
    let role: string | undefined
    await act(async () => {
      role = await result.current.login('testuser', 'pass')
    })
    expect(role).toBe('psychiatrist')
    expect(result.current.user?.username).toBe('testuser')
    expect(result.current.isPsychiatrist).toBe(true)
    expect(localStorage.getItem('access_token')).toBeTruthy()
  })

  it('register sets user', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        access: encodeToken(TOKEN_PAYLOAD),
        refresh: 'refresh-token',
        user: { id: 1, username: 'testuser', email: 'a@b.com', role: 'hr' },
      },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register({
        username: 'testuser', email: 'a@b.com',
        password: 'pass', company_name: 'Acme',
      })
    })
    expect(result.current.user?.username).toBe('testuser')
    expect(result.current.isPsychiatrist).toBe(false)
  })

  it('logout clears user and tokens', async () => {
    localStorage.setItem('access_token', encodeToken(TOKEN_PAYLOAD))
    mockGet.mockResolvedValueOnce({ data: { role: 'hr', email: 'a@b.com' } })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    act(() => result.current.logout())
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('throws when useAuth used outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
  })
})
