import axios from 'axios';

const API_ROOT =
  import.meta.env.VITE_API_URL ||
  'https://amc-manager-production.up.railway.app';

const api = axios.create({
  baseURL: `${API_ROOT.replace(/\/$/, '')}/api`
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('amc_token');

  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  return cfg;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('amc_token');
      localStorage.removeItem('amc_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;