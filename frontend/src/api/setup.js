import api from './axios'

export const fetchSetupChecklist = () => api.get('/setup-checklist')

export const updateSetupTaskStatus = (taskKey, status) =>
  api.patch(`/setup-checklist/${taskKey}`, { status })


