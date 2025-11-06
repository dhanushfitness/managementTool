import api from './axios'

export const getBiometricReport = (params) => api.get('/reports/biometric', { params })
export const exportBiometricReport = (params, reportType = 'member') => api.get('/reports/biometric/export', { 
  params: { ...params, reportType },
  responseType: 'blob'
})
export const getBiometricStaffReport = (params) => api.get('/reports/biometric/staff', { params })
export const getBiometricMulticlubReport = (params) => api.get('/reports/biometric/multiclub', { params })
export const getBiometricDevices = () => api.get('/reports/biometric/devices')
export const getOffersReport = (params) => api.get('/reports/offers', { params })
export const getLeadSourceReport = (params) => api.get('/reports/lead-source', { params })
export const exportLeadSourceReport = (params) => api.get('/reports/lead-source/export', { 
  params,
  responseType: 'blob'
})
export const getReferralReport = (params) => api.get('/reports/referral', { params })
export const getMemberReferralReport = (params) => api.get('/reports/referral/member', { params })
export const getSMSReport = (params) => api.get('/reports/sms', { params })
export const getBusinessMISReport = (params) => api.get('/reports/business-mis', { params })
export const exportBusinessMISReport = (params) => api.get('/reports/business-mis/export', { 
  params,
  responseType: 'blob'
})
export const getMarketingMISReport = (params) => api.get('/reports/marketing-mis', { params })
export const exportMarketingMISReport = (params) => api.get('/reports/marketing-mis/export', { 
  params,
  responseType: 'blob'
})
export const getDSRReport = (params) => api.get('/reports/dsr', { params })
export const exportDSRReport = (params) => api.get('/reports/dsr/export', { 
  params,
  responseType: 'blob'
})
export const getRevenueReport = (params) => api.get('/reports/revenue', { params })
export const exportRevenueReport = (params) => api.get('/reports/revenue/export', { 
  params,
  responseType: 'blob'
})
export const getRevenueMonthTillDateReport = (params) => api.get('/reports/revenue-month-till-date', { params })
export const exportRevenueMonthTillDateReport = (params) => api.get('/reports/revenue-month-till-date/export', { 
  params,
  responseType: 'blob'
})
export const getServiceTypeReport = (params) => api.get('/reports/service-type', { params })
export const exportServiceTypeReport = (params) => api.get('/reports/service-type/export', { 
  params,
  responseType: 'blob'
})
export const getServiceSalesReport = (params) => api.get('/reports/service-sales', { params })
export const exportServiceSalesReport = (params) => api.get('/reports/service-sales/export', { 
  params,
  responseType: 'blob'
})
export const getEnquiryConversionReport = (params) => api.get('/reports/enquiry-conversion', { params })
export const exportEnquiryConversionReport = (params) => api.get('/reports/enquiry-conversion/export', { 
  params,
  responseType: 'blob'
})
export const getEffectiveSalesAccountingReport = (params) => api.get('/reports/effective-sales-accounting', { params })
export const exportEffectiveSalesAccountingReport = (params) => api.get('/reports/effective-sales-accounting/export', { 
  params,
  responseType: 'blob'
})
export const getRefundReport = (params) => api.get('/reports/refund', { params })
export const exportRefundReport = (params) => api.get('/reports/refund/export', {
  params,
  responseType: 'blob'
})
export const getRevenueRealizationReport = (params) => api.get('/reports/revenue-realization', { params })
export const exportRevenueRealizationReport = (params) => api.get('/reports/revenue-realization/export', {
  params,
  responseType: 'blob'
})
export const getRevenueRealizationBaseValueReport = (params) => api.get('/reports/revenue-realization-base-value', { params })
export const exportRevenueRealizationBaseValueReport = (params) => api.get('/reports/revenue-realization-base-value/export', {
  params,
  responseType: 'blob'
})
export const getCollectionReport = (params) => api.get('/reports/collection', { params })
export const exportCollectionReport = (params) => api.get('/reports/collection/export', {
  params,
  responseType: 'blob'
})
export const getCashFlowStatementReport = (params) => api.get('/reports/cashflow-statement', { params })
export const exportCashFlowStatementReport = (params) => api.get('/reports/cashflow-statement/export', {
  params,
  responseType: 'blob'
})
export const getPaymentModeReport = (params) => api.get('/reports/payment-mode', { params })
export const exportPaymentModeReport = (params) => api.get('/reports/payment-mode/export', {
  params,
  responseType: 'blob'
})
export const getBackdatedBillsReport = (params) => api.get('/reports/backdated-bills', { params })
export const exportBackdatedBillsReport = (params) => api.get('/reports/backdated-bills/export', {
  params,
  responseType: 'blob'
})
export const getDiscountReport = (params) => api.get('/reports/discount', { params })
export const exportDiscountReport = (params) => api.get('/reports/discount/export', {
  params,
  responseType: 'blob'
})

