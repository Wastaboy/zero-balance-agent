import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export const evaluateFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/evaluate', form)
}

export const getReport = (batchId, params = {}) =>
  api.get(`/report/${batchId}`, { params })

export const getSummary = (batchId) =>
  api.get(`/report/${batchId}/summary`)

export const getExportUrl = (batchId) =>
  `${api.defaults.baseURL}/export/${batchId}`

export const getRim = (rimNumber) =>
  api.get(`/rim/${rimNumber}`)

export const getConfig = () => api.get('/config')

export const updateConfig = (config) => api.put('/config', config)

export const postOverride = (payload) => api.post('/override', payload)
