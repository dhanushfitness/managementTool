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
import SMSReport from './pages/SMSReport'
import BusinessMISReport from './pages/BusinessMISReport'
import MarketingMISReport from './pages/MarketingMISReport'
import DSRReport from './pages/DSRReport'
import RevenueReport from './pages/RevenueReport'
import RevenueMonthTillDateReport from './pages/RevenueMonthTillDateReport'
import ServiceSalesReport from './pages/ServiceSalesReport'
import EnquiryConversionReport from './pages/EnquiryConversionReport'
import RefundReport from './pages/RefundReport'
import AllInvoicesReport from './pages/AllInvoicesReport'
import PaidInvoicesReport from './pages/PaidInvoicesReport'
import ReceiptsReport from './pages/ReceiptsReport'
import PendingCollectionsReport from './pages/PendingCollectionsReport'
import RevenueRealizationReport from './pages/RevenueRealizationReport'
import RevenueRealizationBaseValueReport from './pages/RevenueRealizationBaseValueReport'
import CollectionReport from './pages/CollectionReport'
import CashFlowStatementReport from './pages/CashFlowStatementReport'
import PaymentModeReport from './pages/PaymentModeReport'
import BackdatedBillsReport from './pages/BackdatedBillsReport'
import DiscountReport from './pages/DiscountReport'
import CancelledInvoicesReport from './pages/CancelledInvoicesReport'
import EffectiveSalesAccountingReport from './pages/EffectiveSalesAccountingReport'
import ExpenseReport from './pages/ExpenseReport'
import RenewalVsAttritionReport from './pages/RenewalVsAttritionReport'
import UpgradeReport from './pages/UpgradeReport'
import MemberCheckinsReport from './pages/MemberCheckinsReport'
import MultiClubMemberCheckinsReport from './pages/MultiClubMemberCheckinsReport'
import MemberAttendanceRegisterReport from './pages/MemberAttendanceRegisterReport'
import NewClientsReport from './pages/NewClientsReport'
import RenewalsReport from './pages/RenewalsReport'
import MembershipReport from './pages/MembershipReport'
import MembershipExpiryReport from './pages/MembershipExpiryReport'
import IrregularMembersReport from './pages/IrregularMembersReport'
import ActiveMembersReport from './pages/ActiveMembersReport'
import InactiveMembersReport from './pages/InactiveMembersReport'
import MulticlubClientsReport from './pages/MulticlubClientsReport'
import ArchivedClientsReport from './pages/ArchivedClientsReport'
import FreezeAndDateChangeReport from './pages/FreezeAndDateChangeReport'
import SuspensionsReport from './pages/SuspensionsReport'
import AttendanceHeatMapReport from './pages/AttendanceHeatMapReport'
import ServiceTransferReport from './pages/ServiceTransferReport'
import BirthdayReport from './pages/BirthdayReport'
import ClientAttendanceReport from './pages/ClientAttendanceReport'
import MembershipRetentionReport from './pages/MembershipRetentionReport'
import CancellationReport from './pages/CancellationReport'
import ProfileChangeReport from './pages/ProfileChangeReport'
import OneTimePurchaserReport from './pages/OneTimePurchaserReport'
import AverageLifetimeValueReport from './pages/AverageLifetimeValueReport'
import StaffCheckinsReport from './pages/StaffCheckinsReport'
import StaffLeaveReport from './pages/StaffLeaveReport'
import StaffAttendanceRegisterReport from './pages/StaffAttendanceRegisterReport'
import StaffBirthdayReport from './pages/StaffBirthdayReport'
import StaffCallLogReport from './pages/StaffCallLogReport'
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
          <Route path="reports/sms" element={<SMSReport />} />
          <Route path="reports/business-mis" element={<BusinessMISReport />} />
          <Route path="reports/marketing-mis" element={<MarketingMISReport />} />
          <Route path="reports/expense/summary" element={<ExpenseReport />} />
          <Route path="reports/staff/check-ins" element={<StaffCheckinsReport />} />
          <Route path="reports/staff/leave" element={<StaffLeaveReport />} />
          <Route path="reports/staff/attendance-register" element={<StaffAttendanceRegisterReport />} />
          <Route path="reports/staff/birthday" element={<StaffBirthdayReport />} />
          <Route path="reports/staff/call-log" element={<StaffCallLogReport />} />
          <Route path="reports/sales/dsr" element={<DSRReport />} />
          <Route path="reports/sales/revenue" element={<RevenueReport />} />
          <Route path="reports/sales/revenue-month-till-date" element={<RevenueMonthTillDateReport />} />
          <Route path="reports/sales/service-sales" element={<ServiceSalesReport />} />
          <Route path="reports/sales/enquiry-conversion" element={<EnquiryConversionReport />} />
          <Route path="reports/finance/refund-report" element={<RefundReport />} />
          <Route path="reports/finance/all-invoices" element={<AllInvoicesReport />} />
          <Route path="reports/finance/paid-invoices" element={<PaidInvoicesReport />} />
          <Route path="reports/finance/receipts" element={<ReceiptsReport />} />
          <Route path="reports/finance/pending-collections" element={<PendingCollectionsReport />} />
          <Route path="reports/finance/revenue-realization" element={<RevenueRealizationReport />} />
          <Route path="reports/finance/revenue-realization-base-value" element={<RevenueRealizationBaseValueReport />} />
          <Route path="reports/finance/collection" element={<CollectionReport />} />
          <Route path="reports/finance/cashflow-statement" element={<CashFlowStatementReport />} />
          <Route path="reports/finance/payment-mode" element={<PaymentModeReport />} />
          <Route path="reports/finance/backdated-bills" element={<BackdatedBillsReport />} />
          <Route path="reports/finance/discount" element={<DiscountReport />} />
          <Route path="reports/finance/cancelled-invoices" element={<CancelledInvoicesReport />} />
          <Route path="reports/finance/effective-sales-accounting" element={<EffectiveSalesAccountingReport />} />
          <Route path="reports/client-management/renewal-vs-attrition" element={<RenewalVsAttritionReport />} />
          <Route path="reports/client-management/upgrade" element={<UpgradeReport />} />
          <Route path="reports/client-management/member-checkins" element={<MemberCheckinsReport />} />
          <Route path="reports/client-management/multiclub-member-checkins" element={<MultiClubMemberCheckinsReport />} />
          <Route path="reports/client-management/member-attendance-register" element={<MemberAttendanceRegisterReport />} />
          <Route path="reports/client-management/new-clients" element={<NewClientsReport />} />
          <Route path="reports/client-management/renewals" element={<RenewalsReport />} />
          <Route path="reports/client-management/membership" element={<MembershipReport />} />
          <Route path="reports/client-management/membership-expiry" element={<MembershipExpiryReport />} />
          <Route path="reports/client-management/irregular-members" element={<IrregularMembersReport />} />
          <Route path="reports/client-management/active-members" element={<ActiveMembersReport />} />
          <Route path="reports/client-management/inactive-members" element={<InactiveMembersReport />} />
          <Route path="reports/client-management/multiclub-clients" element={<MulticlubClientsReport />} />
          <Route path="reports/client-management/archived-clients" element={<ArchivedClientsReport />} />
          <Route path="reports/client-management/freeze-and-date-change" element={<FreezeAndDateChangeReport />} />
          <Route path="reports/client-management/suspensions" element={<SuspensionsReport />} />
          <Route path="reports/client-management/attendance-heat-map" element={<AttendanceHeatMapReport />} />
          <Route path="reports/client-management/service-transfer" element={<ServiceTransferReport />} />
          <Route path="reports/client-management/birthday" element={<BirthdayReport />} />
          <Route path="reports/client-management/client-attendance" element={<ClientAttendanceReport />} />
          <Route path="reports/client-management/membership-retention" element={<MembershipRetentionReport />} />
          <Route path="reports/client-management/cancellation" element={<CancellationReport />} />
          <Route path="reports/client-management/profile-change" element={<ProfileChangeReport />} />
          <Route path="reports/client-management/one-time-purchaser" element={<OneTimePurchaserReport />} />
          <Route path="reports/client-management/average-lifetime-value" element={<AverageLifetimeValueReport />} />
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


