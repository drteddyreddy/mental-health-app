import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/ui/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ScreeningPage from './pages/screening/ScreeningPage'
import ResultPage from './pages/results/ResultPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const EmployeeListPage = lazy(() => import('./pages/employees/EmployeeListPage'))
const EmployeeUploadPage = lazy(() => import('./pages/employees/EmployeeUploadPage'))
const EmployeeLookupPage = lazy(() => import('./pages/employees/EmployeeLookupPage'))
const CampaignListPage = lazy(() => import('./pages/campaigns/CampaignListPage'))
const CampaignCreatePage = lazy(() => import('./pages/campaigns/CampaignCreatePage'))
const CampaignDetailPage = lazy(() => import('./pages/campaigns/CampaignDetailPage'))
const PsychiatristCompaniesPage = lazy(() => import('./pages/psychiatrist/PsychiatristCompaniesPage'))
const PsychiatristCompanyDetailPage = lazy(() => import('./pages/psychiatrist/PsychiatristCompanyDetailPage'))
const PsychiatristAnalyticsPage = lazy(() => import('./pages/psychiatrist/PsychiatristAnalyticsPage'))
const PsychiatristQuestionnairesPage = lazy(() => import('./pages/psychiatrist/PsychiatristQuestionnairesPage'))
const CompanySettingsPage = lazy(() => import('./pages/settings/CompanySettingsPage'))
const ChangePasswordPage = lazy(() => import('./pages/settings/ChangePasswordPage'))

function PageLoader() {
  return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-mindwell border-t-transparent rounded-full" /></div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/screening/:linkId" element={<ScreeningPage />} />
      <Route path="/results/:linkId" element={<ResultPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="/employees" element={<Suspense fallback={<PageLoader />}><EmployeeListPage /></Suspense>} />
        <Route path="/employees/upload" element={<Suspense fallback={<PageLoader />}><EmployeeUploadPage /></Suspense>} />
        <Route path="/employees/lookup" element={<Suspense fallback={<PageLoader />}><EmployeeLookupPage /></Suspense>} />
        <Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignListPage /></Suspense>} />
        <Route path="/campaigns/new" element={<Suspense fallback={<PageLoader />}><CampaignCreatePage /></Suspense>} />
        <Route path="/campaigns/:id" element={<Suspense fallback={<PageLoader />}><CampaignDetailPage /></Suspense>} />
        <Route path="/psy/companies" element={<Suspense fallback={<PageLoader />}><PsychiatristCompaniesPage /></Suspense>} />
        <Route path="/psy/companies/:id" element={<Suspense fallback={<PageLoader />}><PsychiatristCompanyDetailPage /></Suspense>} />
        <Route path="/psy/companies/:id/analytics" element={<Suspense fallback={<PageLoader />}><PsychiatristAnalyticsPage /></Suspense>} />
        <Route path="/psy/questionnaires" element={<Suspense fallback={<PageLoader />}><PsychiatristQuestionnairesPage /></Suspense>} />
        <Route path="/settings/company" element={<Suspense fallback={<PageLoader />}><CompanySettingsPage /></Suspense>} />
        <Route path="/settings/password" element={<Suspense fallback={<PageLoader />}><ChangePasswordPage /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
