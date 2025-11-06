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

