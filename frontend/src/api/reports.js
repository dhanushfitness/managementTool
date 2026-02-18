import api from './axios'

export const getServiceSalesReport = (params) => api.get('/reports/service-sales', { params })
export const exportServiceSalesReport = (params) => api.get('/reports/service-sales/export', { 
  params,
  responseType: 'blob'
})
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
export const getBirthdayReport = (params) => api.get('/reports/birthday', { params })
export const exportBirthdayReport = (params) => api.get('/reports/birthday/export', {
  params,
  responseType: 'blob'
})
export const getStaffBirthdayReport = (params) => api.get('/reports/staff/birthday', { params })
export const exportStaffBirthdayReport = (params) => api.get('/reports/staff/birthday/export', {
  params,
  responseType: 'blob'
})
export const getServiceExpiryReport = (params) => api.get('/reports/service-expiry', { params })
export const exportServiceExpiryReport = (params) =>
  api.get('/reports/service-expiry/export', {
    params,
    responseType: 'blob'
  })

