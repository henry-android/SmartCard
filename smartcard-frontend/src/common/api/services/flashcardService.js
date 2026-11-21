import api from '../axiosConfigs'

export const flashcardService = {
  getAll: () => api.get('/api/flashcards'),
  getById: (id) => api.get(`/api/flashcards/${id}`),
  getByDeck: (deckId) => api.get(`/api/flashcards/by-deck/${deckId}`),
  create: (flashcard, deckId) => api.post(`/api/flashcards${deckId ? `?deckId=${deckId}` : ''}`, flashcard),
  delete: (id) => api.delete(`/api/flashcards/${id}`),
}
