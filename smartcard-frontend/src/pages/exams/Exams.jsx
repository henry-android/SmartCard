import { useEffect, useRef, useState } from 'react'
import { examService } from '../../common/api/services/examService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function Exams() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState(null)
  const [file, setFile] = useState(null)
  const [createFile, setCreateFile] = useState(null)
  const [viewingExam, setViewingExam] = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [questionsNotice, setQuestionsNotice] = useState('')
  const [takingExam, setTakingExam] = useState(null)
  const [examAnswers, setExamAnswers] = useState({})
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    duration: 30,
    isPublic: true,
  })
  const autoSubmitTriggered = useRef(false)

  const load = async () => {
    setLoading(true)
    try {
      const [publicResponse, mineResponse] = await Promise.all([
        examService.getAll(),
        user ? examService.getMine().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ])
      const publicExams = Array.isArray(publicResponse.data) ? publicResponse.data : []
      const mineExams = Array.isArray(mineResponse.data) ? mineResponse.data : []
      const merged = new Map()
      publicExams.forEach((exam) => merged.set(exam.id, exam))
      mineExams.forEach((exam) => merged.set(exam.id, exam))
      setExams([...merged.values()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  const createExam = async (event) => {
    event.preventDefault()
    setMessage('')
    setCreating(true)
    try {
      const examData = {
        ...examForm,
        duration: Number(examForm.duration),
      }
      const { data } = createFile
        ? await examService.createFromFile(examData, createFile)
        : await examService.create(examData)
      setShowCreate(false)
      setExamForm({ title: '', description: '', duration: 30, isPublic: true })
      setCreateFile(null)
      await load()
      if (createFile) {
        await viewQuestions(data.exam)
        setQuestionsNotice(data.message)
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể tạo đề thi.')
    } finally {
      setCreating(false)
    }
  }

  const importExam = async (event) => {
    event.preventDefault()
    if (!selectedExam || !file) return

    setImporting(true)
    setMessage('')
    try {
      const { data } = await examService.aiImport(selectedExam.id, file)
      setMessage(data.message)
      setFile(null)
      setSelectedExam((current) => current
        ? { ...current, totalQuestions: (current.totalQuestions || 0) + data.importedCount }
        : current)
      await load()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể import đề thi.')
    } finally {
      setImporting(false)
    }
  }

  const viewQuestions = async (exam) => {
    setViewingExam(exam)
    setExamQuestions([])
    setQuestionsError('')
    setQuestionsNotice('')
    setLoadingQuestions(true)
    try {
      const { data } = await examService.getQuestions(exam.id)
      setExamQuestions(Array.isArray(data) ? data : [])
    } catch (error) {
      setQuestionsError(error.response?.data?.message || 'Không thể tải câu hỏi của đề thi.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const startExam = async (exam) => {
    setMessage('')
    try {
      const { data } = await examService.createAttempt(exam.id)
      setTakingExam(data)
      setExamAnswers({})
      setActiveQuestionIndex(0)
      setRemainingSeconds(data.duration * 60)
      setSubmissionResult(null)
      setSubmissionError('')
      setSubmitting(false)
      autoSubmitTriggered.current = false
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể bắt đầu bài kiểm tra.')
    }
  }

  const submitExam = async (automatic = false) => {
    if (!takingExam || submitting || submissionResult) return
    if (!automatic && !window.confirm('Bạn chắc chắn muốn nộp bài?')) return

    autoSubmitTriggered.current = true
    setSubmitting(true)
    setSubmissionError('')
    try {
      const { data } = await examService.submitAttempt(
        takingExam.attemptId,
        examAnswers,
        remainingSeconds,
      )
      setSubmissionResult(data)
    } catch (error) {
      setSubmissionError(error.response?.data?.message || 'Không thể nộp bài. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!takingExam || submissionResult || submitting || remainingSeconds <= 0) return undefined
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [takingExam, submissionResult, submitting, remainingSeconds])

  useEffect(() => {
    if (takingExam && remainingSeconds === 0 && !submissionResult && !submitting
      && !autoSubmitTriggered.current) {
      submitExam(true)
    }
  }, [takingExam, remainingSeconds, submissionResult, submitting])

  const closeExam = () => {
    if (!submissionResult && !window.confirm('Thoát bài thi? Tiến độ hiện tại sẽ không được lưu.')) return
    setTakingExam(null)
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  }

  return (
    <section className="container page">
      <div className="page-header">
        <div><p className="eyebrow dark">ĐÁNH GIÁ</p><h1>Bài kiểm tra</h1></div>
        {user && <button className="btn primary" type="button" onClick={() => setShowCreate(true)}>+ Tạo đề thi</button>}
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
                {(exam.public === true || exam.isPublic === true) && (
                  <span className="exam-visibility">Công khai</span>
                )}
                {user && ((exam.public === true || exam.isPublic === true)
                  || exam.createdBy === user.username) && (
                  <button className="btn primary exam-start-button" type="button" onClick={() => startExam(exam)}>
                    Làm bài kiểm tra
                  </button>
                )}
                {user && exam.createdBy === user.username && (
                  <div className="exam-actions">
                    <button className="btn ghost" type="button" onClick={() => viewQuestions(exam)}>Xem đề</button>
                    <button className="btn primary" type="button" onClick={() => {
                      setSelectedExam(exam)
                      setMessage('')
                      setFile(null)
                    }}>AI Import file</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty"><h3>Chưa có đề thi</h3></div>}
      {!user && !loading && exams.some((exam) => exam.public === true || exam.isPublic === true)
        && <p className="exam-login-hint">Đăng nhập để bắt đầu làm bài và lưu kết quả.</p>}
      {message && !selectedExam && !showCreate && <p className="alert error">{message}</p>}

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

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <form className="modal" onSubmit={createExam} onMouseDown={(event) => event.stopPropagation()}>
            <h2>Tạo đề thi mới</h2>
            <label>Tên đề thi
              <input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} required />
            </label>
            <label>Mô tả
              <textarea value={examForm.description} onChange={(event) => setExamForm({ ...examForm, description: event.target.value })} />
            </label>
            <label>Thời gian làm bài (phút)
              <input type="number" min="1" value={examForm.duration} onChange={(event) => setExamForm({ ...examForm, duration: event.target.value })} required />
            </label>
            <label className="check">
              <input type="checkbox" checked={examForm.isPublic} onChange={(event) => setExamForm({ ...examForm, isPublic: event.target.checked })} />
              Công khai đề thi
            </label>
            <label>File đề thi (PDF, DOC, DOCX; chọn file để AI tạo câu hỏi)
              <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setCreateFile(event.target.files?.[0] || null)} />
            </label>
            {message && <p>{message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => {
                setShowCreate(false)
                setCreateFile(null)
              }}>Hủy</button>
              <button className="btn primary" disabled={creating}>
                {creating ? 'Đang tạo...' : createFile ? 'Tạo đề và sinh câu hỏi' : 'Tạo đề thi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewingExam && (
        <div className="modal-backdrop" onMouseDown={() => setViewingExam(null)}>
          <div className="modal exam-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{viewingExam.title}</h2>
            {questionsNotice && <p className="alert success">{questionsNotice}</p>}
            {questionsError && <p className="alert error">{questionsError}</p>}
            {loadingQuestions ? <p>Đang tải câu hỏi...</p> : questionsError ? null : examQuestions.length ? (
              <ol className="exam-question-list">
                {examQuestions.map((question) => (
                  <li key={question.id}>
                    <strong>{question.content}</strong>
                    <ul>
                      {(question.options || []).map((option) => (
                        <li key={option.id} className={option.correct ? 'correct-option' : ''}>
                          {option.content}{option.correct && <span> — Đáp án đúng</span>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : <p>Đề thi chưa có câu hỏi. Hãy import một file để tạo câu hỏi bằng AI.</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setViewingExam(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {takingExam && (
        <div className="modal-backdrop exam-take-backdrop" onMouseDown={closeExam}>
          <section className="exam-workspace" onMouseDown={(event) => event.stopPropagation()}>
            <header className="exam-workspace-header">
              <div>
                <p className="eyebrow dark">BÀI KIỂM TRA</p>
                <h2>{takingExam.title}</h2>
                <p>{takingExam.totalQuestions} câu hỏi · Chọn một đáp án cho mỗi câu</p>
              </div>
              {!submissionResult && (
                <div className={`exam-timer ${remainingSeconds < 60 ? 'urgent' : ''}`} aria-live="polite">
                  <span>Thời gian còn lại</span>
                  <strong>{formatTime(remainingSeconds)}</strong>
                </div>
              )}
              {submissionResult && (
                <div className="exam-result-score">
                  <span>Kết quả</span>
                  <strong>{submissionResult.score}/{submissionResult.totalQuestions}</strong>
                  <small>{submissionResult.percentage}%</small>
                </div>
              )}
            </header>

            {submissionResult ? (
              <div className="exam-review">
                <div className="exam-result-banner">
                  <span className="exam-result-icon">{submissionResult.percentage >= 50 ? '✓' : '!'}</span>
                  <div>
                    <h3>{submissionResult.percentage >= 50 ? 'Hoàn thành tốt!' : 'Bài làm đã được ghi nhận'}</h3>
                    <p>Bạn trả lời đúng {submissionResult.score} trên tổng số {submissionResult.totalQuestions} câu.</p>
                  </div>
                </div>
                {submissionResult.questions.map((question, index) => (
                  <article className={`review-question ${question.correct ? 'is-correct' : 'is-incorrect'}`} key={question.questionId}>
                    <div className="review-question-heading">
                      <span>Câu {index + 1}</span>
                      <strong>{question.correct ? 'Đúng' : question.selectedOptionId ? 'Chưa đúng' : 'Chưa trả lời'}</strong>
                    </div>
                    <h3>{question.content}</h3>
                    <p>Câu trả lời của bạn: <strong>{question.selectedOptionContent || 'Bỏ qua'}</strong></p>
                    {!question.correct && (
                      <p className="correct-answer">Đáp án đúng: <strong>{question.correctOptionContent || 'Chưa có đáp án'}</strong></p>
                    )}
                  </article>
                ))}
                <div className="exam-submit-footer">
                  <button className="btn primary" type="button" onClick={() => setTakingExam(null)}>Hoàn tất</button>
                </div>
              </div>
            ) : (
              <>
                <div className="exam-progress">
                  <div>
                    <span>Tiến độ</span>
                    <strong>{Object.keys(examAnswers).length}/{takingExam.totalQuestions} câu đã chọn</strong>
                  </div>
                  <div className="exam-progress-track">
                    <span style={{ width: `${takingExam.totalQuestions ? Object.keys(examAnswers).length / takingExam.totalQuestions * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="exam-workspace-body">
                  <aside className="question-navigator">
                    <h3>Câu hỏi</h3>
                    <div className="question-number-grid">
                      {takingExam.questions.map((question, index) => (
                        <button
                          key={question.id}
                          type="button"
                          className={`${index === activeQuestionIndex ? 'active' : ''} ${examAnswers[question.id] ? 'answered' : ''}`}
                          onClick={() => setActiveQuestionIndex(index)}
                          aria-label={`Đi đến câu ${index + 1}`}
                        >{index + 1}</button>
                      ))}
                    </div>
                    <p>{Object.keys(examAnswers).length} câu đã trả lời</p>
                  </aside>
                  {takingExam.questions[activeQuestionIndex] && (
                    <main className="active-exam-question">
                      <div className="question-kicker">
                        <span>CÂU {activeQuestionIndex + 1}</span>
                        <span>{takingExam.questions.length} câu</span>
                      </div>
                      <h3>{takingExam.questions[activeQuestionIndex].content}</h3>
                      <fieldset className="exam-choice-list">
                        <legend>Chọn một đáp án</legend>
                        {takingExam.questions[activeQuestionIndex].options.map((option, optionIndex) => (
                          <label
                            key={option.id}
                            className={`exam-choice ${examAnswers[takingExam.questions[activeQuestionIndex].id] === option.id ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`question-${takingExam.questions[activeQuestionIndex].id}`}
                              value={option.id}
                              checked={examAnswers[takingExam.questions[activeQuestionIndex].id] === option.id}
                              onChange={() => setExamAnswers((current) => ({
                                ...current,
                                [takingExam.questions[activeQuestionIndex].id]: option.id,
                              }))}
                            />
                            <span className="choice-letter">{String.fromCharCode(65 + optionIndex)}</span>
                            <span>{option.content}</span>
                          </label>
                        ))}
                      </fieldset>
                    </main>
                  )}
                </div>
                {submissionError && <p className="alert error exam-submit-error">{submissionError}</p>}
                <footer className="exam-submit-footer">
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={activeQuestionIndex === 0 || submitting}
                    onClick={() => setActiveQuestionIndex((index) => Math.max(0, index - 1))}
                  >Câu trước</button>
                  <span>{activeQuestionIndex + 1} / {takingExam.totalQuestions}</span>
                  {activeQuestionIndex < takingExam.totalQuestions - 1 ? (
                    <button className="btn primary" type="button" onClick={() => setActiveQuestionIndex((index) => Math.min(takingExam.totalQuestions - 1, index + 1))}>
                      Câu tiếp theo
                    </button>
                  ) : (
                    <button className="btn primary" type="button" disabled={submitting} onClick={() => submitExam(false)}>
                      {submitting ? 'Đang nộp bài...' : 'Nộp bài'}
                    </button>
                  )}
                  {activeQuestionIndex < takingExam.totalQuestions - 1 && (
                    <button className="btn submit-exam-button" type="button" disabled={submitting} onClick={() => submitExam(false)}>
                      Nộp bài
                    </button>
                  )}
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
