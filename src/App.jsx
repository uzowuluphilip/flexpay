import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import LightningWaveBackground from './components/LightningWaveBackground'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/dashboard/HomePage'
import AboutPage from './pages/dashboard/AboutPage'
import InvestPage from './pages/dashboard/InvestPage'
import DailyTasksPage from './pages/dashboard/DailyTasksPage'
import ReferralPage from './pages/dashboard/ReferralPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import SupportPage from './pages/dashboard/SupportPage'
import CommunityPage from './pages/dashboard/CommunityPage'
import WithdrawPage from './pages/dashboard/WithdrawPage'
import PlaceholderPage from './pages/dashboard/PlaceholderPage'
import HistoryPage from './pages/dashboard/HistoryPage'
import ProtectedRoute from './components/dashboard/ProtectedRoute'
import RouteTransitionLayout from './components/RouteTransitionLayout'
import { AuthProvider } from './lib/authContext'
import { AdminAuthProvider } from './lib/AdminAuthContext'
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute'
import AdminLoginPage from './pages/admin/LoginPage'
import AdminDashboard from './pages/admin/DashboardPage'
import AdminUsersPage from './pages/admin/UsersPage'
import AdminWithdrawalsPage from './pages/admin/WithdrawalsPage'
import AdminTasksPage from './pages/admin/TasksPage'
import AdminAchievementsPage from './pages/admin/AchievementsPage'
import TopUpPage from './pages/dashboard/TopUpPage'
import AdminTopUpsPage from './pages/admin/TopUpsPage'
import StatusPage from './pages/dashboard/StatusPage'
import AchievementsPage from './pages/dashboard/AchievementsPage'
import SpinPage from './pages/dashboard/SpinPage'
import WithdrawalActivityToast from './components/WithdrawalActivityToast'
import NotificationPrompt from './components/NotificationPrompt'
import OnboardingPage from './pages/auth/OnboardingPage'
import UpgradePage from './pages/dashboard/UpgradePage'

function App() {
  useEffect(() => {
    const themeEnabled = window.localStorage.getItem('flexpay-theme-enabled') !== 'false'
    document.documentElement.dataset.theme = themeEnabled ? 'dark' : 'light'
  }, [])

  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Router>
          <RouteTransitionLayout>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<DashboardVisualLayout />}>
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
              <Route path="/invest" element={<ProtectedRoute><InvestPage /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
              <Route path="/leaders" element={<ProtectedRoute><PlaceholderPage title="Leaders" description="Leaderboard details are coming soon. Check back when the ranking page is ready." /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><PlaceholderPage title="History" description="Transaction history is coming soon. We’ll add the full feed and filters here next." /></ProtectedRoute>} />
              <Route path="/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
              <Route path="/top-up" element={<ProtectedRoute><TopUpPage /></ProtectedRoute>} />
              <Route path="/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><DailyTasksPage /></ProtectedRoute>} />
              <Route path="/daily-tasks" element={<ProtectedRoute><DailyTasksPage /></ProtectedRoute>} />
              <Route path="/spin" element={<ProtectedRoute><SpinPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/status" element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
              <Route path="/dev/history" element={<HistoryPage />} />
              <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsersPage /></AdminProtectedRoute>} />
            <Route path="/admin/withdrawals" element={<AdminProtectedRoute><AdminWithdrawalsPage /></AdminProtectedRoute>} />
            <Route path="/admin/topups" element={<AdminProtectedRoute><AdminTopUpsPage /></AdminProtectedRoute>} />
            <Route path="/admin/tasks" element={<AdminProtectedRoute><AdminTasksPage /></AdminProtectedRoute>} />
            <Route path="/admin/achievements" element={<AdminProtectedRoute><AdminAchievementsPage /></AdminProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RouteTransitionLayout>
        <WithdrawalActivityToast />
        <NotificationPrompt />
      </Router>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

function DashboardVisualLayout() {
  return (
    <>
      <LightningWaveBackground />
      <div className="dashboard-motion-content relative z-10">
        <Outlet />
      </div>
    </>
  )
}

export default App
