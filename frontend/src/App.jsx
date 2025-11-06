import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Clients from './pages/Clients'
import MemberDetails from './pages/MemberDetails'
import Plans from './pages/Plans'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import Attendance from './pages/Attendance'
import Staff from './pages/Staff'
import StaffDetails from './pages/StaffDetails'
import StaffAdminRights from './pages/StaffAdminRights'
import StaffTargets from './pages/StaffTargets'
import StaffAddTarget from './pages/StaffAddTarget'
import StaffRepChange from './pages/StaffRepChange'
import Reports from './pages/Reports'
import BiometricReport from './pages/BiometricReport'
import OffersReport from './pages/OffersReport'
import LeadSourceReport from './pages/LeadSourceReport'
import ReferralReport from './pages/ReferralReport'
import Settings from './pages/Settings'
import Setup from './pages/Setup'
import Enquiries from './pages/Enquiries'
import Marketing from './pages/Marketing'
import Corporates from './pages/Corporates'
import Expenses from './pages/Expenses'
import Estimates from './pages/Estimates'
import Support from './pages/Support'
import SuperAdminProfile from './pages/SuperAdminProfile'
import AccountPlan from './pages/AccountPlan'
import CentralPanel from './pages/CentralPanel'
import BranchManagement from './pages/BranchManagement'
import Taskboard from './pages/Taskboard'
import Leaderboard from './pages/Leaderboard'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { token, user } = useAuthStore()
  
  // Check if we have auth data
  const hasAuth = token && user
  
  // If no auth, redirect to login
  if (!hasAuth) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<MemberDetails />} />
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetails />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/:id" element={<StaffDetails />} />
          <Route path="staff/:id/admin-rights" element={<StaffAdminRights />} />
          <Route path="staff/:id/targets" element={<StaffTargets />} />
          <Route path="staff/:id/add-target" element={<StaffAddTarget />} />
          <Route path="staff/:id/rep-change" element={<StaffRepChange />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/biometric" element={<BiometricReport />} />
          <Route path="reports/offers" element={<OffersReport />} />
          <Route path="reports/lead-source" element={<LeadSourceReport />} />
          <Route path="reports/referral" element={<ReferralReport />} />
          <Route path="setup" element={<Setup />} />
          <Route path="settings" element={<Settings />} />
          <Route path="corporates" element={<Corporates />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<SuperAdminProfile />} />
          <Route path="account-plan" element={<AccountPlan />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="taskboard" element={<Taskboard />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>
        <Route
          path="central-panel"
          element={
            <PrivateRoute>
              <CentralPanel />
            </PrivateRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App

