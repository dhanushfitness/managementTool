import api from './axios'

export const getMembers = (params) => api.get('/members', { params })
export const getMember = (id) => api.get(`/members/${id}`)
export const createMember = (data) => api.post('/members', data)
export const updateMember = (id, data) => api.put(`/members/${id}`, data)
export const deleteMember = (id) => api.delete(`/members/${id}`)
export const enrollMember = (id, data) => api.post(`/members/${id}/enroll`, data)
export const renewMembership = (id, data) => api.post(`/members/${id}/renew`, data)
export const searchMembers = (query) => api.get('/members/search', { params: { q: query } })

