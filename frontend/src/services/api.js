import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  requestPasswordReset: (data) => api.post('/auth/password-reset/request', data),
  confirmPasswordReset: (data) => api.post('/auth/password-reset/confirm', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: () => api.post('/auth/resend-verification'),
  checkPasswordStrength: (data) => api.post('/auth/check-password-strength', data)
};

// Trucks
export const trucksAPI = {
  getAll: () => api.get('/trucks'),
  getOne: (id) => api.get(`/trucks/${id}`),
  create: (data) => api.post('/trucks', data),
  update: (id, data) => api.put(`/trucks/${id}`, data),
  delete: (id) => api.delete(`/trucks/${id}`)
};

// Locations
export const locationsAPI = {
  getAll: (params) => api.get('/locations', { params }),
  getOne: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  bulkDelete: (ids) => api.delete('/locations/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/locations/bulk-update', { ids, data }),
  exportCSV: () => api.get('/locations/export/csv', { responseType: 'blob' }),
  exportPDF: () => api.get('/locations/export/pdf', { responseType: 'blob' }),
  getCalendar: (truckId, params) => api.get(`/locations/truck/${truckId}/calendar`, { params }),
  bookLocation: (truckId, data) => api.post(`/locations/truck/${truckId}/book`, data),
  updateBooking: (id, data) => api.put(`/locations/booking/${id}`, data),
  deleteBooking: (id) => api.delete(`/locations/booking/${id}`),
  getHistory: (truckId) => api.get(`/locations/truck/${truckId}/history`)
};

// Menus
export const menusAPI = {
  getByTruck: (truckId, params) => api.get(`/menus/truck/${truckId}`, { params }),
  getOne: (id) => api.get(`/menus/${id}`),
  create: (data) => api.post('/menus', data),
  update: (id, data) => api.put(`/menus/${id}`, data),
  delete: (id) => api.delete(`/menus/${id}`),
  getItems: (truckId) => api.get(`/menus/truck/${truckId}/items`),
  getPublicItems: (truckId) => api.get(`/menus/public/truck/${truckId}/items`),
  getSpecials: (truckId) => api.get(`/menus/truck/${truckId}/specials`),
  createCategory: (menuId, data) => api.post(`/menus/${menuId}/categories`, data),
  updateCategory: (id, data) => api.put(`/menus/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menus/categories/${id}`),
  createItem: (categoryId, data) => api.post(`/menus/categories/${categoryId}/items`, data),
  updateItem: (id, data) => api.put(`/menus/items/${id}`, data),
  toggleSoldOut: (id) => api.patch(`/menus/items/${id}/soldout`),
  deleteItem: (id) => api.delete(`/menus/items/${id}`),
  bulkDeleteItems: (ids) => api.delete('/menus/items/bulk-delete', { data: { ids } }),
  bulkUpdateItems: (ids, data) => api.patch('/menus/items/bulk-update', { ids, data }),
  exportCSV: (truckId) => api.get(`/menus/truck/${truckId}/export/csv`, { responseType: 'blob' }),
  exportPDF: (truckId) => api.get(`/menus/truck/${truckId}/export/pdf`, { responseType: 'blob' })
};

