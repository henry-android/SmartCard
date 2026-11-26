import api from '../axiosConfigs'

export const examService = {
  getAll: () => api.get('/api/exams'),
  getMine: () => api.get('/api/exams/mine'),
  getById: (id) => api.get(`/api/exams/${id}`),
  getQuestions: (id) => api.get(`/api/exams/${id}/questions`),
  create: (exam) => api.post('/api/exams', exam),
  updateVisibility: (id, isPublic) => api.patch(`/api/exams/${id}/visibility`, { isPublic }),
  deleteExam: (id) => api.delete(`/api/exams/${id}`),
  previewCreateFromFile: (exam, file) => {
    const formData = new FormData()
    formData.append('title', exam.title)
    formData.append('description', exam.description || '')
    formData.append('duration', String(exam.duration))
    formData.append('isPublic', String(exam.isPublic))
    formData.append('file', file)
    return api.post('/api/exams/ai-import/preview', formData, {
      headers: { 'Content-Type': undefined },
    })
  },
  confirmCreateFromFile: (exam) => api.post('/api/exams/ai-import/confirm', exam),
  createAttempt: (examId) => api.post(`/api/exam-attempts/create?examId=${examId}`),
  submitAttempt: (attemptId, answers, remainingTime) => api.post(
    `/api/exam-attempts/submit?attemptId=${attemptId}&remainingTime=${remainingTime}`,
    answers,
  ),
  getAttemptResult: (attemptId) => api.get(`/api/exam-attempts/${attemptId}/result`),
  getMyHistory: (examId) => api.get(`/api/exam-attempts/history/by-exam/${examId}`),
  previewAiImport: (examId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/exams/${examId}/ai-import/preview`, formData, {
      headers: { 'Content-Type': undefined },
    })
  },
  confirmAiImport: (examId, questions) => api.post(`/api/exams/${examId}/ai-import/confirm`, questions),
}
