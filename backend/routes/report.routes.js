import express from 'express';
import {
  getFinancialReport,
  getMemberReport,
  getOperationalReport,
  exportReport,
  scheduleReport,
  getBiometricReport,
  getBiometricStaffReport,
  getBiometricMulticlubReport,
  getBiometricDevices,
  exportBiometricReport,
  getOffersReport,
  getLeadSourceReport,
  exportLeadSourceReport,
  getReferralReport,
  getMemberReferralReport,
  getSMSReport,
  getBusinessMISReport,
  exportBusinessMISReport,
  getMarketingMISReport,
  exportMarketingMISReport,
  getDSRReport,
  exportDSRReport,
  getRevenueReport,
  exportRevenueReport,
  getRevenueMonthTillDateReport,
  exportRevenueMonthTillDateReport,
  getEnquiryConversionReport,
  exportEnquiryConversionReport,
  getServiceTypeReport,
  exportServiceTypeReport,
  getRevenueRealizationReport,
  exportRevenueRealizationReport,
  getRevenueRealizationBaseValueReport,
  exportRevenueRealizationBaseValueReport,
  getCollectionReport,
  exportCollectionReport,
  getCashFlowStatementReport,
  exportCashFlowStatementReport,
  getPaymentModeReport,
  exportPaymentModeReport,
  getBackdatedBillsReport,
  exportBackdatedBillsReport,
  getDiscountReport,
  exportDiscountReport,
  getEffectiveSalesAccountingReport,
  exportEffectiveSalesAccountingReport,
  getRefundReport,
  exportRefundReport,
  getRenewalVsAttritionReport,
  exportRenewalVsAttritionReport,
  getRenewalVsAttritionList,
  getUpgradeReport,
  exportUpgradeReport,
  getMemberCheckinsReport,
  exportMemberCheckinsReport,
  getMultiClubMemberCheckinsReport,
  exportMultiClubMemberCheckinsReport,
  getMemberAttendanceRegisterReport,
  exportMemberAttendanceRegisterReport,
  getNewClientsReport,
  exportNewClientsReport,
  getRenewalsReport,
  exportRenewalsReport,
  getMembershipReport,
  exportMembershipReport,
  getFreezeAndDateChangeReport,
  exportFreezeAndDateChangeReport,
  getSuspensionsReport,
  exportSuspensionsReport,
  getAttendanceHeatMapReport,
  exportAttendanceHeatMapReport,
  getServiceTransferReport,
  exportServiceTransferReport,
  getBirthdayReport,
  exportBirthdayReport,
  getClientAttendanceReport,
  exportClientAttendanceReport,
  getMembershipRetentionReport,
  exportMembershipRetentionReport,
  getCancellationReport,
  exportCancellationReport,
  getProfileChangeReport,
  exportProfileChangeReport,
  getOneTimePurchaserReport,
  exportOneTimePurchaserReport,
  getAverageLifetimeValueReport,
  exportAverageLifetimeValueReport,
  getMembershipExpiryReport,
  exportMembershipExpiryReport,
  getIrregularMembersReport,
  exportIrregularMembersReport,
  getActiveMembersReport,
  exportActiveMembersReport,
  getInactiveMembersReport,
  exportInactiveMembersReport,
  getMulticlubClientsReport,
  exportMulticlubClientsReport,
  getArchivedClientsReport,
  exportArchivedClientsReport
} from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/financial', authorize('owner', 'manager', 'accountant'), getFinancialReport);
router.get('/members', authorize('owner', 'manager'), getMemberReport);
router.get('/operational', authorize('owner', 'manager'), getOperationalReport);
router.get('/export', authorize('owner', 'manager', 'accountant'), exportReport);
router.post('/schedule', authorize('owner', 'manager'), scheduleReport);

// Biometric Report routes
router.get('/biometric', authorize('owner', 'manager', 'staff'), getBiometricReport);
router.get('/biometric/staff', authorize('owner', 'manager', 'staff'), getBiometricStaffReport);
router.get('/biometric/multiclub', authorize('owner', 'manager', 'staff'), getBiometricMulticlubReport);
router.get('/biometric/devices', authorize('owner', 'manager', 'staff'), getBiometricDevices);
router.get('/biometric/export', authorize('owner', 'manager', 'staff'), exportBiometricReport);