// Orders
export const ordersAPI = {
  getByTruck: (truckId, params) => api.get(`/orders/truck/${truckId}`, { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updatePayment: (id, data) => api.patch(`/orders/${id}/payment`, data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getQueue: (truckId) => api.get(`/orders/truck/${truckId}/queue`),
  getStats: (truckId) => api.get(`/orders/truck/${truckId}/stats/today`),
  // Pre-Order
  getPreOrderSlots: (truckId, params) => api.get(`/orders/truck/${truckId}/pre-order/slots`, { params }),
  generateSlots: (truckId, data) => api.post(`/orders/truck/${truckId}/pre-order/generate-slots`, data),
  getPreOrderSettings: (truckId) => api.get(`/orders/truck/${truckId}/pre-order/settings`),
  updatePreOrderSettings: (truckId, data) => api.put(`/orders/truck/${truckId}/pre-order/settings`, data),
  createPreOrder: (data) => api.post('/orders/public/pre-order', data),
  getPublicSlots: (truckId, params) => api.get(`/orders/public/truck/${truckId}/available-slots`, { params }),
  trackOrder: (orderNumber) => api.get(`/orders/public/order/${orderNumber}`),
  bulkDelete: (ids) => api.delete('/orders/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/orders/bulk-update', { ids, data }),
  exportCSV: (truckId) => api.get(`/orders/truck/${truckId}/export/csv`, { responseType: 'blob' }),
  exportPDF: (truckId) => api.get(`/orders/truck/${truckId}/export/pdf`, { responseType: 'blob' })
};

// Inventory
export const inventoryAPI = {
  getByTruck: (truckId, params) => api.get(`/inventory/truck/${truckId}`, { params }),
  getOne: (id) => api.get(`/inventory/item/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/item/${id}`, data),
  adjust: (id, data) => api.patch(`/inventory/item/${id}/adjust`, data),
  delete: (id) => api.delete(`/inventory/item/${id}`),
  getAlerts: (truckId) => api.get(`/inventory/truck/${truckId}/alerts`),
  getPrepLists: (truckId, params) => api.get(`/inventory/truck/${truckId}/prep`, { params }),
  createPrepList: (data) => api.post('/inventory/prep', data),
  updatePrepStatus: (id, status) => api.patch(`/inventory/prep/${id}/status`, { status }),
  togglePrepItem: (id, completedBy) => api.patch(`/inventory/prep/item/${id}/toggle`, { completedBy }),
  deletePrepList: (id) => api.delete(`/inventory/prep/${id}`),
  getSupplies: (truckId, params) => api.get(`/inventory/truck/${truckId}/supplies`, { params }),
  createSupply: (data) => api.post('/inventory/supplies', data),
  updateSupplyStatus: (id, status) => api.patch(`/inventory/supplies/${id}/status`, { status }),
  deleteSupply: (id) => api.delete(`/inventory/supplies/${id}`),
  recordWaste: (data) => api.post('/inventory/waste', data),
  getWaste: (truckId, params) => api.get(`/inventory/truck/${truckId}/waste`, { params }),
  bulkDelete: (ids) => api.delete('/inventory/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/inventory/bulk-update', { ids, data }),
  exportCSV: (truckId) => api.get(`/inventory/truck/${truckId}/export/csv`, { responseType: 'blob' }),
  exportPDF: (truckId) => api.get(`/inventory/truck/${truckId}/export/pdf`, { responseType: 'blob' })
};

// Social
export const socialAPI = {
  getByTruck: (truckId, params) => api.get(`/social/truck/${truckId}`, { params }),
  getOne: (id) => api.get(`/social/${id}`),
  create: (data) => api.post('/social', data),
  update: (id, data) => api.put(`/social/${id}`, data),
  publish: (id) => api.patch(`/social/${id}/publish`),
  delete: (id) => api.delete(`/social/${id}`),
  getScheduled: (truckId) => api.get(`/social/truck/${truckId}/scheduled`),
  getAnalytics: (truckId, params) => api.get(`/social/truck/${truckId}/analytics`, { params }),
  createLocationAnnouncement: (truckId, data) => api.post(`/social/truck/${truckId}/location-announcement`, data),
  createMenuPost: (truckId, data) => api.post(`/social/truck/${truckId}/menu-post`, data),
  // Templates
  getTemplates: (truckId) => api.get(`/social/truck/${truckId}/templates`),
  getTemplate: (id) => api.get(`/social/templates/${id}`),
  createTemplate: (truckId, data) => api.post(`/social/truck/${truckId}/templates`, data),
  updateTemplate: (id, data) => api.put(`/social/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/social/templates/${id}`),
  // Auto-Post Rules
  getAutoRules: (truckId) => api.get(`/social/truck/${truckId}/auto-rules`),
  createAutoRule: (truckId, data) => api.post(`/social/truck/${truckId}/auto-rules`, data),
  updateAutoRule: (id, data) => api.put(`/social/auto-rules/${id}`, data),
  deleteAutoRule: (id) => api.delete(`/social/auto-rules/${id}`),
  toggleAutoRule: (id) => api.patch(`/social/auto-rules/${id}/toggle`),
  // Social Accounts
  getAccounts: (truckId) => api.get(`/social/truck/${truckId}/accounts`),
  connectAccount: (platform, data) => api.post(`/social/accounts/connect/${platform}`, data),
  disconnectAccount: (id) => api.delete(`/social/accounts/${id}`),
  refreshAccountToken: (id) => api.post(`/social/accounts/${id}/refresh`),
  // Trigger
  triggerArrival: (truckId, data) => api.post(`/social/truck/${truckId}/trigger-arrival`, data),
  bulkDelete: (ids) => api.delete('/social/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/social/bulk-update', { ids, data }),
  exportCSV: (truckId) => api.get(`/social/truck/${truckId}/export/csv`, { responseType: 'blob' }),
  exportPDF: (truckId) => api.get(`/social/truck/${truckId}/export/pdf`, { responseType: 'blob' })
};

// Financial
export const financialAPI = {
  getSales: (truckId, params) => api.get(`/financial/truck/${truckId}/sales`, { params }),
  recordSales: (data) => api.post('/financial/sales', data),
  getSalesSummary: (truckId, period) => api.get(`/financial/truck/${truckId}/sales/summary`, { params: { period } }),
  getExpenses: (truckId, params) => api.get(`/financial/truck/${truckId}/expenses`, { params }),
  createExpense: (data) => api.post('/financial/expenses', data),
  updateExpense: (id, data) => api.put(`/financial/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/financial/expenses/${id}`),
  getExpensesByCategory: (truckId, params) => api.get(`/financial/truck/${truckId}/expenses/by-category`, { params }),
  getProfitByLocation: (truckId, params) => api.get(`/financial/truck/${truckId}/profit/by-location`, { params }),
  getSummary: (truckId, params) => api.get(`/financial/truck/${truckId}/summary`, { params }),
  // Analytics
  getLocationAnalytics: (truckId, params) => api.get(`/financial/truck/${truckId}/analytics/locations`, { params }),
  getLocationSummary: (truckId, locationId, params) => api.get(`/financial/truck/${truckId}/analytics/location/${locationId}`, { params }),
  compareLocations: (truckId, params) => api.get(`/financial/truck/${truckId}/analytics/compare`, { params }),
  getTopLocations: (truckId, params) => api.get(`/financial/truck/${truckId}/analytics/top-locations`, { params }),
  getTrends: (truckId, params) => api.get(`/financial/truck/${truckId}/analytics/trends`, { params }),
  getRevenuePerHour: (truckId, params) => api.get(`/financial/truck/${truckId}/metrics/revenue-per-hour`, { params }),
  getPeakHours: (truckId, params) => api.get(`/financial/truck/${truckId}/metrics/peak-hours`, { params }),
  // Goals
  getGoals: (truckId, params) => api.get(`/financial/truck/${truckId}/goals`, { params }),
  createGoal: (truckId, data) => api.post(`/financial/truck/${truckId}/goals`, data),
  updateGoal: (truckId, id, data) => api.put(`/financial/truck/${truckId}/goals/${id}`, data),
  deleteGoal: (truckId, id) => api.delete(`/financial/truck/${truckId}/goals/${id}`),
  getGoalProgress: (goalId) => api.get(`/financial/goals/${goalId}/progress`),
  bulkDeleteExpenses: (ids) => api.delete('/financial/expenses/bulk-delete', { data: { ids } }),
  bulkUpdateExpenses: (ids, data) => api.patch('/financial/expenses/bulk-update', { ids, data }),
  bulkDeleteSales: (ids) => api.delete('/financial/sales/bulk-delete', { data: { ids } }),
  exportSalesCSV: (truckId) => api.get(`/financial/truck/${truckId}/sales/export/csv`, { responseType: 'blob' }),
  exportSalesPDF: (truckId) => api.get(`/financial/truck/${truckId}/sales/export/pdf`, { responseType: 'blob' }),
  exportExpensesCSV: (truckId) => api.get(`/financial/truck/${truckId}/expenses/export/csv`, { responseType: 'blob' }),
  exportExpensesPDF: (truckId) => api.get(`/financial/truck/${truckId}/expenses/export/pdf`, { responseType: 'blob' })
};

// Events
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getRegistrations: (truckId, params) => api.get(`/events/truck/${truckId}/registrations`, { params }),
  register: (eventId, data) => api.post(`/events/${eventId}/register`, data),
  updateRegistration: (id, data) => api.patch(`/events/registration/${id}/status`, data),
  cancelRegistration: (id) => api.delete(`/events/registration/${id}`),
  getUpcoming: (truckId) => api.get(`/events/truck/${truckId}/upcoming`),
  // Booths
  getBooths: (eventId) => api.get(`/events/${eventId}/booths`),
  createBooth: (eventId, data) => api.post(`/events/${eventId}/booths`, data),
  createBoothsBulk: (eventId, data) => api.post(`/events/${eventId}/booths/bulk`, data),
  updateBooth: (id, data) => api.put(`/events/booths/${id}`, data),
  deleteBooth: (id) => api.delete(`/events/booths/${id}`),
  assignBooth: (registrationId, boothId) => api.patch(`/events/registration/${registrationId}/assign-booth`, { boothId }),
  // Timeline
  getTimeline: (eventId) => api.get(`/events/${eventId}/timeline`),
  getRegistrationTimeline: (registrationId) => api.get(`/events/registration/${registrationId}/timeline`),
  getTruckTimeline: (truckId) => api.get(`/events/truck/${truckId}/timeline`),
  createTimeline: (data) => api.post('/events/timeline', data),
  updateTimeline: (id, data) => api.patch(`/events/timeline/${id}`, data),
  deleteTimeline: (id) => api.delete(`/events/timeline/${id}`),
  // Calendar
  getCalendar: (params) => api.get('/events/calendar', { params }),
  // Payment
  updatePayment: (registrationId, data) => api.patch(`/events/registration/${registrationId}/payment`, data),
  bulkDelete: (ids) => api.delete('/events/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/events/bulk-update', { ids, data }),
  exportCSV: () => api.get('/events/export/csv', { responseType: 'blob' }),
  exportPDF: () => api.get('/events/export/pdf', { responseType: 'blob' })
};

// Permits
export const permitsAPI = {
  getByTruck: (truckId, params) => api.get(`/permits/truck/${truckId}`, { params }),
  getOne: (id) => api.get(`/permits/${id}`),
  create: (data) => api.post('/permits', data),
  update: (id, data) => api.put(`/permits/${id}`, data),
  delete: (id) => api.delete(`/permits/${id}`),
  getAlerts: (truckId) => api.get(`/permits/truck/${truckId}/alerts`),
  renew: (id, data) => api.post(`/permits/${id}/renew`, data),
  getSummary: (truckId) => api.get(`/permits/truck/${truckId}/summary`),
  bulkDelete: (ids) => api.delete('/permits/bulk-delete', { data: { ids } }),
  bulkUpdate: (ids, data) => api.patch('/permits/bulk-update', { ids, data }),
  exportCSV: (truckId) => api.get(`/permits/truck/${truckId}/export/csv`, { responseType: 'blob' }),
  exportPDF: (truckId) => api.get(`/permits/truck/${truckId}/export/pdf`, { responseType: 'blob' })
};

// AI
export const aiAPI = {
  getRecommendations: (truckId) => api.get(`/ai/truck/${truckId}/recommendations`),
  generateRecommendations: (truckId) => api.post(`/ai/truck/${truckId}/generate`),
  actionRecommendation: (id) => api.patch(`/ai/${id}/action`),
  getLocationSuggestions: (truckId, params) => api.get(`/ai/truck/${truckId}/location-suggest`, { params }),
  generatePost: (truckId, data) => api.post(`/ai/truck/${truckId}/generate-post`, data),
  getDemandForecast: (truckId, params) => api.get(`/ai/truck/${truckId}/demand-forecast`, { params }),
  getMenuInsights: (truckId) => api.get(`/ai/truck/${truckId}/menu-insights`),
  // Enhanced Demand Prediction
  getEnhancedForecast: (truckId, params) => api.get(`/ai/truck/${truckId}/demand-forecast/enhanced`, { params }),
  getDemandPatterns: (truckId, params) => api.get(`/ai/truck/${truckId}/demand-patterns`, { params }),
  generatePredictions: (truckId, data) => api.post(`/ai/truck/${truckId}/predictions/generate`, data),
  generateResponse: (truckId, data) => api.post(`/ai/truck/${truckId}/generate-response`, data)
};

// Dashboard
export const dashboardAPI = {
  getSummary: (truckId) => api.get(`/dashboard/truck/${truckId}/summary`),
  getQuickStats: (truckId) => api.get(`/dashboard/truck/${truckId}/quick-stats`),
  getActivity: (truckId) => api.get(`/dashboard/truck/${truckId}/activity`),
  getNotifications: () => api.get('/dashboard/notifications'),
  markNotificationRead: (id) => api.patch(`/dashboard/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/dashboard/notifications/read-all')
};

// GPS Location Broadcasting
export const gpsAPI = {
  updateLocation: (truckId, data) => api.post(`/gps/truck/${truckId}/location`, data),
  stopBroadcasting: (truckId) => api.delete(`/gps/truck/${truckId}/location`),
  getNearbyTrucks: (params) => api.get('/gps/nearby', { params }),
  getTruckLocation: (truckId) => api.get(`/gps/truck/${truckId}/current`),
  subscribe: (data) => api.post('/gps/subscribe', data),
  unsubscribe: (subscriptionId) => api.delete(`/gps/subscription/${subscriptionId}`)
};

export default api;
