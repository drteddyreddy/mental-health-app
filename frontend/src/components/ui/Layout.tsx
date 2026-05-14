import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  HiOutlineHeart, HiOutlineSquares2X2, HiOutlineUsers,
  HiOutlineMegaphone, HiOutlineArrowRightOnRectangle, HiOutlineBuildingOffice2,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2'

export default function Layout() {
  const { user, logout, isPsychiatrist } = useAuth()

  const navLinks = isPsychiatrist
    ? [
        { to: '/psy/companies', label: 'Companies', icon: HiOutlineBuildingOffice2 },
        { to: '/psy/questionnaires', label: 'Questionnaires', icon: HiOutlineSquares2X2 },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: HiOutlineSquares2X2 },
        { to: '/employees', label: 'Employees', icon: HiOutlineUsers },
        { to: '/campaigns', label: 'Campaigns', icon: HiOutlineMegaphone },
      ]
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) =>
    location.pathname.startsWith(path) ? 'text-white font-semibold' : 'text-white/70'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-mindwell text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={isPsychiatrist ? '/psy/companies' : '/dashboard'} className="flex items-center gap-2 font-bold text-xl">
              <HiOutlineHeart className="text-2xl" />
              MindWell
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 text-sm font-medium hover:text-white/80 transition ${isActive(link.to)}`}
                  >
                    <link.icon className="text-lg" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {user && (
              <div className="flex items-center gap-3">
                <Link to="/settings/company" className="text-sm text-white/60 hover:text-white transition hidden sm:inline-flex items-center gap-1" aria-label="Settings">
                  <HiOutlineCog6Tooth className="text-base" />
                </Link>
                <span className="text-sm text-white/80">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition"
                >
                  <HiOutlineArrowRightOnRectangle className="text-lg" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {user && (
          <nav className="md:hidden border-t border-white/20 px-4 py-2">
            <div className="flex gap-4 overflow-x-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1 text-sm whitespace-nowrap font-medium ${isActive(link.to)}`}
                >
                  <link.icon className="text-base" />
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        MindWell &copy; {new Date().getFullYear()} &mdash; Mental Health Screening Platform
      </footer>
    </div>
  )
}
