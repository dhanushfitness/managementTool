import api from './axios'

export const getClientManagementSettings = (branchId) => api.get(`/client-management/settings/${branchId}`)
export const updateUpgradeSettings = (branchId, payload) => api.put(`/client-management/settings/${branchId}/upgrade`, payload)
export const updateCrossSellSettings = (branchId, payload) => api.put(`/client-management/settings/${branchId}/cross-sell`, payload)
export const getExtensionSummary = (branchId) => api.get(`/client-management/settings/${branchId}/extension`)
export const applyMembershipExtension = (branchId, payload) => api.post(`/client-management/settings/${branchId}/extension`, payload)

