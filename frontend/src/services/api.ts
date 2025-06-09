import axios from 'axios';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = VITE_API_BASE_URL || 'http://localhost:3000/api';

console.log('API Base URL used by frontend:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const shipmentAPI = {
  getAll: (params?: any) => api.get('/shipments', { params }),
  getById: (id: string) => api.get(`/shipments/${id}`),
  create: (data: any) => api.post('/shipments', data),
  update: (id: string, data: any) => api.put(`/shipments/${id}`, data),
  delete: (id: string) => api.delete(`/shipments/${id}`),
  addCheckIn: (id: string, data: any) => api.post(`/shipments/${id}/checkins`, data),
  generateEmail: (id: string) => api.post(`/shipments/${id}/generate-email`),
  updateTags: (id: string, tags: string[]) => api.patch(`/shipments/${id}/tags`, { tags }),
};

export const carrierAPI = {
  getAll: (params?: any) => api.get('/carriers', { params }),
  getById: (id: string) => api.get(`/carriers/${id}`),
  create: (data: any) => api.post('/carriers', data),
  update: (id: string, data: any) => api.put(`/carriers/${id}`, data),
  delete: (id: string) => api.delete(`/carriers/${id}`),
  updateSaferData: (id: string) => api.post(`/carriers/${id}/safer-update`),
};

export const shipperAPI = {
  getAll: (params?: any) => api.get('/shippers', { params }),
  getById: (id: string) => api.get(`/shippers/${id}`),
  create: (data: any) => api.post('/shippers', data),
  update: (id: string, data: any) => api.put(`/shippers/${id}`, data),
  delete: (id: string) => api.delete(`/shippers/${id}`),
};

export const documentAPI = {
  getAll: (params?: any) => api.get('/documents', { params }),
  upload: (formData: FormData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  download: (id: string) => `${API_BASE_URL}/documents/download/${id}`,
  delete: (id: string) => api.delete(`/documents/${id}`),
  updateTags: (id: string, tags: string[]) => api.patch(`/documents/${id}/tags`, { tags }),
};

export const financialAPI = {
  getReports: (params?: any) => api.get('/financials/reports', { params }),
};

export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getRevenueProfitTrends: () => api.get('/dashboard/revenue-profit-trends'),
  getShipmentStatusDistribution: () => api.get('/dashboard/shipment-status-distribution'),
};

export const lookupAPI = {
  getEquipmentTypes: (params?: any) => api.get('/lookups/equipment-types', { params }),
  getAccessorialTypes: (params?: any) => api.get('/lookups/accessorial-types', { params }),
  getModeOfTransportOptions: () => api.get('/lookups/modes-of-transport'),
  getStatusOptions: () => api.get('/lookups/status-options'),
}; // <<<--- THIS WAS THE MISSING COMMA

// --- Settings API ---
export const settingsAPI = {
  getQuoteFormSettings: () => api.get('/settings/quoteform'),
  updateQuoteFormSettings: (data: any) => api.put('/settings/quoteform', data),
  getShipmentFormSettings: () => api.get('/settings/shipmentform'),
  updateShipmentFormSettings: (data: any) => api.put('/settings/shipmentform', data),
};

export const laneRateAPI = {
  getLaneRateSummary: (params?: any) => api.get('/lanerates/summary', { params }),
  getLaneRateDetail: (params: any) => api.get('/lanerates/detail', { params }),
  getLaneRatesByCarrier: (carrierId: string, params?: any) => api.get(`/lanerates/carrier/${carrierId}`, { params }),
  createManual: (data: any) => api.post('/lanerates/manual', data),
  updateManual: (id: string, data: any) => api.put(`/lanerates/manual/${id}`, data),
  deleteLaneRate: (laneRateId: string) => api.delete(`/lanerates/${laneRateId}`),
};

export const accessorialTypeAPI = {
  getAll: (params?: any) => api.get('/accessorial-types', { params }),
  getById: (id: string) => api.get(`/accessorial-types/${id}`),
  create: (data: any) => api.post('/accessorial-types', data),
  update: (id: string, data: any) => api.put(`/accessorial-types/${id}`, data),
  delete: (id: string) => api.delete(`/accessorial-types/${id}`),
};

// --- THIS IS THE NEW API OBJECT FOR EQUIPMENT TYPES ---
export const equipmentTypeAPI = {
  getAll: (params?: any) => api.get('/equipment-types', { params }),
  create: (data: any) => api.post('/equipment-types', data),
  update: (id: string, data: any) => api.put(`/equipment-types/${id}`, data),
  delete: (id: string) => api.delete(`/equipment-types/${id}`),
  getById: (id: string) => api.get(`/equipment-types/${id}`),
};

export default api;