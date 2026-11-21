import api from '../axiosConfigs'

export const deckService = {
  getAll: () => api.get('/api/decks'),
  getById: (id) => api.get(`/api/decks/${id}`),
  create: (deck) => api.post('/api/decks', deck),
  update: (id, deck) => api.put(`/api/decks/${id}`, deck),
  delete: (id) => api.delete(`/api/decks/${id}`),
}
