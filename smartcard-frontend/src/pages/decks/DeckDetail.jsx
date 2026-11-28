import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileUp, Layers, Pencil, Plus, RotateCcw, Shuffle, Sparkles, Trash2, Volume2, XCircle } from 'lucide-react'
import { deckService } from '../../common/api/services/deckService'
import { flashcardService } from '../../common/api/services/flashcardService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'
import { clearDeckCardStatuses, getDeckCardStatuses, recordDeckStudyActivity } from '../../common/utils/studyStats'

function speakText(text, subject) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const isEnglishSubject = subject === 'Tiếng Anh'
  const looksAscii = /^[\x00-\x7F\s.,!?'"()-]+$/.test(text)
  utterance.lang = isEnglishSubject || looksAscii ? 'en-US' : 'vi-VN'
  utterance.rate = 0.96
  window.speechSynthesis.speak(utterance)
}

function parseBulkLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*(?:\t|\||::| - | : )\s*(.+)$/)
      if (!match) return null
      const term = match[1].trim()
      const definition = match[2].trim()
      if (!term || !definition) return null
      return { term, definition }
    })
    .filter(Boolean)
}

function buildQuizQuestions(cards) {
  if (cards.length < 2) return []
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.map((card) => {
    const distractors = cards
      .filter((other) => other.id !== card.id && other.definition !== card.definition)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((other) => other.definition)
    const options = [card.definition, ...distractors].sort(() => Math.random() - 0.5)
    return {
      id: card.id,
      term: card.term,
      correctAnswer: card.definition,
      options,
    }
  })
}