// Client Management Reports
export const getRenewalVsAttritionReport = (params) => api.get('/reports/renewal-vs-attrition', { params })
export const exportRenewalVsAttritionReport = (params) => api.get('/reports/renewal-vs-attrition/export', {
  params,
  responseType: 'blob'
})
export const getRenewalVsAttritionList = (params) => api.get('/reports/renewal-vs-attrition/list', { params })
export const getUpgradeReport = (params) => api.get('/reports/upgrade', { params })
export const exportUpgradeReport = (params) => api.get('/reports/upgrade/export', {
  params,
  responseType: 'blob'
})
export const getMemberCheckinsReport = (params) => api.get('/reports/member-checkins', { params })
export const exportMemberCheckinsReport = (params) => api.get('/reports/member-checkins/export', {
  params,
  responseType: 'blob'
})
export const getMultiClubMemberCheckinsReport = (params) => api.get('/reports/multiclub-member-checkins', { params })
export const exportMultiClubMemberCheckinsReport = (params) => api.get('/reports/multiclub-member-checkins/export', {
  params,
  responseType: 'blob'
})
export const getMemberAttendanceRegisterReport = (params) => api.get('/reports/member-attendance-register', { params })
export const exportMemberAttendanceRegisterReport = (params) => api.get('/reports/member-attendance-register/export', {
  params,
  responseType: 'blob'
})
export const getNewClientsReport = (params) => api.get('/reports/new-clients', { params })
export const exportNewClientsReport = (params) => api.get('/reports/new-clients/export', {
  params,
  responseType: 'blob'
})
export const getRenewalsReport = (params) => api.get('/reports/renewals', { params })
export const exportRenewalsReport = (params) => api.get('/reports/renewals/export', {
  params,
  responseType: 'blob'
})
export const getMembershipReport = (params) => api.get('/reports/membership', { params })
export const exportMembershipReport = (params) => api.get('/reports/membership/export', {
  params,
  responseType: 'blob'
})
export const getFreezeAndDateChangeReport = (params) => api.get('/reports/freeze-and-date-change', { params })
export const exportFreezeAndDateChangeReport = (params) => api.get('/reports/freeze-and-date-change/export', {
  params,
  responseType: 'blob'
})
export const getSuspensionsReport = (params) => api.get('/reports/suspensions', { params })
export const exportSuspensionsReport = (params) => api.get('/reports/suspensions/export', {
  params,
  responseType: 'blob'
})
export const getAttendanceHeatMapReport = (params) => api.get('/reports/attendance-heat-map', { params })
export const exportAttendanceHeatMapReport = (params) => api.get('/reports/attendance-heat-map/export', {
  params,
  responseType: 'blob'
})
export const getServiceTransferReport = (params) => api.get('/reports/service-transfer', { params })
export const exportServiceTransferReport = (params) => api.get('/reports/service-transfer/export', {
  params,
  responseType: 'blob'
})
export const getBirthdayReport = (params) => api.get('/reports/birthday', { params })
export const exportBirthdayReport = (params) => api.get('/reports/birthday/export', {
  params,
  responseType: 'blob'
})
export const getClientAttendanceReport = (params) => api.get('/reports/client-attendance', { params })
export const exportClientAttendanceReport = (params) => api.get('/reports/client-attendance/export', {
  params,
  responseType: 'blob'
})
export const getMembershipRetentionReport = (params) => api.get('/reports/membership-retention', { params })
export const exportMembershipRetentionReport = (params) => api.get('/reports/membership-retention/export', {
  params,
  responseType: 'blob'
})
export const getCancellationReport = (params) => api.get('/reports/cancellation', { params })
export const exportCancellationReport = (params) => api.get('/reports/cancellation/export', {
  params,
  responseType: 'blob'
})
export const getProfileChangeReport = (params) => api.get('/reports/profile-change', { params })
export const exportProfileChangeReport = (params) => api.get('/reports/profile-change/export', {
  params,
  responseType: 'blob'
})
export const getOneTimePurchaserReport = (params) => api.get('/reports/one-time-purchaser', { params })
export const exportOneTimePurchaserReport = (params) => api.get('/reports/one-time-purchaser/export', {
  params,
  responseType: 'blob'
})
export const getAverageLifetimeValueReport = (params) => api.get('/reports/average-lifetime-value', { params })
export const exportAverageLifetimeValueReport = (params) => api.get('/reports/average-lifetime-value/export', {
  params,
  responseType: 'blob'
})
export const getMembershipExpiryReport = (params) => api.get('/reports/membership-expiry', { params })
export const exportMembershipExpiryReport = (params) => api.get('/reports/membership-expiry/export', {
  params,
  responseType: 'blob'
})
export const getIrregularMembersReport = (params) => api.get('/reports/irregular-members', { params })
export const exportIrregularMembersReport = (params) => api.get('/reports/irregular-members/export', {
  params,
  responseType: 'blob'
})
export const getActiveMembersReport = (params) => api.get('/reports/active-members', { params })
export const exportActiveMembersReport = (params) => api.get('/reports/active-members/export', {
  params,
  responseType: 'blob'
})
export const getInactiveMembersReport = (params) => api.get('/reports/inactive-members', { params })
export const exportInactiveMembersReport = (params) => api.get('/reports/inactive-members/export', {
  params,
  responseType: 'blob'
})
export const getMulticlubClientsReport = (params) => api.get('/reports/multiclub-clients', { params })
export const exportMulticlubClientsReport = (params) => api.get('/reports/multiclub-clients/export', {
  params,
  responseType: 'blob'
})
export const getArchivedClientsReport = (params) => api.get('/reports/archived-clients', { params })
export const exportArchivedClientsReport = (params) => api.get('/reports/archived-clients/export', {
  params,
  responseType: 'blob'
})

