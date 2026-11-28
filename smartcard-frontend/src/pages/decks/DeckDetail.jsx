import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deckService } from '../../common/api/services/deckService'
import { flashcardService } from '../../common/api/services/flashcardService'

function Flashcard3D({
  card,
  isFlipped,
  onFlip,
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
    const ry = (x - 0.5) * 10
    const rx = (0.5 - y) * 10
    setTilt({
      rx,
      ry,
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
          <span className="flashcard-badge">Thuật ngữ</span>
          <div className="flashcard-text">{card.term}</div>
          <small className="flashcard-hint">Nhấn để lật xem định nghĩa</small>
          {dragOffset > 28 && (
            <span className="swipe-stamp is-known" style={{ opacity: swipeRatio }}>
              Đã nhớ
            </span>
          )}
          {dragOffset < -28 && (
            <span className="swipe-stamp is-review" style={{ opacity: swipeRatio }}>
              Ôn lại
            </span>
          )}
        </div>

        <div
          className="flashcard-face flashcard-back"
          style={{ '--glare-x': `${tilt.gx}%`, '--glare-y': `${tilt.gy}%` }}
        >
          <span className="flashcard-badge">Định nghĩa</span>
          <div className="flashcard-text">{card.definition}</div>
          <small className="flashcard-hint">Nhấn để quay lại thuật ngữ</small>
          {dragOffset > 28 && (
            <span className="swipe-stamp is-known" style={{ opacity: swipeRatio }}>
              Đã nhớ
            </span>
          )}
          {dragOffset < -28 && (
            <span className="swipe-stamp is-review" style={{ opacity: swipeRatio }}>
              Ôn lại
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DeckDetail() {
  const { id } = useParams()
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
  const [showForm, setShowForm] = useState(false)

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
  }

  useEffect(() => {
    load()
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
    }
  }, [id])

  const activeCard = studyOrder[currentIndex] || null
  const knownCount = useMemo(
    () => studyOrder.filter((card) => cardStatus[card.id] === 'known').length,
    [studyOrder, cardStatus],
  )
  const reviewCount = useMemo(
    () => studyOrder.filter((card) => cardStatus[card.id] === 'review').length,
    [studyOrder, cardStatus],
  )

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
      if (status) {
        setCardStatus((prev) => ({ ...prev, [activeCard.id]: status }))
      }
      setExitDirection(direction)
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
      transitionTimer.current = setTimeout(() => {
        setExitDirection(null)
        setDragOffset(0)
        goToIndex(currentIndex + 1)
      }, 240)
    },
    [activeCard, currentIndex, exitDirection, goToIndex],
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
    if (!onlyReview) setCardStatus({})
    setCurrentIndex(0)
    setFocusFlipped(false)
    setSessionDone(false)
  }

  useEffect(() => {
    if (viewMode !== 'focus' || showForm || !studyOrder.length || sessionDone) return
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
  }, [viewMode, showForm, studyOrder.length, sessionDone, currentIndex, goToIndex, advanceWithAnimation])

  const pointerHandlers = {
    onPointerDown: (event) => {
      if (exitDirection) return
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

  const createCard = async (event) => {
    event.preventDefault()
    await flashcardService.create({ ...form, createdAt: new Date().toISOString() }, id)
    setShowForm(false)
    setForm({ term: '', definition: '' })
    load()
  }

  if (!deck) return <section className="container page empty">Đang tải bộ thẻ...</section>

  const progressPercent = studyOrder.length
    ? Math.round(((sessionDone ? studyOrder.length : currentIndex + 1) / studyOrder.length) * 100)
    : 0

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
                onClick={() => setViewMode('focus')}
              >
                Học từng thẻ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'grid'}
                className={`mode-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                Tất cả ({cards.length})
              </button>
            </div>
          )}
          <button className="btn primary" type="button" onClick={() => setShowForm(true)}>+ Thêm thẻ</button>
        </div>
      </div>

      {!cards.length ? (
        <div className="empty">
          <h3>Bộ thẻ chưa có nội dung</h3>
          <p>Thêm thẻ đầu tiên để bắt đầu học.</p>
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
              <button type="button" className="btn ghost" onClick={shuffleStudyOrder}>
                Xáo trộn
              </button>
              <button type="button" className="btn ghost" onClick={() => restartSession(false)}>
                Học lại
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
      ) : (
        <div className="study-grid">
          {cards.map((card) => (
            <Flashcard3D
              key={card.id}
              card={card}
              compact
              isFlipped={Boolean(flippedGrid[card.id])}
              onFlip={() => setFlippedGrid((current) => ({ ...current, [card.id]: !current[card.id] }))}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <form className="modal" onSubmit={createCard} onMouseDown={(event) => event.stopPropagation()}>
            <h2>Thêm flashcard</h2>
            <label>Thuật ngữ hoặc câu hỏi<textarea value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required /></label>
            <label>Định nghĩa hoặc câu trả lời<textarea value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} required /></label>
            <div className="modal-actions"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary">Thêm thẻ</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
