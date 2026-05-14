import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { HiOutlineHeart } from 'react-icons/hi2'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const role = await login(username, password)
      navigate(role === 'psychiatrist' ? '/psy/companies' : '/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mindwell-dark to-mindwell flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <HiOutlineHeart className="text-5xl text-white mx-auto" />
          <h1 className="text-2xl font-bold text-white mt-2">MindWell</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-center">Welcome Back</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell focus:border-transparent" placeholder="Enter your username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell focus:border-transparent" placeholder="Enter your password" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-mindwell text-white font-semibold py-2.5 rounded-lg hover:bg-mindwell-dark transition disabled:opacity-50">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Don't have an account? <Link to="/register" className="text-mindwell font-medium hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
