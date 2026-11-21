import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deckService } from '../../common/api/services/deckService'
import { flashcardService } from '../../common/api/services/flashcardService'

export default function DeckDetail() {
  const { id } = useParams()
  const [deck, setDeck] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState({})
  const [form, setForm] = useState({ term: '', definition: '' })
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const [{ data: deckData }, { data: cardsData }] = await Promise.all([
      deckService.getById(id),
      flashcardService.getByDeck(id),
    ])
    setDeck(deckData)
    setCards(Array.isArray(cardsData) ? cardsData : [])
  }

  useEffect(() => { load() }, [id])

  const createCard = async (event) => {
    event.preventDefault()
    await flashcardService.create({ ...form, createdAt: new Date().toISOString() }, id)
    setShowForm(false)
    setForm({ term: '', definition: '' })
    load()
  }

  if (!deck) return <section className="container page empty">Đang tải bộ thẻ...</section>

  return (
    <section className="container page">
      <Link className="back-link" to="/decks">‹ Quay lại danh sách</Link>
      <div className="detail-header">
        <div><p className="eyebrow dark">{deck.subject}</p><h1>{deck.title}</h1><p>{deck.description}</p></div>
        <button className="btn primary" type="button" onClick={() => setShowForm(true)}>+ Thêm thẻ</button>
      </div>
      {cards.length ? (
        <div className="study-grid">
          {cards.map((card) => (
            <button key={card.id} type="button" className={`study-card ${flipped[card.id] ? 'flipped' : ''}`} onClick={() => setFlipped((current) => ({ ...current, [card.id]: !current[card.id] }))}>
              <span>{flipped[card.id] ? card.definition : card.term}</span>
              <small>{flipped[card.id] ? 'Định nghĩa' : 'Thuật ngữ'}</small>
            </button>
          ))}
        </div>
      ) : <div className="empty"><h3>Bộ thẻ chưa có nội dung</h3><p>Thêm thẻ đầu tiên để bắt đầu học.</p></div>}
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
