import axios from './axios';

export const getRevenueData = async (params) => {
  const response = await axios.get('/central-panel/revenue', { params });
  return response.data;
};

export const getLeadManagementData = async (params) => {
  const response = await axios.get('/central-panel/lead-management', { params });
  return response.data;
};

export const getClientsData = async (params) => {
  const response = await axios.get('/central-panel/clients', { params });
  return response.data;
};

export const getCheckInsData = async (params) => {
  const response = await axios.get('/central-panel/check-ins', { params });
  return response.data;
};

export const getFilterOptions = async () => {
  const response = await axios.get('/central-panel/filter-options');
  return response.data;
};
