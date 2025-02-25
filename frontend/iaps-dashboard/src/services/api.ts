import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getProductPerformance = (category?: string) => 
  api.get('/analytics/products/performance', { params: { category } });
export const getStorePerformance = (region?: string) => 
  api.get('/analytics/stores/performance', { params: { region } });
export const getRegionalTrends = () => api.get('/analytics/regional/trends');
export const getProductPredictions = (productId: number) => 
  api.get(`/analytics/products/${productId}/predictions`);

// New trend analysis endpoints
export const getTrendAnalysis = (timeRange: string, params?: {
  start_date?: string;
  end_date?: string;
  category?: string;
  store_id?: number;
  product_id?: number;
}) => api.get('/analytics/trends', { params: { time_range: timeRange, ...params } });

export const getDailySummary = (params?: {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  product_id?: number;
}) => api.get('/analytics/trends/daily-summary', { params });

// Products
export const getProducts = (params?: { 
  category?: string; 
  search?: string;
  skip?: number;
  limit?: number;
}) => api.get('/products', { params });
export const createProduct = (data: any) => api.post('/products', data);
export const updateProduct = (id: number, data: any) => api.put(`/products/${id}`, data);
export const deleteProduct = (id: number) => api.delete(`/products/${id}`);

// Stores
export const getStores = (params?: {
  region?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) => api.get('/stores', { params });
export const createStore = (data: any) => api.post('/stores', data);
export const updateStore = (id: number, data: any) => api.put(`/stores/${id}`, data);
export const deleteStore = (id: number) => api.delete(`/stores/${id}`);
export const getStoreStats = (id: number) => api.get(`/stores/${id}/stats`);

// Inventory
interface InventoryFilters {
  store_id?: number;
  product_id?: number;
  low_stock?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export const getInventory = async (filters: InventoryFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.store_id) params.append('store_id', filters.store_id.toString());
  if (filters.product_id) params.append('product_id', filters.product_id.toString());
  if (filters.low_stock) params.append('low_stock', 'true');
  if (filters.search) params.append('search', filters.search);
  if (filters.skip) params.append('skip', filters.skip.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await axios.get(`${API_BASE_URL}/inventory?${params.toString()}`);
  return response;
};

export const createInventory = async (data: any) => {
  const response = await axios.post(`${API_BASE_URL}/inventory`, data);
  return response;
};

export const updateInventory = async (id: number, data: any) => {
  const response = await axios.put(`${API_BASE_URL}/inventory/${id}`, data);
  return response;
};

export const deleteInventory = async (id: number) => {
  const response = await axios.delete(`${API_BASE_URL}/inventory/${id}`);
  return response;
};

export const restockInventory = async (id: number, quantity: number) => {
  const response = await axios.post(`${API_BASE_URL}/inventory/${id}/restock`, { quantity });
  return response;
};

// Purchase Orders
interface PurchaseOrderFilters {
  store_id?: number;
  status?: string;
  skip?: number;
  limit?: number;
}

export const getPurchaseOrders = (filters: PurchaseOrderFilters = {}) =>
  api.get('/purchase-orders', { params: filters });

export const getPurchaseOrder = (id: number) =>
  api.get(`/purchase-orders/${id}`);

export const createPurchaseOrder = (data: {
  store_id: number;
  items: Array<{ product_id: number; quantity: number; }>;
}) => api.post('/purchase-orders', data);

export const updatePurchaseOrderStatus = (id: number, status: string) =>
  api.put(`/purchase-orders/${id}`, { status });

export const calculateReorder = (data: {
  days_of_sales: number;
  store_id?: number;
  product_id?: number;
}) => api.post('/purchase-orders/calculate-reorder', data);

export default api; 