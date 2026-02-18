import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { isTokenExpired } from './utils/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Clients from './pages/Clients'
import MemberDetails from './pages/MemberDetails'
import Payments from './pages/Payments'
import Staff from './pages/Staff'
import StaffDetails from './pages/StaffDetails'
import StaffAdminRights from './pages/StaffAdminRights'
import StaffTargets from './pages/StaffTargets'
import StaffAddTarget from './pages/StaffAddTarget'
import StaffRepChange from './pages/StaffRepChange'
import ServiceSalesReport from './pages/ServiceSalesReport'
import PendingCollectionsReport from './pages/PendingCollectionsReport'
import UpgradeReport from './pages/UpgradeReport'
import MemberCheckinsReport from './pages/MemberCheckinsReport'
import NewClientsReport from './pages/NewClientsReport'
import RenewalsReport from './pages/RenewalsReport'
import ServiceExpiry from './pages/ServiceExpiry'
import BirthdayReport from './pages/BirthdayReport'
import StaffBirthdayReport from './pages/StaffBirthdayReport'
import Settings from './pages/Settings'
import Setup from './pages/Setup'
import SetupGettingStarted from './pages/SetupGettingStarted'
import SetupBrandLogo from './pages/SetupBrandLogo'
import SetupDefineTax from './pages/SetupDefineTax'
import SetupBillTemplate from './pages/SetupBillTemplate'
import SetupServices from './pages/SetupServices'
import SetupFormCustomization from './pages/SetupFormCustomization'
import SetupMarketingTemplates from './pages/SetupMarketingTemplates'
import SetupMarketingLeadSource from './pages/SetupMarketingLeadSource'
import ClientManagementUpgrade from './pages/ClientManagementUpgrade'
import ClientManagementExtension from './pages/ClientManagementExtension'
import Enquiries from './pages/Enquiries'
import Marketing from './pages/Marketing'
import Corporates from './pages/Corporates'
import Expenses from './pages/Expenses'
import Estimates from './pages/Estimates'
import Support from './pages/Support'
import SuperAdminProfile from './pages/SuperAdminProfile'
import AccountPlan from './pages/AccountPlan'
import CentralPanel from './pages/CentralPanel'
import NotFound from './pages/NotFound'
import BranchManagement from './pages/BranchManagement'
import Taskboard from './pages/Taskboard'
import Leaderboard from './pages/Leaderboard'
import UpdateEnquiryCall from './pages/UpdateEnquiryCall'
import EditEnquiry from './pages/EditEnquiry'
import InvoiceDetails from './pages/InvoiceDetails'
import MemberLogin from './pages/MemberLogin'
import MemberProfile from './pages/MemberProfile'
import InvoicePrint from './pages/InvoicePrint'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const location = useLocation()
  const { token, user, logout, hydrated, setHydrated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [localToken, setLocalToken] = useState(null)
  const [localUser, setLocalUser] = useState(null)

  // Read from localStorage as fallback
  useEffect(() => {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const authData = JSON.parse(authStorage)
        if (authData?.state) {
          setLocalToken(authData.state.token)
          setLocalUser(authData.state.user)
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e)
    }
  }, [])

  // Ensure hydration happens
  useEffect(() => {
    if (!hydrated) {
      setHydrated()
    }
  }, [hydrated, setHydrated])

  // Give it a moment to hydrate
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const currentToken = token || localToken
    if (currentToken && isTokenExpired(currentToken)) {
      logout()
    }
  }, [hydrated, token, localToken, logout])

  // Use store values or fallback to localStorage values
  const effectiveToken = token || localToken
  const effectiveUser = user || localUser

  // Show loading state while hydrating or checking
  if (!hydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Check token expiration
  const tokenExpired = effectiveToken ? isTokenExpired(effectiveToken) : true
  const hasValidAuth = Boolean(effectiveToken && effectiveUser && !tokenExpired)
  
  if (!hasValidAuth) {
    // Prevent redirect loop - only redirect if not already on login page
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      return <Navigate to="/login" state={{ from: location }} replace />
    }
    return null
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="invoices/:invoiceId/print" element={<InvoicePrint />} />
        {/* Member routes (no admin authentication required) */}
        <Route path="member/login" element={<MemberLogin />} />
        <Route path="member/profile" element={<MemberProfile />} />
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
          <Route path="enquiries/:enquiryId/edit" element={<EditEnquiry />} />
          <Route path="enquiries/:enquiryId/update-call" element={<UpdateEnquiryCall />} />
          <Route path="invoices/:invoiceId" element={<InvoiceDetails />} />
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
          <Route path="reports/staff/birthday" element={<StaffBirthdayReport />} />
          <Route path="reports" element={<Navigate to="/reports/sales/service-sales" replace />} />
          <Route path="reports/sales/service-sales" element={<ServiceSalesReport />} />
          <Route path="reports/finance/pending-collections" element={<PendingCollectionsReport />} />
          <Route path="reports/finance/service-payments-collected" element={<Payments />} />
          <Route path="reports/client-management/upgrade" element={<UpgradeReport />} />
          <Route path="reports/client-management/member-checkins" element={<MemberCheckinsReport />} />
          <Route path="reports/client-management/new-clients" element={<NewClientsReport />} />
          <Route path="reports/client-management/renewals" element={<RenewalsReport />} />
          <Route path="reports/client-management/service-expiry" element={<ServiceExpiry />} />
          <Route path="reports/client-management/birthday" element={<BirthdayReport />} />
          <Route path="setup" element={<Setup />} />
          <Route path="setup/getting-started" element={<SetupGettingStarted />} />
          <Route path="setup/brand-logo" element={<SetupBrandLogo />} />
          <Route path="setup/define-tax" element={<SetupDefineTax />} />
          <Route path="setup/bill-template" element={<SetupBillTemplate />} />
          <Route path="setup/services" element={<SetupServices />} />
          <Route path="setup/form-customization" element={<SetupFormCustomization />} />
          <Route path="setup/marketing/templates" element={<SetupMarketingTemplates />} />
          <Route path="setup/marketing/lead-sources" element={<SetupMarketingLeadSource />} />
          <Route path="setup/client-management/upgrade" element={<ClientManagementUpgrade />} />
          <Route path="setup/client-management/extension" element={<ClientManagementExtension />} />
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
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Route>
        <Route
          path="central-panel"
          element={
            <PrivateRoute>
              <CentralPanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/not-found"
          element={
            <PrivateRoute>
              <NotFound />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
      <Toaster 
        position="top-center" 
        containerStyle={{
          zIndex: 10010
        }}
        toastOptions={{
          style: {
            zIndex: 10010
          }
        }}
      />
    </>
  )
}

export default App


