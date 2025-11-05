import api from './axios'

export const getDashboardStats = (params) => api.get('/dashboard/stats', { params }).then(res => res.data)
export const getQuickStats = () => api.get('/dashboard/quick-stats').then(res => res.data)
export const getRecentActivities = () => api.get('/dashboard/activities').then(res => res.data)
export const getUpcomingRenewals = (days = 7) => api.get('/dashboard/renewals', { params: { days } }).then(res => res.data)
export const getPendingPayments = () => api.get('/dashboard/pending-payments').then(res => res.data)
export const getAttendanceToday = () => api.get('/dashboard/attendance-today').then(res => res.data)

