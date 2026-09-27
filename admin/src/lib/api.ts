import axios from 'axios';

export interface Trip {
  id: string;
  route_id: string;
  vehicle_id: string;
  driver_id: string | null;
  trip_type: string;
  status: string;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  students_count: number;
  distance_km: number;
  notes: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', { email: credentials.username, password: credentials.password, tenant_id: 'default' }),
  me: () => api.get('/auth/me'),
  update: (data: any) => api.put('/auth/me', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const vehiclesAPI = {
  list: (params?: any) => api.get('/vehicles', { params }),
  get: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  location: (id: string) => api.get(`/gps/vehicle/${id}`),
  history: (id: string, params?: any) => api.get(`/gps/vehicle/${id}/history`, { params }),
  maintenance: (id: string) => api.get(`/vehicles/${id}/maintenance`),
};

export const driversAPI = {
  list: (params?: any) => api.get('/drivers', { params }),
  get: (id: string) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
  routes: (id: string) => api.get(`/drivers/${id}/routes`),
  attendance: (id: string, params?: any) => api.get(`/drivers/${id}/attendance`, { params }),
};

export const routesAPI = {
  list: (params?: any) => api.get('/routes', { params }),
  get: (id: string) => api.get(`/routes/${id}`),
  create: (data: any) => api.post('/routes', data),
  update: (id: string, data: any) => api.put(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
  stops: (id: string) => api.get(`/routes/${id}/stops`),
  optimize: (id: string) => api.post(`/routes/${id}/optimize`),
};

export const stopsAPI = {
  list: (params?: any) => api.get('/stops', { params }),
  get: (id: string) => api.get(`/stops/${id}`),
  create: (data: any) => api.post('/stops', data),
  update: (id: string, data: any) => api.put(`/stops/${id}`, data),
  delete: (id: string) => api.delete(`/stops/${id}`),
};

export const studentsAPI = {
  list: (params?: any) => api.get('/students', { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const attendanceAPI = {
  list: (params?: any) => api.get('/attendance/daily', { params: { date: params?.date || params?.attendance_date } }),
  daily: (params?: any) => api.get('/attendance/daily', { params: { date: params?.date || params?.attendance_date } }),
  create: (data: any) => api.post('/attendance', data),
  bulk: (data: any) => api.post('/attendance/bulk', data),
};

export const tripsAPI = {
  list: (params?: any) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  start: (id: string) => api.post(`/trips/${id}/start`),
  complete: (id: string, data?: any) => api.post(`/trips/${id}/complete`, data),
};

export const alertsAPI = {
  list: (params?: any) => api.get('/alerts', { params }),
  get: (id: string) => api.get(`/alerts/${id}`),
  create: (data: any) => api.post('/alerts', data),
  markRead: (id: string) => api.post(`/alerts/${id}/read`),
  resolve: (id: string, data?: any) => api.post(`/alerts/${id}/resolve`, data),
};

export const gpsAPI = {
  latest: (params?: any) => api.get('/gps/active', { params }),
  vehicle: (id: string) => api.get(`/gps/vehicle/${id}`),
  history: (id: string, params?: any) => api.get(`/gps/vehicle/${id}/history`, { params }),
};

export const aiAPI = {
  chat: (data: any) => api.post('/ai/chat', data),
  insights: () => api.get('/ai/insights'),
  optimizeRoute: (data: any) => api.post('/ai/optimize-route', data),
  eta: (data: any) => api.post('/ai/eta', data),
};

export const reportsAPI = {
  list: (params?: any) => api.get('/reports', { params }),
  generate: (data: any) => api.post('/reports', data),
  get: (id: string) => api.get(`/reports/${id}`),
};

export const notificationsAPI = {
  list: (params?: any) => api.get('/notifications', { params }),
  send: (data: any) => api.post('/notifications', data),
};

export const maintenanceAPI = {
  upcoming: (params?: any) => api.get('/maintenance/upcoming', { params }),
  schedule: (data: any) => api.post('/maintenance/schedule', data),
};

export default api;
