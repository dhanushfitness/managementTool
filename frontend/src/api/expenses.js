import api from './axios'

// Expense Management API

export const getExpenses = (params) => api.get('/expenses', { params })
export const getExpense = (id) => api.get(`/expenses/${id}`)
export const createExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)
export const approveExpense = (id, data) => api.post(`/expenses/${id}/approve`, data)

