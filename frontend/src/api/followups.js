import api from './axios';

export const getTaskboard = (params) => 
  api.get('/followups/taskboard', { params }).then(res => res.data);

export const getTaskboardStats = (params) => 
  api.get('/followups/taskboard/stats', { params }).then(res => res.data);

export const updateFollowUpStatus = (followUpId, callStatus) => 
  api.put(`/followups/taskboard/${followUpId}/status`, { callStatus }).then(res => res.data);

export const exportTaskboard = (params) => 
  api.get('/followups/taskboard/export', { params, responseType: 'blob' }).then(res => res.data);

