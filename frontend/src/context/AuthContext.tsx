import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import api from '../api/client'

interface User {
  id: number
  username: string
  email: string
  role: 'hr' | 'psychiatrist'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<string | undefined>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isPsychiatrist: boolean
}

export interface RegisterData {
  username: string
  email: string
  password: string
  company_name: string
  tier?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

function decodeToken(token: string): { user_id: number; username: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

async function fetchProfile(): Promise<{ role: string; email: string }> {
  try {
    const { data } = await api.get('/auth/me/')
    return { role: data.role, email: data.email }
  } catch {
    return { role: 'hr', email: '' }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      const payload = decodeToken(token)
      if (payload) {
        fetchProfile().then((profile) => {
          setUser({
            id: payload.user_id,
            username: payload.username,
            email: profile.email,
            role: profile.role as 'hr' | 'psychiatrist',
          })
        })
      }
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const payload = decodeToken(data.access)
    if (payload) {
      const profile = await fetchProfile()
      setUser({
        id: payload.user_id,
        username: payload.username,
        email: profile.email,
        role: profile.role as 'hr' | 'psychiatrist',
      })
      return profile.role
    }
  }

  const register = async (regData: RegisterData) => {
    const { data } = await api.post('/auth/register/', regData)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser({ id: data.user.id, username: data.user.username, email: data.user.email, role: data.user.role || 'hr' })
  }

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPsychiatrist: user?.role === 'psychiatrist' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