// Marketing Report routes
router.get('/offers', authorize('owner', 'manager', 'staff'), getOffersReport);
router.get('/lead-source', authorize('owner', 'manager', 'staff'), getLeadSourceReport);
router.get('/lead-source/export', authorize('owner', 'manager', 'staff'), exportLeadSourceReport);
router.get('/referral', authorize('owner', 'manager', 'staff'), getReferralReport);
router.get('/referral/member', authorize('owner', 'manager', 'staff'), getMemberReferralReport);
router.get('/sms', authorize('owner', 'manager', 'staff'), getSMSReport);
router.get('/business-mis', authorize('owner', 'manager', 'staff'), getBusinessMISReport);
router.get('/business-mis/export', authorize('owner', 'manager', 'staff'), exportBusinessMISReport);
router.get('/marketing-mis', authorize('owner', 'manager', 'staff'), getMarketingMISReport);
router.get('/marketing-mis/export', authorize('owner', 'manager', 'staff'), exportMarketingMISReport);
router.get('/dsr', authorize('owner', 'manager', 'staff'), getDSRReport);
router.get('/dsr/export', authorize('owner', 'manager', 'staff'), exportDSRReport);
router.get('/revenue', authorize('owner', 'manager', 'staff'), getRevenueReport);
router.get('/revenue/export', authorize('owner', 'manager', 'staff'), exportRevenueReport);
router.get('/revenue-month-till-date', authorize('owner', 'manager', 'staff'), getRevenueMonthTillDateReport);
router.get('/revenue-month-till-date/export', authorize('owner', 'manager', 'staff'), exportRevenueMonthTillDateReport);
router.get('/service-type', authorize('owner', 'manager', 'staff'), getServiceTypeReport);
router.get('/service-type/export', authorize('owner', 'manager', 'staff'), exportServiceTypeReport);
router.get('/enquiry-conversion', authorize('owner', 'manager', 'staff'), getEnquiryConversionReport);
router.get('/enquiry-conversion/export', authorize('owner', 'manager', 'staff'), exportEnquiryConversionReport);
router.get('/revenue-realization', authorize('owner', 'manager', 'staff'), getRevenueRealizationReport);
router.get('/revenue-realization/export', authorize('owner', 'manager', 'staff'), exportRevenueRealizationReport);
router.get('/revenue-realization-base-value', authorize('owner', 'manager', 'staff'), getRevenueRealizationBaseValueReport);
router.get('/revenue-realization-base-value/export', authorize('owner', 'manager', 'staff'), exportRevenueRealizationBaseValueReport);
router.get('/collection', authorize('owner', 'manager', 'staff'), getCollectionReport);
router.get('/collection/export', authorize('owner', 'manager', 'staff'), exportCollectionReport);
router.get('/cashflow-statement', authorize('owner', 'manager', 'staff'), getCashFlowStatementReport);
router.get('/cashflow-statement/export', authorize('owner', 'manager', 'staff'), exportCashFlowStatementReport);
router.get('/payment-mode', authorize('owner', 'manager', 'staff'), getPaymentModeReport);
router.get('/payment-mode/export', authorize('owner', 'manager', 'staff'), exportPaymentModeReport);
router.get('/backdated-bills', authorize('owner', 'manager', 'staff'), getBackdatedBillsReport);
router.get('/backdated-bills/export', authorize('owner', 'manager', 'staff'), exportBackdatedBillsReport);
router.get('/discount', authorize('owner', 'manager', 'staff'), getDiscountReport);
router.get('/discount/export', authorize('owner', 'manager', 'staff'), exportDiscountReport);
router.get('/effective-sales-accounting', authorize('owner', 'manager', 'accountant'), getEffectiveSalesAccountingReport);
router.get('/effective-sales-accounting/export', authorize('owner', 'manager', 'accountant'), exportEffectiveSalesAccountingReport);
router.get('/refund', authorize('owner', 'manager', 'staff'), getRefundReport);
router.get('/refund/export', authorize('owner', 'manager', 'staff'), exportRefundReport);