function Flashcard3D({
  card,
  subject,
  isFlipped,
  onFlip,
  onEdit,
  onDelete,
  compact = false,
  interactiveTilt = true,
  dragOffset = 0,
  isDragging = false,
  exitDirection = null,
  pointerHandlers = {},
}) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })

  const handleMouseMove = (event) => {
    if (!interactiveTilt || isDragging || exitDirection) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    setTilt({
      rx: (0.5 - y) * 10,
      ry: (x - 0.5) * 10,
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
      active: true,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })
  }

  const swipeRatio = Math.min(Math.abs(dragOffset) / 110, 1)
  const dragRotateZ = dragOffset * 0.045
  const exitX = exitDirection === 'right' ? 420 : exitDirection === 'left' ? -420 : 0
  const exitRotate = exitDirection === 'right' ? 16 : exitDirection === 'left' ? -16 : 0

  const stageStyle = {
    transform: exitDirection
      ? `translate3d(${exitX}px, -18px, 0) rotate(${exitRotate}deg)`
      : `translate3d(${dragOffset}px, 0, 0) rotate(${dragRotateZ}deg)`,
    opacity: exitDirection ? 0 : 1 - swipeRatio * 0.25,
    transition: isDragging
      ? 'none'
      : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease',
  }

  const innerTransform = isFlipped
    ? `rotateY(180deg) rotateX(${tilt.active ? -tilt.rx : 0}deg) rotateY(${tilt.active ? -tilt.ry : 0}deg)`
    : `rotateX(${tilt.active ? tilt.rx : 0}deg) rotateY(${tilt.active ? tilt.ry : 0}deg)`

  const handleSpeak = (event, text) => {
    event.stopPropagation()
    speakText(text, subject)
  }

  return (
    <div
      ref={cardRef}
      className={`flashcard-3d-scene ${compact ? 'is-compact' : 'is-focus'} ${isDragging ? 'is-dragging' : ''}`}
      style={stageStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...pointerHandlers}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        className={`flashcard-3d-inner ${isFlipped ? 'is-flipped' : ''}`}
        style={{ transform: innerTransform }}
        onClick={() => {
          if (Math.abs(dragOffset) < 6 && !exitDirection) onFlip()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onFlip()
          }
        }}
      >
        <div
          className="flashcard-face flashcard-front"
          style={{ '--glare-x': `${tilt.gx}%`, '--glare-y': `${tilt.gy}%` }}
        >
          <div className="flashcard-face-top">
            <span className="flashcard-badge">Thuật ngữ</span>
            <div className="flashcard-face-tools">
              <button
                type="button"
                className="card-tool-btn"
                title="Đọc phát âm"
                onClick={(event) => handleSpeak(event, card.term)}
              >
                <Volume2 size={15} />
              </button>
              {compact && onEdit && (
                <button
                  type="button"
                  className="card-tool-btn"
                  title="Sửa thẻ"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(card)
                  }}
                >
                  <Pencil size={14} />
                </button>
              )}
              {compact && onDelete && (
                <button
                  type="button"
                  className="card-tool-btn is-danger"
                  title="Xóa thẻ"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(card)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flashcard-text">{card.term}</div>
          <small className="flashcard-hint">Nhấn để lật xem định nghĩa</small>
          {dragOffset > 28 && (
            <span className="swipe-stamp is-known" style={{ opacity: swipeRatio }}>Đã nhớ</span>
          )}
          {dragOffset < -28 && (
            <span className="swipe-stamp is-review" style={{ opacity: swipeRatio }}>Ôn lại</span>
          )}
        </div>

        <div
          className="flashcard-face flashcard-back"
          style={{ '--glare-x': `${tilt.gx}%`, '--glare-y': `${tilt.gy}%` }}
        >
          <div className="flashcard-face-top">
            <span className="flashcard-badge">Định nghĩa</span>
            <div className="flashcard-face-tools">
              <button
                type="button"
                className="card-tool-btn"
                title="Đọc định nghĩa"
                onClick={(event) => handleSpeak(event, card.definition)}
              >
                <Volume2 size={15} />
              </button>
            </div>
          </div>
          <div className="flashcard-text">{card.definition}</div>
          <small className="flashcard-hint">Nhấn để quay lại thuật ngữ</small>
          {dragOffset > 28 && (
            <span className="swipe-stamp is-known" style={{ opacity: swipeRatio }}>Đã nhớ</span>
          )}
          {dragOffset < -28 && (
            <span className="swipe-stamp is-review" style={{ opacity: swipeRatio }}>Ôn lại</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DeckDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [deck, setDeck] = useState(null)
  const [cards, setCards] = useState([])
  const [studyOrder, setStudyOrder] = useState([])
  const [viewMode, setViewMode] = useState('focus')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [focusFlipped, setFocusFlipped] = useState(false)
  const [flippedGrid, setFlippedGrid] = useState({})
  const [cardStatus, setCardStatus] = useState({})
  const [sessionDone, setSessionDone] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)

  const [form, setForm] = useState({ term: '', definition: '' })
  const [editingCard, setEditingCard] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [savingBulk, setSavingBulk] = useState(false)

  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  const pointerStartX = useRef(null)
  const transitionTimer = useRef(null)

  const load = async () => {
    const [{ data: deckData }, { data: cardsData }] = await Promise.all([
      deckService.getById(id),
      flashcardService.getByDeck(id),
    ])
    const list = Array.isArray(cardsData) ? cardsData : []
    setDeck(deckData)
    setCards(list)
    setStudyOrder(list)
    setCurrentIndex(0)
    setFocusFlipped(false)
    setSessionDone(false)
    setCardStatus(getDeckCardStatuses(user?.id, id))
    if (deckData) {
      recordDeckStudyActivity(user?.id, deckData)
    }
  }

  useEffect(() => {
    load()
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [id, user?.id])

  const startQuiz = useCallback((sourceCards = cards) => {
    const generated = buildQuizQuestions(sourceCards)
    setQuizQuestions(generated)
    setQuizIndex(0)
    setSelectedOption(null)
    setQuizScore(0)
    setQuizFinished(false)
  }, [cards])

  const switchViewMode = (mode) => {
    setViewMode(mode)
    if (mode === 'quiz') {
      startQuiz(cards)
    }
  }

  const activeCard = studyOrder[currentIndex] || null
  const knownCount = useMemo(
    () => studyOrder.filter((card) => cardStatus[card.id] === 'known').length,
    [studyOrder, cardStatus],
  )
  const reviewCount = useMemo(
    () => studyOrder.filter((card) => cardStatus[card.id] === 'review').length,
    [studyOrder, cardStatus],
  )
  const parsedBulkCards = useMemo(() => parseBulkLines(bulkText), [bulkText])

  const goToIndex = useCallback(
    (nextIndex) => {
      if (!studyOrder.length) return
      if (nextIndex < 0) return
      if (nextIndex >= studyOrder.length) {
        setSessionDone(true)
        setFocusFlipped(false)
        return
      }
      setSessionDone(false)
      setFocusFlipped(false)
      setCurrentIndex(nextIndex)
    },
    [studyOrder.length],
  )

  const advanceWithAnimation = useCallback(
    (direction, status) => {
      if (!activeCard || exitDirection) return
      if (status && deck) {
        setCardStatus((prev) => ({ ...prev, [activeCard.id]: status }))
        recordDeckStudyActivity(user?.id, deck, activeCard.id, status)
      }
      setExitDirection(direction)
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
      transitionTimer.current = setTimeout(() => {
        setExitDirection(null)
        setDragOffset(0)
        goToIndex(currentIndex + 1)
      }, 240)
    },
    [activeCard, currentIndex, deck, exitDirection, goToIndex, user?.id],
  )

  const shuffleStudyOrder = () => {
    if (!cards.length) return
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setStudyOrder(shuffled)
    setCurrentIndex(0)
    setFocusFlipped(false)
    setSessionDone(false)
  }

  const restartSession = (onlyReview = false) => {
    const nextCards = onlyReview
      ? cards.filter((card) => cardStatus[card.id] === 'review')
      : cards
    if (!nextCards.length) return
    setStudyOrder(nextCards)
    if (!onlyReview) {
      setCardStatus({})
      clearDeckCardStatuses(user?.id, id)
    }
    setCurrentIndex(0)
    setFocusFlipped(false)
    setSessionDone(false)
  }

  useEffect(() => {
    if (viewMode !== 'focus' || showForm || showBulkForm || !studyOrder.length || sessionDone) return
    const handleKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (event.code === 'Space' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        setFocusFlipped((prev) => !prev)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToIndex(currentIndex + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToIndex(currentIndex - 1)
      } else if (event.key === '1') {
        event.preventDefault()
        advanceWithAnimation('left', 'review')
      } else if (event.key === '2') {
        event.preventDefault()
        advanceWithAnimation('right', 'known')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, showForm, showBulkForm, studyOrder.length, sessionDone, currentIndex, goToIndex, advanceWithAnimation])

  const pointerHandlers = {
    onPointerDown: (event) => {
      if (exitDirection || event.target.closest('button')) return
      pointerStartX.current = event.clientX
      setIsDragging(true)
    },
    onPointerMove: (event) => {
      if (!isDragging || pointerStartX.current === null) return
      setDragOffset(event.clientX - pointerStartX.current)
    },
    onPointerUp: () => {
      if (!isDragging) return
      setIsDragging(false)
      pointerStartX.current = null
      if (dragOffset > 95) {
        advanceWithAnimation('right', 'known')
      } else if (dragOffset < -95) {
        advanceWithAnimation('left', 'review')
      } else {
        setDragOffset(0)
      }
    },
    onPointerCancel: () => {
      setIsDragging(false)
      pointerStartX.current = null
      setDragOffset(0)
    },
  }

  const openCreateModal = () => {
    setEditingCard(null)
    setForm({ term: '', definition: '' })
    setShowForm(true)
  }

  const openEditModal = (card) => {
    setEditingCard(card)
    setForm({ term: card.term || '', definition: card.definition || '' })
    setShowForm(true)
  }

  const saveCard = async (event) => {
    event.preventDefault()
    if (editingCard) {
      await flashcardService.update(editingCard.id, form)
    } else {
      await flashcardService.create({ ...form, createdAt: new Date().toISOString() }, id)
    }
    setShowForm(false)
    setEditingCard(null)
    setForm({ term: '', definition: '' })
    load()
  }

  const handleDeleteCard = async (card) => {
    if (!window.confirm(`Xóa thẻ "${card.term}"?`)) return
    await flashcardService.delete(card.id)
    load()
  }

  const handleBulkImport = async (event) => {
    event.preventDefault()
    if (!parsedBulkCards.length) return
    setSavingBulk(true)
    try {
      const now = new Date().toISOString()
      await Promise.all(
        parsedBulkCards.map((item) => flashcardService.create({ ...item, createdAt: now }, id)),
      )
      setBulkText('')
      setShowBulkForm(false)
      await load()
    } finally {
      setSavingBulk(false)
    }
  }

  const handleQuizSelect = (option) => {
    if (selectedOption !== null) return
    const currentQuiz = quizQuestions[quizIndex]
    setSelectedOption(option)
    if (option === currentQuiz.correctAnswer) {
      setQuizScore((prev) => prev + 1)
    }
  }

  const handleQuizNext = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true)
      return
    }
    setQuizIndex((prev) => prev + 1)
    setSelectedOption(null)
  }

  if (!deck) return <section className="container page empty">Đang tải bộ thẻ...</section>

  const progressPercent = studyOrder.length
    ? Math.round(((sessionDone ? studyOrder.length : currentIndex + 1) / studyOrder.length) * 100)
    : 0
  const currentQuiz = quizQuestions[quizIndex]

  return (
    <section className="container page">
      <Link className="back-link" to="/decks">‹ Quay lại danh sách</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow dark">{deck.subject}</p>
          <h1>{deck.title}</h1>
          <p>{deck.description}</p>
        </div>
        <div className="detail-header-actions">
          {cards.length > 0 && (
            <div className="view-mode-switch" role="tablist" aria-label="Chế độ xem thẻ">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'focus'}
                className={`mode-tab ${viewMode === 'focus' ? 'is-active' : ''}`}
                onClick={() => switchViewMode('focus')}
              >
                <Layers size={14} />
                <span>Học từng thẻ</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'quiz'}
                className={`mode-tab ${viewMode === 'quiz' ? 'is-active' : ''}`}
                onClick={() => switchViewMode('quiz')}
              >
                <Sparkles size={14} />
                <span>Trắc nghiệm</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'grid'}
                className={`mode-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => switchViewMode('grid')}
              >
                Tất cả ({cards.length})
              </button>
            </div>
          )}
          <button className="btn ghost" type="button" onClick={() => setShowBulkForm(true)}>
            <FileUp size={15} />
            <span>Nhập nhanh</span>
          </button>
          <button className="btn primary" type="button" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Thêm thẻ</span>
          </button>
        </div>
      </div>

      {!cards.length ? (
        <div className="empty">
          <h3>Bộ thẻ chưa có nội dung</h3>
          <p>Thêm thẻ đầu tiên hoặc dùng tính năng Nhập nhanh để bắt đầu học.</p>
        </div>
      ) : viewMode === 'focus' ? (
        <div className="focus-study-shell">
          <div className="study-toolbar">
            <div className="study-stats">
              <span className="stat-pill is-total">
                Thẻ {sessionDone ? studyOrder.length : currentIndex + 1}/{studyOrder.length}
              </span>
              <span className="stat-pill is-known">Đã nhớ: {knownCount}</span>
              <span className="stat-pill is-review">Ôn lại: {reviewCount}</span>
            </div>
            <div className="study-tools">
              {activeCard && !sessionDone && (
                <>
                  <button type="button" className="btn ghost" onClick={() => openEditModal(activeCard)}>
                    <Pencil size={14} />
                    <span>Sửa</span>
                  </button>
                  <button type="button" className="btn ghost" onClick={() => handleDeleteCard(activeCard)}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button type="button" className="btn ghost" onClick={shuffleStudyOrder}>
                <Shuffle size={14} />
                <span>Xáo trộn</span>
              </button>
              <button type="button" className="btn ghost" onClick={() => restartSession(false)}>
                <RotateCcw size={14} />
                <span>Học lại</span>
              </button>
            </div>
          </div>

          <div className="study-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          {sessionDone ? (
            <div className="study-complete-card">
              <div className="study-complete-badge">Hoàn thành lượt ôn</div>
              <h2>Bạn đã xem hết {studyOrder.length} thẻ!</h2>
              <p>
                Đã nhớ <strong>{knownCount}</strong> thẻ · Cần ôn lại <strong>{reviewCount}</strong> thẻ
              </p>
              <div className="study-complete-actions">
                {reviewCount > 0 && (
                  <button type="button" className="btn warning" onClick={() => restartSession(true)}>
                    Ôn lại {reviewCount} thẻ chưa nhớ
                  </button>
                )}
                {cards.length >= 2 && (
                  <button type="button" className="btn ghost" onClick={() => switchViewMode('quiz')}>
                    <Sparkles size={15} />
                    <span>Kiểm tra nhanh</span>
                  </button>
                )}
                <button type="button" className="btn primary" onClick={() => restartSession(false)}>
                  Học lại toàn bộ
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="study-stack-stage">
                {studyOrder[currentIndex + 2] && (
                  <div className="stack-backdrop stack-layer-2" aria-hidden="true" />
                )}
                {studyOrder[currentIndex + 1] && (
                  <div className="stack-backdrop stack-layer-1" aria-hidden="true" />
                )}
                {activeCard && (
                  <Flashcard3D
                    key={activeCard.id}
                    card={activeCard}
                    subject={deck.subject}
                    isFlipped={focusFlipped}
                    onFlip={() => setFocusFlipped((prev) => !prev)}
                    dragOffset={dragOffset}
                    isDragging={isDragging}
                    exitDirection={exitDirection}
                    pointerHandlers={pointerHandlers}
                  />
                )}
              </div>

              <div className="study-controls">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={currentIndex === 0}
                  onClick={() => goToIndex(currentIndex - 1)}
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  className="btn study-review-btn"
                  onClick={() => advanceWithAnimation('left', 'review')}
                >
                  Cần ôn lại
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setFocusFlipped((prev) => !prev)}
                >
                  {focusFlipped ? 'Xem thuật ngữ' : 'Lật thẻ'}
                </button>
                <button
                  type="button"
                  className="btn study-known-btn"
                  onClick={() => advanceWithAnimation('right', 'known')}
                >
                  Đã nhớ ✓
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => goToIndex(currentIndex + 1)}
                >
                  Tiếp ›
                </button>
              </div>

              <p className="study-shortcuts-hint">
                Phím tắt: <strong>Space</strong> lật thẻ · <strong>← / →</strong> chuyển thẻ · <strong>1</strong> ôn lại · <strong>2</strong> đã nhớ · hoặc kéo thẻ sang trái/phải
              </p>
            </>
          )}
        </div>
      ) : viewMode === 'quiz' ? (
        cards.length < 2 ? (
          <div className="empty">
            <h3>Cần ít nhất 2 thẻ để tạo trắc nghiệm</h3>
            <p>Hãy thêm ít nhất 2 thẻ có định nghĩa khác nhau để luyện trắc nghiệm nhanh.</p>
          </div>
        ) : quizFinished ? (
          <div className="focus-study-shell">
            <div className="study-complete-card">
              <div className="study-complete-badge">Kết quả trắc nghiệm</div>
              <h2>Bạn trả lời đúng {quizScore}/{quizQuestions.length} câu!</h2>
              <p>Tỷ lệ chính xác: <strong>{Math.round((quizScore / quizQuestions.length) * 100)}%</strong></p>
              <div className="study-complete-actions">
                <button type="button" className="btn primary" onClick={() => startQuiz(cards)}>
                  <RotateCcw size={15} />
                  <span>Làm lại trắc nghiệm</span>
                </button>
                <button type="button" className="btn ghost" onClick={() => switchViewMode('focus')}>
                  Quay lại học thẻ
                </button>
              </div>
            </div>
          </div>
        ) : currentQuiz && (
          <div className="focus-study-shell">
            <div className="study-toolbar">
              <div className="study-stats">
                <span className="stat-pill is-total">Câu {quizIndex + 1}/{quizQuestions.length}</span>
                <span className="stat-pill is-known">Đúng: {quizScore}</span>
              </div>
              <button type="button" className="btn ghost" onClick={() => startQuiz(cards)}>
                <Shuffle size={14} />
                <span>Đổi bộ câu hỏi</span>
              </button>
            </div>
            <div className="study-progress-track">
              <span style={{ width: `${Math.round(((quizIndex + 1) / quizQuestions.length) * 100)}%` }} />
            </div>
            <motion.div
              key={currentQuiz.id}
              className="deck-quiz-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="deck-quiz-header">
                <span className="flashcard-badge">Chọn định nghĩa đúng cho thuật ngữ</span>
                <button
                  type="button"
                  className="card-tool-btn"
                  title="Đọc thuật ngữ"
                  onClick={() => speakText(currentQuiz.term, deck.subject)}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              <h2>{currentQuiz.term}</h2>
              <div className="deck-quiz-options">
                {currentQuiz.options.map((option, idx) => {
                  const isSelected = selectedOption === option
                  const isCorrect = option === currentQuiz.correctAnswer
                  let stateClass = ''
                  if (selectedOption !== null) {
                    if (isCorrect) stateClass = 'is-correct'
                    else if (isSelected) stateClass = 'is-wrong'
                  }
                  return (
                    <button
                      key={`${currentQuiz.id}-opt-${idx}`}
                      type="button"
                      disabled={selectedOption !== null}
                      className={`deck-quiz-option ${stateClass}`}
                      onClick={() => handleQuizSelect(option)}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="deck-quiz-option-text">{option}</span>
                      {selectedOption !== null && isCorrect && <CheckCircle2 size={18} className="quiz-state-icon" />}
                      {selectedOption !== null && isSelected && !isCorrect && <XCircle size={18} className="quiz-state-icon" />}
                    </button>
                  )
                })}
              </div>
              {selectedOption !== null && (
                <div className="deck-quiz-footer">
                  <button type="button" className="btn primary" onClick={handleQuizNext}>
                    {quizIndex + 1 >= quizQuestions.length ? 'Xem kết quả' : 'Câu tiếp theo ›'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )
      ) : (
        <div className="study-grid">
          {cards.map((card) => (
            <Flashcard3D
              key={card.id}
              card={card}
              subject={deck.subject}
              compact
              isFlipped={Boolean(flippedGrid[card.id])}
              onFlip={() => setFlippedGrid((current) => ({ ...current, [card.id]: !current[card.id] }))}
              onEdit={openEditModal}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setShowForm(false)}
          >
            <motion.form
              className="modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onSubmit={saveCard}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2>{editingCard ? 'Chỉnh sửa flashcard' : 'Thêm flashcard'}</h2>
              <label>Thuật ngữ hoặc câu hỏi<textarea value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required /></label>
              <label>Định nghĩa hoặc câu trả lời<textarea value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} required /></label>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button>
                <button className="btn primary">{editingCard ? 'Lưu thay đổi' : 'Thêm thẻ'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkForm && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setShowBulkForm(false)}
          >
            <motion.form
              className="modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onSubmit={handleBulkImport}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2>Nhập nhanh nhiều flashcard</h2>
              <p className="visibility-help">
                Mỗi dòng 1 thẻ theo dạng <code>Thuật ngữ - Định nghĩa</code> hoặc ngăn cách bằng dấu <code>|</code>, <code>::</code> hoặc Tab (copy từ Excel).
              </p>
              <label>Danh sách thẻ
                <textarea
                  rows="7"
                  placeholder={'Active Recall - Chủ động gợi nhớ kiến thức\nSpaced Repetition | Lặp lại ngắt quãng để nhớ lâu'}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </label>
              <p className="bulk-preview-count">
                Đã nhận diện: <strong>{parsedBulkCards.length}</strong> thẻ hợp lệ
              </p>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setShowBulkForm(false)}>Hủy</button>
                <button className="btn primary" disabled={!parsedBulkCards.length || savingBulk}>
                  {savingBulk ? 'Đang nhập...' : `Thêm ${parsedBulkCards.length} thẻ`}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
