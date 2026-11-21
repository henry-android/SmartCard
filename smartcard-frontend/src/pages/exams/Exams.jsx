import { useEffect, useState } from 'react'
import { examService } from '../../common/api/services/examService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function Exams() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState(null)
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [importing, setImporting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await examService.getAll()
      setExams(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const importExam = async (event) => {
    event.preventDefault()
    if (!selectedExam || !file) return

    setImporting(true)
    setMessage('')
    try {
      const { data } = await examService.aiImport(selectedExam.id, file)
      setMessage(data.message)
      setFile(null)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể import đề thi.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="container page">
      <div className="page-header">
        <div><p className="eyebrow dark">ĐÁNH GIÁ</p><h1>Bài kiểm tra</h1></div>
      </div>

      {loading ? <div className="empty">Đang tải đề thi...</div> : exams.length ? (
        <div className="deck-grid">
          {exams.map((exam) => (
            <article className="deck-card" key={exam.id}>
              <div className="deck-body">
                <h3>{exam.title}</h3>
                <p>{exam.description || 'Chưa có mô tả.'}</p>
                <div className="deck-meta">
                  <span>{exam.duration} phút</span>
                  <span>{exam.totalQuestions} câu</span>
                </div>
                {user && exam.createdBy === user.username && (
                  <button className="btn primary" type="button" onClick={() => {
                    setSelectedExam(exam)
                    setMessage('')
                    setFile(null)
                  }}>AI Import đề thi</button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty"><h3>Chưa có đề thi công khai</h3></div>}

      {selectedExam && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedExam(null)}>
          <form className="modal" onSubmit={importExam} onMouseDown={(event) => event.stopPropagation()}>
            <h2>AI Import: {selectedExam.title}</h2>
            <label>File đề thi (.pdf, .doc, .docx)
              <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
            </label>
            {message && <p>{message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setSelectedExam(null)}>Đóng</button>
              <button className="btn primary" disabled={importing}>{importing ? 'Đang phân tích...' : 'Import bằng AI'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
