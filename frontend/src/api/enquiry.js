import api from './axios'

// Enquiry/Lead Management API

export const getEnquiries = (params) => api.get('/enquiries', { params })
export const getEnquiry = (id) => api.get(`/enquiries/${id}`)
export const getEnquiryStats = () => api.get('/enquiries/stats')
export const createEnquiry = (data) => api.post('/enquiries', data)
export const updateEnquiry = (id, data) => api.put(`/enquiries/${id}`, data)
export const deleteEnquiry = (id) => api.delete(`/enquiries/${id}`)
export const convertToMember = (id, data) => api.post(`/enquiries/${id}/convert`, data)
export const archiveEnquiry = (id) => api.post(`/enquiries/${id}/archive`)
export const bulkArchive = (data) => api.post('/enquiries/bulk/archive', data)
export const bulkChangeStaff = (data) => api.post('/enquiries/bulk/staff-change', data)
export const addCallLog = (id, data) => api.post(`/enquiries/${id}/call-log`, data)
export const getEnquiryAppointments = (id) => api.get(`/enquiries/${id}/appointments`)
export const createEnquiryAppointment = (id, data) => api.post(`/enquiries/${id}/appointments`, data)
export const exportEnquiries = (params) => api.get('/enquiries/export', { params, responseType: 'blob' })
export const importEnquiries = (data) => api.post('/enquiries/import', data)

