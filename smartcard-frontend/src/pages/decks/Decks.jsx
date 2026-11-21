import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deckService } from '../../common/api/services/deckService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

const subjects = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Văn học', 'Tiếng Anh', 'Tiếng Việt', 'Công nghệ', 'Khác']

export default function Decks() {
  const { user } = useAuth()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [sort, setSort] = useState('newest')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', subject: 'Công nghệ', isPublic: true })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await deckService.getAll()
      setDecks(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visibleDecks = useMemo(() => {
    let result = decks.filter((deck) => deck.title?.toLowerCase().includes(query.toLowerCase()) && (!subject || deck.subject === subject))
    if (sort === 'az') result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'za') result = [...result].sort((a, b) => b.title.localeCompare(a.title))
    if (sort === 'newest') result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return result
  }, [decks, query, subject, sort])

  const createDeck = async (event) => {
    event.preventDefault()
    await deckService.create({ ...form, createdAt: new Date().toISOString(), user: user ? { id: user.id } : null })
    setShowForm(false)
    setForm({ title: '', description: '', subject: 'Công nghệ', isPublic: true })
    load()
  }

  const deleteDeck = async (id) => {
    if (!window.confirm('Xóa bộ thẻ này?')) return
    await deckService.delete(id)
    load()
  }

  return (
    <section className="container page">
      <div className="page-header">
        <div><p className="eyebrow dark">THƯ VIỆN</p><h1>Bộ thẻ của bạn</h1></div>
        <button className="btn primary" type="button" onClick={() => setShowForm(true)}>+ Tạo bộ thẻ</button>
      </div>
      <div className="filters">
        <input placeholder="Tìm kiếm bộ thẻ..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Tất cả môn học</option>
          {subjects.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="az">Tên A-Z</option>
          <option value="za">Tên Z-A</option>
        </select>
      </div>
      {loading ? <div className="empty">Đang tải dữ liệu...</div> : visibleDecks.length ? (
        <div className="deck-grid">
          {visibleDecks.map((deck) => (
            <article className="deck-card" key={deck.id}>
              <div className="deck-cover"><span>{deck.subject || 'Bộ thẻ'}</span></div>
              <div className="deck-body">
                <h3>{deck.title}</h3>
                <p>{deck.description || 'Chưa có mô tả.'}</p>
                <div className="deck-meta"><span>{deck.isPublic ? 'Công khai' : 'Riêng tư'}</span>{deck.createdAt && <span>{new Date(deck.createdAt).toLocaleDateString('vi-VN')}</span>}</div>
                <div className="deck-actions"><Link className="btn primary" to={`/decks/${deck.id}`}>Học ngay</Link>{user && <button className="icon-button" type="button" onClick={() => deleteDeck(deck.id)}>Xóa</button>}</div>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty"><h3>Chưa có bộ thẻ nào</h3><p>Hãy tạo bộ thẻ đầu tiên của bạn.</p></div>}
      {showForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <form className="modal" onSubmit={createDeck} onMouseDown={(event) => event.stopPropagation()}>
            <h2>Tạo bộ thẻ mới</h2>
            <label>Tên bộ thẻ<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Môn học<select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Công khai bộ thẻ</label>
            <div className="modal-actions"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Hủy</button><button className="btn primary">Tạo bộ thẻ</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
