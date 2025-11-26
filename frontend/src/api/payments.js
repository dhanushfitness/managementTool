import api from './axios'

export const getPayments = (params) => api.get('/payments', { params })
export const getReceipts = (params) => api.get('/payments/receipts', { params })
export const exportReceipts = (params) => api.get('/payments/receipts/export', { 
  params,
  responseType: 'blob'
})
export const getPayment = (id) => api.get(`/payments/${id}`)
export const createPayment = (data) => api.post('/payments', data)
export const createRazorpayOrder = (invoiceId) => api.post('/payments/razorpay/order', { invoiceId })
export const processRazorpayPayment = (data) => api.post('/payments/razorpay', data)
export const createPaymentLink = (invoiceId) => api.post('/payments/payment-link', { invoiceId })
export const sendPaymentLinkViaSMS = (invoiceId, provider) => api.post('/payments/send-sms', { invoiceId, provider })
export const refundPayment = (id, data) => api.post(`/payments/${id}/refund`, data)
export const sendInvoiceEmail = (invoiceId) => api.post(`/invoices/${invoiceId}/send-email`)

