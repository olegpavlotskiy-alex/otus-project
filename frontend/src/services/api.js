import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = async (email, password) => {
  const { data } = await api.post('/api/v1/auth/login', { email, password })
  return data
}

export const register = async (userData) => {
  const { data } = await api.post('/api/v1/auth/register', userData)
  return data
}

// ─── Categories ──────────────────────────────────────────────────────────────

export const getCategories = async () => {
  const { data } = await api.get('/api/v1/categories')
  return data
}

export const createCategory = async (categoryData) => {
  const { data } = await api.post('/api/v1/categories', categoryData)
  return data
}

export const updateCategory = async (id, categoryData) => {
  const { data } = await api.put(`/api/v1/categories/${id}`, categoryData)
  return data
}

export const deleteCategory = async (id) => {
  const { data } = await api.delete(`/api/v1/categories/${id}`)
  return data
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export const getTransactions = async (params = {}) => {
  const { data } = await api.get('/api/v1/transactions', { params })
  return data
}

export const createTransaction = async (transactionData) => {
  const { data } = await api.post('/api/v1/transactions', transactionData)
  return data
}

export const updateTransaction = async (id, transactionData) => {
  const { data } = await api.put(`/api/v1/transactions/${id}`, transactionData)
  return data
}

export const deleteTransaction = async (id) => {
  const { data } = await api.delete(`/api/v1/transactions/${id}`)
  return data
}

export const importTransactions = async (file, mapping) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapping', JSON.stringify(mapping))
  const { data } = await api.post('/api/v1/transactions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const exportTransactions = async (params = {}) => {
  const response = await api.get('/api/v1/transactions/export', {
    params,
    responseType: 'blob',
  })
  return response
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export const getBudgets = async (params = {}) => {
  const { data } = await api.get('/api/v1/budgets', { params })
  return data
}

export const createBudget = async (budgetData) => {
  const { data } = await api.post('/api/v1/budgets', budgetData)
  return data
}

export const updateBudget = async (id, budgetData) => {
  const { data } = await api.put(`/api/v1/budgets/${id}`, budgetData)
  return data
}

export const deleteBudget = async (id) => {
  const { data } = await api.delete(`/api/v1/budgets/${id}`)
  return data
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export const getRecurring = async () => {
  const { data } = await api.get('/api/v1/recurring')
  return data
}

export const createRecurring = async (recurringData) => {
  const { data } = await api.post('/api/v1/recurring', recurringData)
  return data
}

export const updateRecurring = async (id, recurringData) => {
  const { data } = await api.put(`/api/v1/recurring/${id}`, recurringData)
  return data
}

export const deleteRecurring = async (id) => {
  const { data } = await api.delete(`/api/v1/recurring/${id}`)
  return data
}

export const processRecurring = async () => {
  const { data } = await api.post('/api/v1/recurring/process')
  return data
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardSummary = async () => {
  const { data } = await api.get('/api/v1/dashboard/summary')
  return data
}

export const getExpensesByCategory = async () => {
  const { data } = await api.get('/api/v1/dashboard/expenses-by-category')
  return data
}

export const getMonthlyTrend = async (months = 6) => {
  const { data } = await api.get('/api/v1/dashboard/monthly-trend', {
    params: { months },
  })
  return data
}

export const getTopCategories = async () => {
  const { data } = await api.get('/api/v1/dashboard/top-categories')
  return data
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const getAuditLog = async (params = {}) => {
  const { data } = await api.get('/api/v1/audit-log', { params })
  return data
}

export default api