// Client Management Reports
router.get('/renewal-vs-attrition', authorize('owner', 'manager', 'staff'), getRenewalVsAttritionReport);
router.get('/renewal-vs-attrition/export', authorize('owner', 'manager', 'staff'), exportRenewalVsAttritionReport);
router.get('/renewal-vs-attrition/list', authorize('owner', 'manager', 'staff'), getRenewalVsAttritionList);
router.get('/upgrade', authorize('owner', 'manager', 'staff'), getUpgradeReport);
router.get('/upgrade/export', authorize('owner', 'manager', 'staff'), exportUpgradeReport);
router.get('/member-checkins', authorize('owner', 'manager', 'staff'), getMemberCheckinsReport);
router.get('/member-checkins/export', authorize('owner', 'manager', 'staff'), exportMemberCheckinsReport);
router.get('/multiclub-member-checkins', authorize('owner', 'manager', 'staff'), getMultiClubMemberCheckinsReport);
router.get('/multiclub-member-checkins/export', authorize('owner', 'manager', 'staff'), exportMultiClubMemberCheckinsReport);
router.get('/member-attendance-register', authorize('owner', 'manager', 'staff'), getMemberAttendanceRegisterReport);
router.get('/member-attendance-register/export', authorize('owner', 'manager', 'staff'), exportMemberAttendanceRegisterReport);
router.get('/new-clients', authorize('owner', 'manager', 'staff'), getNewClientsReport);
router.get('/new-clients/export', authorize('owner', 'manager', 'staff'), exportNewClientsReport);
router.get('/renewals', authorize('owner', 'manager', 'staff'), getRenewalsReport);
router.get('/renewals/export', authorize('owner', 'manager', 'staff'), exportRenewalsReport);
router.get('/membership', authorize('owner', 'manager', 'staff'), getMembershipReport);
router.get('/membership/export', authorize('owner', 'manager', 'staff'), exportMembershipReport);
router.get('/membership-expiry', authorize('owner', 'manager', 'staff'), getMembershipExpiryReport);
router.get('/membership-expiry/export', authorize('owner', 'manager', 'staff'), exportMembershipExpiryReport);
router.get('/irregular-members', authorize('owner', 'manager', 'staff'), getIrregularMembersReport);
router.get('/irregular-members/export', authorize('owner', 'manager', 'staff'), exportIrregularMembersReport);
router.get('/active-members', authorize('owner', 'manager', 'staff'), getActiveMembersReport);
router.get('/active-members/export', authorize('owner', 'manager', 'staff'), exportActiveMembersReport);
router.get('/inactive-members', authorize('owner', 'manager', 'staff'), getInactiveMembersReport);
router.get('/inactive-members/export', authorize('owner', 'manager', 'staff'), exportInactiveMembersReport);
router.get('/multiclub-clients', authorize('owner', 'manager', 'staff'), getMulticlubClientsReport);
router.get('/multiclub-clients/export', authorize('owner', 'manager', 'staff'), exportMulticlubClientsReport);
router.get('/archived-clients', authorize('owner', 'manager', 'staff'), getArchivedClientsReport);
router.get('/archived-clients/export', authorize('owner', 'manager', 'staff'), exportArchivedClientsReport);
router.get('/freeze-and-date-change', authorize('owner', 'manager', 'staff'), getFreezeAndDateChangeReport);
router.get('/freeze-and-date-change/export', authorize('owner', 'manager', 'staff'), exportFreezeAndDateChangeReport);
router.get('/suspensions', authorize('owner', 'manager', 'staff'), getSuspensionsReport);
router.get('/suspensions/export', authorize('owner', 'manager', 'staff'), exportSuspensionsReport);
router.get('/attendance-heat-map', authorize('owner', 'manager', 'staff'), getAttendanceHeatMapReport);
router.get('/attendance-heat-map/export', authorize('owner', 'manager', 'staff'), exportAttendanceHeatMapReport);
router.get('/service-transfer', authorize('owner', 'manager', 'staff'), getServiceTransferReport);
router.get('/service-transfer/export', authorize('owner', 'manager', 'staff'), exportServiceTransferReport);
router.get('/birthday', authorize('owner', 'manager', 'staff'), getBirthdayReport);
router.get('/birthday/export', authorize('owner', 'manager', 'staff'), exportBirthdayReport);
router.get('/client-attendance', authorize('owner', 'manager', 'staff'), getClientAttendanceReport);
router.get('/client-attendance/export', authorize('owner', 'manager', 'staff'), exportClientAttendanceReport);
router.get('/membership-retention', authorize('owner', 'manager', 'staff'), getMembershipRetentionReport);
router.get('/membership-retention/export', authorize('owner', 'manager', 'staff'), exportMembershipRetentionReport);
router.get('/cancellation', authorize('owner', 'manager', 'staff'), getCancellationReport);
router.get('/cancellation/export', authorize('owner', 'manager', 'staff'), exportCancellationReport);
router.get('/profile-change', authorize('owner', 'manager', 'staff'), getProfileChangeReport);
router.get('/profile-change/export', authorize('owner', 'manager', 'staff'), exportProfileChangeReport);
router.get('/one-time-purchaser', authorize('owner', 'manager', 'staff'), getOneTimePurchaserReport);
router.get('/one-time-purchaser/export', authorize('owner', 'manager', 'staff'), exportOneTimePurchaserReport);
router.get('/average-lifetime-value', authorize('owner', 'manager', 'staff'), getAverageLifetimeValueReport);
router.get('/average-lifetime-value/export', authorize('owner', 'manager', 'staff'), exportAverageLifetimeValueReport);

export default router;

