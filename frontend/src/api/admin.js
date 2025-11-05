import axios from './axios';

export const getAdminProfile = async () => {
  const response = await axios.get('/admin/profile');
  return response.data;
};

export const updateAdminProfile = async (profileData) => {
  const response = await axios.put('/admin/profile', profileData);
  return response.data;
};

export const changePassword = async (passwordData) => {
  const response = await axios.put('/auth/change-password', passwordData);
  return response.data;
};

export const getAccountPlan = async () => {
  const response = await axios.get('/admin/account-plan');
  return response.data;
};

