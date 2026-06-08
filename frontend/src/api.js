import axios from 'axios';

const api = axios.create({ 
  baseURL: 'https://amc-manager-production.up.railway.app/api'
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('amc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('amc_token');
      localStorage.removeItem('amc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;