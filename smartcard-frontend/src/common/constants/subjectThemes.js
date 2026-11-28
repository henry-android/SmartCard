const subjectGradients = {
  'Toán học': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  'Vật lý': 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
  'Hóa học': 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  'Sinh học': 'linear-gradient(135deg, #16a34a 0%, #65a30d 100%)',
  'Lịch sử': 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  'Địa lý': 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',
  'Văn học': 'linear-gradient(135deg, #db2777 0%, #9333ea 100%)',
  'Tiếng Anh': 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
  'Tiếng Việt': 'linear-gradient(135deg, #e11d48 0%, #f97316 100%)',
  'Công nghệ': 'linear-gradient(135deg, #667eea 0%, #7456ba 100%)',
  'Khác': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
}

export function getSubjectGradient(subject) {
  return subjectGradients[subject] || subjectGradients['Công nghệ']
}
