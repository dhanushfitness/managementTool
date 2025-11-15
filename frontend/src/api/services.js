import api from './axios'

export const fetchServices = () => api.get('/services')

export const createService = (payload) => api.post('/services', payload)

export const updateService = (serviceId, payload) => api.put(`/services/${serviceId}`, payload)

export const toggleServiceStatus = (serviceId) => api.patch(`/services/${serviceId}/status`)

export const deleteService = (serviceId) => api.delete(`/services/${serviceId}`)

export const createVariation = (serviceId, payload) => api.post(`/services/${serviceId}/variations`, payload)

export const updateVariation = (serviceId, variationId, payload) =>
  api.put(`/services/${serviceId}/variations/${variationId}`, payload)

export const toggleVariationStatus = (serviceId, variationId) =>
  api.patch(`/services/${serviceId}/variations/${variationId}/status`)

export const deleteVariation = (serviceId, variationId) =>
  api.delete(`/services/${serviceId}/variations/${variationId}`)


