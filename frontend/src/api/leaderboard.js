import api from './axios'

// Staff Leaderboard & Performance API

export const getRevenueLeaderboard = (params) => api.get('/leaderboard/revenue', { params })
export const getClosureCountLeaderboard = (params) => api.get('/leaderboard/closure-count', { params })
export const getContactsCreatedLeaderboard = (params) => api.get('/leaderboard/contacts-created', { params })
export const getCallLeaderboard = (params) => api.get('/leaderboard/calls', { params })
export const exportLeaderboard = (params) => api.get('/leaderboard/export', { params, responseType: 'blob' })

