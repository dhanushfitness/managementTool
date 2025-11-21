import api from './axios'

// Marketing & Communication API

// Communication
export const sendEmail = (data) => api.post('/marketing/communication/email', data)
export const sendSMS = (data) => api.post('/marketing/communication/sms', data)
export const sendWhatsApp = (data) => api.post('/marketing/communication/whatsapp', data)
export const getCommunications = (params) => api.get('/marketing/communications', { params })

// Offers & Engagement
export const createOffer = (data) => api.post('/marketing/engagement/offers', data)
export const getOffers = (params) => api.get('/marketing/engagement/offers', { params })
export const updateOffer = (id, data) => api.put(`/marketing/engagement/offers/${id}`, data)
export const deleteOffer = (id) => api.delete(`/marketing/engagement/offers/${id}`)

