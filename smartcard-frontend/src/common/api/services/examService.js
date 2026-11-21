import api from '../axiosConfigs'

export const examService = {
  getAll: () => api.get('/api/exams'),
  getById: (id) => api.get(`/api/exams/${id}`),
  aiImport: (examId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/exams/${examId}/ai-import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
