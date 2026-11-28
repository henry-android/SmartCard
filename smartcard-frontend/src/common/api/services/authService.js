import api from '../axiosConfigs'

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  signup: (payload) => api.post('/api/auth/signup', payload),
  current: () => api.get('/api/auth/current'),
  logout: () => api.post('/api/auth/logout'),
  updateProfile: (userId, payload) => api.put(`/api/users/profile?userId=${userId}`, payload),
}
