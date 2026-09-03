const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://flexpay-production-348e.up.railway.app';

const getAdminToken = () => localStorage.getItem('admin-token');

const apiFetch = async (endpoint, options = {}) => {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const result = await response.json();
  // Unwrap the data property from the API response
  return result.data || result;
};

export const adminApi = {
  // Overview
  getOverview: () => apiFetch('/api/admin/overview'),

  // Users
  listUsers: (search = '', limit = 50, offset = 0, status = '') =>
    apiFetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}&status=${encodeURIComponent(status)}`),
  
  getUserDetail: (userId) => apiFetch(`/api/admin/users/${userId}`),
  
  suspendUser: (userId) => apiFetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' }),
  
  reactivateUser: (userId) => apiFetch(`/api/admin/users/${userId}/reactivate`, { method: 'POST' }),
  
  adjustBalance: (userId, amount, reason) =>
    apiFetch(`/api/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    }),

  // Withdrawals
  listWithdrawals: (status = 'pending', limit = 50, offset = 0) =>
    apiFetch(`/api/admin/withdrawals?status=${status}&limit=${limit}&offset=${offset}`),
  
  approveWithdrawal: (withdrawalId) =>
    apiFetch(`/api/admin/withdrawals/${withdrawalId}/approve`, { method: 'POST' }),
  
  rejectWithdrawal: (withdrawalId, reason) =>
    apiFetch(`/api/admin/withdrawals/${withdrawalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  listTopups: (status = 'pending', limit = 50, offset = 0) =>
    apiFetch(`/api/admin/topups?status=${status}&limit=${limit}&offset=${offset}`),
  listPendingTransactions: () => apiFetch('/api/admin/transactions/pending'),
  approveTransaction: (transactionId) => apiFetch(`/api/admin/transactions/${transactionId}/approve`, { method: 'POST' }),
  rejectTransaction: (transactionId, reason) => apiFetch(`/api/admin/transactions/${transactionId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  fetchTransactionReceipt: async (transactionId) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/transactions/${transactionId}/receipt`, {
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    })
    if (!response.ok) throw new Error('Receipt could not be loaded for this transaction.')
    const blob = await response.blob()
    return { url: URL.createObjectURL(blob), type: blob.type }
  },
  approveTopup: (receiptId) =>
    apiFetch(`/api/admin/topups/${receiptId}/approve`, { method: 'POST' }),
  rejectTopup: (receiptId, reason) =>
    apiFetch(`/api/admin/topups/${receiptId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  receiptUrl: (receiptId) => `${API_BASE_URL}/api/admin/topups/${receiptId}/receipt`,
  fetchReceipt: async (receiptId) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/topups/${receiptId}/receipt`, {
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    })
    if (!response.ok) throw new Error('Receipt could not be loaded.')
    const blob = await response.blob()
    return { url: URL.createObjectURL(blob), type: blob.type }
  },

  // Tasks
  listTasks: () => apiFetch('/api/admin/tasks'),
  
  createTask: (title, description, rewardNaira) =>
    apiFetch('/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, rewardNaira }),
    }),
  
  updateTask: (taskId, title, description, rewardNaira, isActive) =>
    apiFetch(`/api/admin/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, rewardNaira, isActive }),
    }),
  
  deleteTask: (taskId) =>
    apiFetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' }),

  // Achievements
  listAchievements: () => apiFetch('/api/admin/achievements'),
  
  createAchievement: (code, title, description, icon) =>
    apiFetch('/api/admin/achievements', {
      method: 'POST',
      body: JSON.stringify({ code, title, description, icon }),
    }),
};
