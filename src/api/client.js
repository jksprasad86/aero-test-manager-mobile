import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken, clearAll } from '../utils/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — clear session so navigator re-routes to Login
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await clearAll();
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me:    ()               => api.get('/auth/me'),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getMetrics:      () => api.get('/dashboard/metrics'),
  getAssigneeStats:() => api.get('/dashboard/assignee-stats'),
};

// ── Test Cases ───────────────────────────────────────────────────────────────
export const testCasesAPI = {
  getModules:        ()      => api.get('/testcases/modules'),
  getAll:            (params)=> api.get('/testcases', { params }),
  getOne:            (id)    => api.get(`/testcases/${id}`),
  create:            (data)  => api.post('/testcases', data),
  update:            (id, data) => api.put(`/testcases/${id}`, data),
};

// ── Daily Stats (Work Updates) ───────────────────────────────────────────────
export const dailyStatsAPI = {
  getEntries:   (params) => api.get('/dailystats', { params }),
  createEntry:  (data)   => api.post('/dailystats', data),
  updateEntry:  (id, data) => api.put(`/dailystats/${id}`, data),
};

// ── Admin config (lookup data set up by admin in the web app) ────────────────
export const adminAPI = {
  getTicketStatuses: () => api.get('/admin/ticket-statuses'),
  getPriorities:     () => api.get('/admin/priorities'),
  getTypes:          () => api.get('/admin/types'),
  getTags:           () => api.get('/admin/tags'),
  getProjects:       () => api.get('/admin/projects'),
};

export default api;
