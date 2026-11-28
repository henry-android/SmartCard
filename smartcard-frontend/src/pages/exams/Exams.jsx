import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { deckService } from '../../common/api/services/deckService'
import { examService } from '../../common/api/services/examService'
import { flashcardService } from '../../common/api/services/flashcardService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'
import Tilt3DCard from '../../components/ui/Tilt3DCard'
import { staggerContainer, staggerItem } from '../../components/ui/PageTransition'

export default function Exams() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState(null)
  const [editingVisibilityExam, setEditingVisibilityExam] = useState(null)
  const [visibilityForm, setVisibilityForm] = useState(true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [visibilityError, setVisibilityError] = useState('')
  const [examNotice, setExamNotice] = useState('')
  const [deletingExamId, setDeletingExamId] = useState(null)
  const [file, setFile] = useState(null)
  const [createFile, setCreateFile] = useState(null)
  const [aiConsent, setAiConsent] = useState(false)
  const [aiImportDraft, setAiImportDraft] = useState(null)
  const [aiImportError, setAiImportError] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [confirmingImport, setConfirmingImport] = useState(false)
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
  const [resultAttemptMeta, setResultAttemptMeta] = useState(null)
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [historyExam, setHistoryExam] = useState(null)
  const [attemptHistory, setAttemptHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [openingHistoryResult, setOpeningHistoryResult] = useState(false)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [decks, setDecks] = useState([])
  const [targetDeckId, setTargetDeckId] = useState('')
  const [savedFlashcardIds, setSavedFlashcardIds] = useState({})
  const [savingFlashcardId, setSavingFlashcardId] = useState(null)
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

  useEffect(() => {
    if (!submissionResult || !user) return
    deckService.getAll()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : []
        setDecks(list)
        if (list.length && !targetDeckId) {
          setTargetDeckId(String(list[0].id))
        }
      })
      .catch(() => setDecks([]))
  }, [submissionResult, user])

  const saveWrongQuestionAsFlashcard = async (question) => {
    if (!targetDeckId || savingFlashcardId) return
    setSavingFlashcardId(question.questionId)
    try {
      const answerText = question.correctOptionContent || 'Chưa có đáp án'
      const definition = question.explanation
        ? `${answerText}\n\nGiải thích: ${question.explanation}`
        : answerText
      await flashcardService.create({
        term: question.content,
        definition,
        createdAt: new Date().toISOString(),
      }, targetDeckId)
      setSavedFlashcardIds((prev) => ({ ...prev, [question.questionId]: true }))
    } finally {
      setSavingFlashcardId(null)
    }
  }

  const createExam = async (event) => {
    event.preventDefault()
    setMessage('')
    if (createFile && !aiConsent) {
      setMessage('Xác nhận gửi tài liệu tới OpenRouter trước khi phân tích.')
      return
    }
    setCreating(true)
    try {
      const examData = {
        ...examForm,
        duration: Number(examForm.duration),
      }
      if (createFile) {
        const { data } = await examService.previewCreateFromFile(examData, createFile)
        setAiImportDraft({
          mode: 'create',
          examData,
          file: createFile,
          questions: data.questions || [],
          rejectedCount: data.rejectedCount || 0,
        })
        setAiImportError('')
        setShowCreate(false)
        return
      }

      await examService.create(examData)
      setShowCreate(false)
      setExamForm({ title: '', description: '', duration: 30, isPublic: true })
      setCreateFile(null)
      setAiConsent(false)
      await load()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể tạo đề thi.')
    } finally {
      setCreating(false)
    }
  }

  const importExam = async (event) => {
    event.preventDefault()
    if (!selectedExam || !file) return
    if (!aiConsent) {
      setMessage('Xác nhận gửi tài liệu tới OpenRouter trước khi phân tích.')
      return
    }

    setImporting(true)
    setMessage('')
    try {
      const { data } = await examService.previewAiImport(selectedExam.id, file)
      setAiImportDraft({
        mode: 'append',
        exam: selectedExam,
        file,
        questions: data.questions || [],
        rejectedCount: data.rejectedCount || 0,
      })
      setAiImportError('')
      setSelectedExam(null)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể import đề thi.')
    } finally {
      setImporting(false)
    }
  }

  const editExamVisibility = (exam) => {
    setEditingVisibilityExam(exam)
    setVisibilityForm(exam.isPublic === true || exam.public === true)
    setVisibilityError('')
    setExamNotice('')
  }

  const saveExamVisibility = async (event) => {
    event.preventDefault()
    if (!editingVisibilityExam) return

    setUpdatingVisibility(true)
    setVisibilityError('')
    try {
      const { data } = await examService.updateVisibility(editingVisibilityExam.id, visibilityForm)
      setExams((current) => current.map((exam) => (
        exam.id === editingVisibilityExam.id
          ? { ...exam, isPublic: data.isPublic, public: data.isPublic }
          : exam
      )))
      setExamNotice(data.message)
      setEditingVisibilityExam(null)
    } catch (error) {
      setVisibilityError(error.response?.data?.message || 'Không thể cập nhật quyền riêng tư của đề thi.')
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const deleteExam = async (exam) => {
    const confirmed = window.confirm(
      `Xóa đề thi "${exam.title}"? Toàn bộ câu hỏi, đáp án và lịch sử làm bài sẽ bị xóa. Thao tác này không thể hoàn tác.`,
    )
    if (!confirmed) return

    setDeletingExamId(exam.id)
    setMessage('')
    setExamNotice('')
    try {
      await examService.deleteExam(exam.id)
      setExams((current) => current.filter((item) => item.id !== exam.id))
      setExamNotice(`Đã xóa đề thi "${exam.title}".`)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể xóa đề thi.')
    } finally {
      setDeletingExamId(null)
    }
  }

  const updateDraftQuestion = (questionIndex, updates) => {
    setAiImportDraft((draft) => ({
      ...draft,
      questions: draft.questions.map((question, index) => (
        index === questionIndex ? { ...question, ...updates } : question
      )),
    }))
  }

  const updateDraftOption = (questionIndex, optionIndex, updates) => {
    setAiImportDraft((draft) => ({
      ...draft,
      questions: draft.questions.map((question, index) => {
        if (index !== questionIndex) return question
        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) => ({
            ...option,
            ...(currentOptionIndex === optionIndex ? updates : {}),
            ...(updates.correct ? { correct: currentOptionIndex === optionIndex } : {}),
          })),
        }
      }),
    }))
  }

  const regenerateDraft = async () => {
    if (!aiImportDraft) return
    setRegenerating(true)
    setAiImportError('')
    try {
      const response = aiImportDraft.mode === 'create'
        ? await examService.previewCreateFromFile(aiImportDraft.examData, aiImportDraft.file)
        : await examService.previewAiImport(aiImportDraft.exam.id, aiImportDraft.file)
      setAiImportDraft((draft) => ({
        ...draft,
        questions: response.data.questions || [],
        rejectedCount: response.data.rejectedCount || 0,
      }))
    } catch (error) {
      setAiImportError(error.response?.data?.message || 'Không thể tạo lại câu hỏi từ file.')
    } finally {
      setRegenerating(false)
    }
  }

  const confirmAiImport = async () => {
    if (!aiImportDraft) return
    setConfirmingImport(true)
    setAiImportError('')
    try {
      if (aiImportDraft.mode === 'create') {
        const { data } = await examService.confirmCreateFromFile({
          ...aiImportDraft.examData,
          questions: aiImportDraft.questions,
        })
        setMessage('')
        setAiImportDraft(null)
        setExamForm({ title: '', description: '', duration: 30, isPublic: true })
        setCreateFile(null)
        setAiConsent(false)
        await load()
        await viewQuestions(data.exam)
        setQuestionsNotice(data.message)
      } else {
        const { data } = await examService.confirmAiImport(
          aiImportDraft.exam.id,
          aiImportDraft.questions,
        )
        const updatedExam = {
          ...aiImportDraft.exam,
          totalQuestions: (aiImportDraft.exam.totalQuestions || 0) + data.importedCount,
        }
        setMessage('')
        setAiImportDraft(null)
        setFile(null)
        setAiConsent(false)
        await load()
        await viewQuestions(updatedExam)
        setQuestionsNotice(data.message)
      }
    } catch (error) {
      setAiImportError(error.response?.data?.message || 'Không thể lưu đề thi.')
    } finally {
      setConfirmingImport(false)
    }
  }

  const getDraftQuestionError = (question) => {
    if (!question.content?.trim()) return 'Nhập nội dung câu hỏi.'
    const options = question.options || []
    const populatedOptions = options.filter((option) => option.content?.trim())
    if (populatedOptions.length < 2) {
      return 'Cần ít nhất hai đáp án có nội dung.'
    }
    if (populatedOptions.length > 5) {
      return 'Mỗi câu chỉ được có tối đa năm đáp án.'
    }
    if (populatedOptions.filter((option) => option.correct).length !== 1) {
      return 'Chọn chính xác một đáp án đúng.'
    }
    return ''
  }

  const canConfirmDraft = aiImportDraft?.questions.length > 0
    && aiImportDraft.questions.every((question) => !getDraftQuestionError(question))

  const discardAiImportDraft = () => {
    if (aiImportDraft?.mode === 'create') setCreateFile(null)
    if (aiImportDraft?.mode === 'append') setFile(null)
    setAiConsent(false)
    setAiImportError('')
    setAiImportDraft(null)
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
      setResultAttemptMeta(null)
      setSubmissionError('')
      setSubmitting(false)
      autoSubmitTriggered.current = false
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể bắt đầu bài kiểm tra.')
    }
  }

  const viewHistory = async (exam) => {
    setHistoryExam(exam)
    setAttemptHistory([])
    setHistoryError('')
    setLoadingHistory(true)
    try {
      const { data } = await examService.getMyHistory(exam.id)
      setAttemptHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      setHistoryError(error.response?.data?.message || 'Không thể tải lịch sử làm bài.')
    } finally {
      setLoadingHistory(false)
    }
  }

  const viewPastResult = async (attempt) => {
    setOpeningHistoryResult(true)
    setHistoryError('')
    try {
      const { data } = await examService.getAttemptResult(attempt.attemptId)
      setHistoryExam(null)
      setTakingExam({ title: data.examTitle, totalQuestions: data.totalQuestions })
      setSubmissionResult(data)
      setResultAttemptMeta(attempt)
    } catch (error) {
      setHistoryError(error.response?.data?.message || 'Không thể mở kết quả lượt làm này.')
    } finally {
      setOpeningHistoryResult(false)
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

  const formatDurationText = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60
    return minutes ? `${minutes} phút ${remaining} giây` : `${remaining} giây`
  }

  const formatDateTime = (value) => value
    ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Không có dữ liệu thời gian'

  return (
    <section className="container page">
      <div className="page-header">
        <div><p className="eyebrow dark">ĐÁNH GIÁ</p><h1>Bài kiểm tra</h1></div>
        {user && <button className="btn primary" type="button" onClick={() => {
          setAiConsent(false)
          setShowCreate(true)
        }}>+ Tạo đề thi</button>}
      </div>

      {loading ? (
        <div className="deck-grid" aria-label="Đang tải đề thi">
          {[1, 2, 3, 4].map((item) => (
            <div className="deck-card skeleton-card" key={item}>
              <div className="deck-body">
                <div className="skeleton-line is-title" />
                <div className="skeleton-line is-text" />
                <div className="skeleton-line is-meta" />
              </div>
            </div>
          ))}
        </div>
      ) : exams.length ? (
        <motion.div className="deck-grid" variants={staggerContainer} initial="hidden" animate="show">
          {exams.map((exam) => (
            <Tilt3DCard className="deck-card" key={exam.id} variants={staggerItem}>
              <div className="deck-body">
                <h3>{exam.title}</h3>
                <p>{exam.description || 'Chưa có mô tả.'}</p>
                <div className="deck-meta">
                  <span>{exam.duration} phút</span>
                  <span>{exam.totalQuestions} câu</span>
                </div>
                <span className={`exam-visibility ${exam.public === true || exam.isPublic === true ? '' : 'private'}`}>
                  {exam.public === true || exam.isPublic === true ? 'Công khai' : 'Riêng tư'}
                </span>
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
                      setAiConsent(false)
                    }}>AI Import file</button>
                  </div>
                )}
                {user && exam.createdBy === user.username && (
                  <button
                    className="btn ghost exam-visibility-button"
                    type="button"
                    onClick={() => editExamVisibility(exam)}
                  >Chỉnh sửa quyền riêng tư</button>
                )}
                {user && exam.createdBy === user.username && (
                  <button
                    className="btn ghost exam-delete-button"
                    type="button"
                    disabled={deletingExamId === exam.id}
                    onClick={() => deleteExam(exam)}
                  >{deletingExamId === exam.id ? 'Đang xóa...' : 'Xóa đề thi'}</button>
                )}
                {user && (
                  <button className="btn ghost exam-history-button" type="button" onClick={() => viewHistory(exam)}>
                    Lịch sử làm bài
                  </button>
                )}
              </div>
            </Tilt3DCard>
          ))}
        </motion.div>
      ) : <div className="empty"><h3>Chưa có đề thi</h3></div>}
      {!user && !loading && exams.some((exam) => exam.public === true || exam.isPublic === true)
        && <p className="exam-login-hint">Đăng nhập để bắt đầu làm bài và lưu kết quả.</p>}
      {examNotice && <p className="alert success">{examNotice}</p>}
      {message && !selectedExam && !showCreate && <p className="alert error">{message}</p>}

      {editingVisibilityExam && (
        <div className="modal-backdrop" onMouseDown={() => setEditingVisibilityExam(null)}>
          <form className="modal" onSubmit={saveExamVisibility} onMouseDown={(event) => event.stopPropagation()}>
            <h2>Chỉnh sửa quyền riêng tư</h2>
            <p className="visibility-exam-title">{editingVisibilityExam.title}</p>
            <label className="check visibility-toggle">
              <input
                type="checkbox"
                checked={visibilityForm}
                onChange={(event) => setVisibilityForm(event.target.checked)}
              />
              Công khai đề thi
            </label>
            <p className="visibility-help">
              {visibilityForm
                ? 'Đề thi công khai có thể được người dùng khác tìm thấy và làm bài.'
                : 'Đề thi riêng tư chỉ hiển thị với bạn; người khác không thể mở hoặc làm bài.'}
            </p>
            {visibilityError && <p className="alert error">{visibilityError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={updatingVisibility}
                onClick={() => setEditingVisibilityExam(null)}
              >Hủy</button>
              <button className="btn primary" disabled={updatingVisibility}>
                {updatingVisibility ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedExam && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedExam(null)}>
          <form className="modal" onSubmit={importExam} onMouseDown={(event) => event.stopPropagation()}>
            <h2>AI Import: {selectedExam.title}</h2>
            <label>File đề thi (.pdf, .doc, .docx)
              <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => {
                setFile(event.target.files?.[0] || null)
                setAiConsent(false)
              }} required />
            </label>
            {file && (
              <label className="check ai-consent">
                <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} required />
                <span>Tôi hiểu rằng nội dung tài liệu sẽ được gửi tới dịch vụ AI OpenRouter để phân tích. Không tải lên tài liệu nhạy cảm hoặc chứa thông tin riêng tư.</span>
              </label>
            )}
            {message && <p className="alert error">{message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => {
                setSelectedExam(null)
                setAiConsent(false)
              }}>Đóng</button>
              <button className="btn primary" disabled={importing || !file || !aiConsent}>
                {importing ? 'Đang phân tích...' : 'Xem trước câu hỏi'}
              </button>
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
              <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => {
                setCreateFile(event.target.files?.[0] || null)
                setAiConsent(false)
              }} />
            </label>
            {createFile && (
              <label className="check ai-consent">
                <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} required />
                <span>Tôi hiểu rằng nội dung tài liệu sẽ được gửi tới dịch vụ AI OpenRouter để phân tích. Không tải lên tài liệu nhạy cảm hoặc chứa thông tin riêng tư.</span>
              </label>
            )}
            {message && <p className="alert error">{message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => {
                setShowCreate(false)
                setCreateFile(null)
                setAiConsent(false)
              }}>Hủy</button>
              <button className="btn primary" disabled={creating || (createFile && !aiConsent)}>
                {creating ? 'Đang xử lý...' : createFile ? 'Tạo bản xem trước' : 'Tạo đề thi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {aiImportDraft && (
        <div className="modal-backdrop" onMouseDown={discardAiImportDraft}>
          <section className="modal ai-import-review-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header className="ai-review-header">
              <div>
                <p className="eyebrow dark">KIỂM TRA TRƯỚC KHI LƯU</p>
                <h2>{aiImportDraft.mode === 'create' ? aiImportDraft.examData.title : aiImportDraft.exam.title}</h2>
                <p>AI có thể tạo đáp án chưa chính xác. Hãy xem lại câu hỏi và đáp án trước khi xác nhận.</p>
              </div>
              <button className="btn ghost" type="button" onClick={discardAiImportDraft}>Đóng</button>
            </header>
            {aiImportDraft.rejectedCount > 0 && (
              <p className="alert error">Đã bỏ qua {aiImportDraft.rejectedCount} mục không hợp lệ do AI tạo.</p>
            )}
            {aiImportError && <p className="alert error">{aiImportError}</p>}
            <div className="ai-review-list">
              {aiImportDraft.questions.map((question, questionIndex) => (
                <article className="ai-review-question" key={`draft-question-${questionIndex}`}>
                  <div className="ai-review-question-heading">
                    <h3>Câu {questionIndex + 1}</h3>
                    <button className="btn ghost" type="button" onClick={() => {
                      setAiImportDraft((draft) => ({
                        ...draft,
                        questions: draft.questions.filter((_, index) => index !== questionIndex),
                      }))
                    }}>Xóa câu</button>
                  </div>
                  <label>Nội dung câu hỏi
                    <textarea
                      value={question.content || ''}
                      onChange={(event) => updateDraftQuestion(questionIndex, { content: event.target.value })}
                      rows="3"
                    />
                  </label>
                  <fieldset className="ai-review-options">
                    <legend>Đáp án — chọn đáp án đúng</legend>
                    {(question.options || []).map((option, optionIndex) => (
                      <div className="ai-review-option" key={`draft-option-${questionIndex}-${optionIndex}`}>
                        <input
                          type="radio"
                          name={`correct-answer-${questionIndex}`}
                          aria-label={`Đánh dấu đáp án ${optionIndex + 1} là đúng`}
                          checked={Boolean(option.correct)}
                          onChange={() => updateDraftOption(questionIndex, optionIndex, { correct: true })}
                        />
                        <input
                          value={option.content || ''}
                          aria-label={`Nội dung đáp án ${optionIndex + 1}`}
                          onChange={(event) => updateDraftOption(questionIndex, optionIndex, { content: event.target.value })}
                        />
                        <button
                          className="btn ghost"
                          type="button"
                          aria-label={`Xóa đáp án ${optionIndex + 1}`}
                          disabled={question.options.length <= 2}
                          onClick={() => updateDraftQuestion(questionIndex, {
                            options: question.options.filter((_, index) => index !== optionIndex),
                          })}
                        >Xóa</button>
                      </div>
                    ))}
                    <button
                      className="btn ghost ai-add-option"
                      type="button"
                      disabled={(question.options || []).length >= 5}
                      onClick={() => updateDraftQuestion(questionIndex, {
                        options: [...(question.options || []), { content: '', correct: false }],
                      })}
                    >+ Thêm đáp án</button>
                  </fieldset>
                  <label>Giải thích đáp án đúng
                    <textarea
                      value={question.explanation || ''}
                      onChange={(event) => updateDraftQuestion(questionIndex, { explanation: event.target.value })}
                      rows="2"
                    />
                  </label>
                  {getDraftQuestionError(question) && (
                    <p className="ai-question-validation">{getDraftQuestionError(question)}</p>
                  )}
                </article>
              ))}
            </div>
            <button className="btn ghost ai-add-question" type="button" onClick={() => {
              setAiImportDraft((draft) => ({
                ...draft,
                questions: [...draft.questions, {
                  content: '',
                  explanation: '',
                  options: [
                    { content: '', correct: true },
                    { content: '', correct: false },
                  ],
                }],
              }))
            }}>+ Thêm câu hỏi</button>
            <div className="modal-actions ai-review-actions">
              <button className="btn ghost" type="button" disabled={regenerating || confirmingImport} onClick={regenerateDraft}>
                {regenerating ? 'Đang tạo lại...' : 'Tạo lại từ file'}
              </button>
              {aiImportDraft.mode === 'create' && (
                <button className="btn ghost" type="button" disabled={regenerating || confirmingImport} onClick={() => {
                  setExamForm(aiImportDraft.examData)
                  setCreateFile(aiImportDraft.file)
                  setAiImportDraft(null)
                  setShowCreate(true)
                }}>Quay lại thông tin đề</button>
              )}
              <button className="btn primary" type="button" disabled={!canConfirmDraft || confirmingImport || regenerating} onClick={confirmAiImport}>
                {confirmingImport ? 'Đang lưu...' : 'Xác nhận và lưu'}
              </button>
            </div>
          </section>
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
                    {question.explanation && <p className="question-explanation">Giải thích: {question.explanation}</p>}
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

      {historyExam && (
        <div className="modal-backdrop" onMouseDown={() => setHistoryExam(null)}>
          <section className="modal exam-history-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header className="exam-history-header">
              <div>
                <p className="eyebrow dark">LỊCH SỬ CÁ NHÂN</p>
                <h2>{historyExam.title}</h2>
                <p>Các lượt làm bài đã nộp</p>
              </div>
              <button className="btn ghost" type="button" onClick={() => setHistoryExam(null)}>Đóng</button>
            </header>
            {historyError && <p className="alert error">{historyError}</p>}
            {loadingHistory ? <div className="empty history-empty">Đang tải lịch sử...</div> : attemptHistory.length ? (
              <ol className="attempt-history-list">
                {[...attemptHistory].reverse().map((attempt) => (
                  <li key={attempt.attemptId}>
                    <div className="attempt-history-number">#{attempt.attemptNumber}</div>
                    <div className="attempt-history-info">
                      <strong>Lượt {attempt.attemptNumber}</strong>
                      <span>Bắt đầu lúc {formatDateTime(attempt.startedAt)}</span>
                      <span>Nộp lúc {formatDateTime(attempt.submittedAt)}</span>
                      <span>Thời gian làm: {formatDurationText(attempt.timeSpentSeconds)}</span>
                    </div>
                    <div className="attempt-history-score">
                      <strong>{attempt.score}/{attempt.totalQuestions}</strong>
                      <span>{attempt.percentage}%</span>
                    </div>
                    <button
                      className="btn primary"
                      type="button"
                      disabled={openingHistoryResult}
                      onClick={() => viewPastResult(attempt)}
                    >{openingHistoryResult ? 'Đang mở...' : 'Xem bài làm'}</button>
                  </li>
                ))}
              </ol>
            ) : !historyError && (
              <div className="empty history-empty">
                <h3>Chưa có lượt làm bài</h3>
                <p>Sau khi nộp bài, lịch sử và kết quả sẽ được lưu tại đây.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {takingExam && (
        <div className="modal-backdrop exam-take-backdrop" onMouseDown={closeExam}>
          <section className="exam-workspace" onMouseDown={(event) => event.stopPropagation()}>
            <header className="exam-workspace-header">
              <div>
                <p className="eyebrow dark">{submissionResult ? 'KẾT QUẢ LÀM BÀI' : 'BÀI KIỂM TRA'}</p>
                <h2>{takingExam.title}</h2>
                {submissionResult && resultAttemptMeta ? (
                  <p>Lượt {resultAttemptMeta.attemptNumber} · Nộp lúc {formatDateTime(resultAttemptMeta.submittedAt)}
                    · Thời gian làm {formatDurationText(resultAttemptMeta.timeSpentSeconds)}</p>
                ) : !submissionResult && (
                  <p>{takingExam.totalQuestions} câu hỏi · Chọn một đáp án cho mỗi câu</p>
                )}
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
                {decks.length > 0 && submissionResult.questions.some((q) => !q.correct) && (
                  <div className="save-to-deck-bar">
                    <span>Lưu câu làm sai vào bộ thẻ:</span>
                    <select value={targetDeckId} onChange={(event) => setTargetDeckId(event.target.value)}>
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>{deck.title}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                    {question.explanation && (
                      <p className="review-explanation">Giải thích: <strong>{question.explanation}</strong></p>
                    )}
                    {!question.correct && decks.length > 0 && (
                      <div className="review-save-action">
                        <button
                          type="button"
                          className={`btn ${savedFlashcardIds[question.questionId] ? 'study-known-btn' : 'ghost'}`}
                          disabled={Boolean(savedFlashcardIds[question.questionId]) || savingFlashcardId === question.questionId}
                          onClick={() => saveWrongQuestionAsFlashcard(question)}
                        >
                          {savedFlashcardIds[question.questionId]
                            ? 'Đã lưu vào bộ thẻ ✓'
                            : savingFlashcardId === question.questionId
                              ? 'Đang lưu...'
                              : '+ Lưu thành Flashcard'}
                        </button>
                      </div>
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
                    <AnimatePresence mode="wait">
                      <motion.main
                        key={activeQuestionIndex}
                        className="active-exam-question"
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
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
                      </motion.main>
                    </AnimatePresence>
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
