import axios from './axios';

export const getBranches = async () => {
  const response = await axios.get('/organizations/branches');
  return response.data;
};

export const getBranch = async (branchId) => {
  const response = await axios.get(`/organizations/branches/${branchId}`);
  return response.data;
};

export const createBranch = async (branchData) => {
  const response = await axios.post('/organizations/branches', branchData);
  return response.data;
};

export const updateBranch = async (branchId, branchData) => {
  const response = await axios.put(`/organizations/branches/${branchId}`, branchData);
  return response.data;
};

export const deleteBranch = async (branchId) => {
  const response = await axios.delete(`/organizations/branches/${branchId}`);
  return response.data;
};

