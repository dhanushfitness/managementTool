import api from './axios'

export const getInvoices = (params) => api.get('/invoices', { params })
export const getPaidInvoices = (params) => api.get('/invoices/paid', { params })
export const getPendingCollections = (params) => api.get('/invoices/pending-collections', { params })
export const getCancelledInvoices = (params) => api.get('/invoices/cancelled', { params })
export const getInvoice = (id) => api.get(`/invoices/${id}`)
export const createInvoice = (data) => api.post('/invoices', data)
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data)
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`)
export const exportInvoices = (params) => api.get('/invoices/export', { 
  params,
  responseType: 'blob'
})
export const exportPaidInvoices = (params) => api.get('/invoices/paid/export', { 
  params,
  responseType: 'blob'
})
export const exportPendingCollections = (params) => api.get('/invoices/pending-collections/export', { 
  params,
  responseType: 'blob'
})
export const exportCancelledInvoices = (params) => api.get('/invoices/cancelled/export', { 
  params,
  responseType: 'blob'
})

