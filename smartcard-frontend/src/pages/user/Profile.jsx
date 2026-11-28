import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Award, BookOpen, CheckCircle2, ClipboardCheck, Flame, Layers, Pencil, Save, X } from 'lucide-react'
import { deckService } from '../../common/api/services/deckService'
import { examService } from '../../common/api/services/examService'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'
import { loadStudyStats } from '../../common/utils/studyStats'
import { getSubjectGradient } from '../../common/constants/subjectThemes'
import Tilt3DCard from '../../components/ui/Tilt3DCard'
import { staggerContainer, staggerItem } from '../../components/ui/PageTransition'

export default function Profile() {
  const { user, updateUserProfile } = useAuth()
  const [decks, setDecks] = useState([])
  const [myExams, setMyExams] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', avatarUrl: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({
      username: user.username || '',
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
    })
    Promise.all([
      deckService.getAll().catch(() => ({ data: [] })),
      examService.getMine().catch(() => ({ data: [] })),
    ]).then(([deckRes, examRes]) => {
      setDecks(Array.isArray(deckRes.data) ? deckRes.data : [])
      setMyExams(Array.isArray(examRes.data) ? examRes.data : [])
    })
  }, [user])

  const studyStats = useMemo(() => loadStudyStats(user?.id), [user?.id])

  const totalKnownCards = useMemo(() => {
    const byDeck = studyStats.cardStatusesByDeck || {}
    return Object.values(byDeck).reduce(
      (sum, statuses) => sum + Object.values(statuses).filter((val) => val === 'known').length,
      0,
    )
  }, [studyStats])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    setError('')
    try {
      await updateUserProfile(form)
      setNotice('Cập nhật hồ sơ thành công.')
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Không thể cập nhật hồ sơ.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <section className="container page empty">
        <h2>Vui lòng đăng nhập</h2>
        <Link className="btn primary" to="/login">Đăng nhập</Link>
      </section>
    )
  }

  return (
    <section className="container page">
      <div className="page-header">
        <div>
          <p className="eyebrow dark">TÀI KHOẢN &amp; TIẾN ĐỘ</p>
          <h1>Không gian học tập</h1>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setEditing((prev) => !prev)
            setNotice('')
            setError('')
          }}
        >
          {editing ? <><X size={15} /><span>Đóng</span></> : <><Pencil size={15} /><span>Chỉnh sửa hồ sơ</span></>}
        </button>
      </div>

      {notice && <p className="alert success">{notice}</p>}
      {error && <p className="alert error">{error}</p>}

      <div className="profile-layout">
        <div className="profile-card">
          {user.avatarUrl ? (
            <img className="avatar-img" src={user.avatarUrl} alt={user.username} />
          ) : (
            <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
          )}
          <div className="profile-info">
            <h2>{user.username}</h2>
            <p>{user.email || 'Chưa cập nhật email'}</p>
            <span className="profile-role-pill">{user.role}</span>
          </div>
        </div>

        {editing && (
          <motion.form
            className="profile-edit-card"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSaveProfile}
          >
            <h3>Cập nhật thông tin cá nhân</h3>
            <div className="profile-edit-grid">
              <label>Tên đăng nhập
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </label>
              <label>Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
            </div>
            <label>Ảnh đại diện (URL)
              <input placeholder="https://..." value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Hủy</button>
              <button className="btn primary" disabled={saving}>
                <Save size={15} />
                <span>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </div>

      <motion.div className="kpi-grid" variants={staggerContainer} initial="hidden" animate="show">
        <Tilt3DCard className="kpi-card" variants={staggerItem}>
          <span className="kpi-icon is-streak"><Flame size={20} /></span>
          <div>
            <strong>{studyStats.streak} ngày</strong>
            <span>Chuỗi học liên tiếp</span>
          </div>
        </Tilt3DCard>
        <Tilt3DCard className="kpi-card" variants={staggerItem}>
          <span className="kpi-icon is-known"><CheckCircle2 size={20} /></span>
          <div>
            <strong>{totalKnownCards} thẻ</strong>
            <span>Đã đánh dấu nhớ</span>
          </div>
        </Tilt3DCard>
        <Tilt3DCard className="kpi-card" variants={staggerItem}>
          <span className="kpi-icon is-reviews"><Award size={20} /></span>
          <div>
            <strong>{studyStats.totalReviewed} lượt</strong>
            <span>Tổng lượt ôn tập</span>
          </div>
        </Tilt3DCard>
        <Tilt3DCard className="kpi-card" variants={staggerItem}>
          <span className="kpi-icon is-decks"><ClipboardCheck size={20} /></span>
          <div>
            <strong>{decks.length} bộ · {myExams.length} đề</strong>
            <span>Thư viện học liệu</span>
          </div>
        </Tilt3DCard>
      </motion.div>

      <div className="profile-recent-section">
        <div className="profile-section-head">
          <h2><Layers size={18} /><span>Bộ thẻ học gần đây</span></h2>
          <Link className="back-link profile-all-link" to="/decks">Xem tất cả ›</Link>
        </div>

        {studyStats.recentDecks?.length ? (
          <div className="recent-deck-grid">
            {studyStats.recentDecks.map((item) => {
              const statuses = studyStats.cardStatusesByDeck?.[String(item.id)] || {}
              const known = Object.values(statuses).filter((s) => s === 'known').length
              return (
                <Tilt3DCard key={item.id} className="recent-deck-card">
                  <div className="recent-deck-accent" style={{ background: getSubjectGradient(item.subject) }} />
                  <div className="recent-deck-body">
                    <span className="recent-deck-subject">{item.subject}</span>
                    <h3>{item.title}</h3>
                    <p>{known > 0 ? `Đã nhớ ${known} thẻ` : 'Đã mở gần đây'}</p>
                    <Link className="btn primary" to={`/decks/${item.id}`}>
                      <BookOpen size={15} />
                      <span>Học tiếp</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </Tilt3DCard>
              )
            })}
          </div>
        ) : (
          <div className="empty profile-empty-recent">
            <h3>Bạn chưa mở bộ thẻ nào gần đây</h3>
            <p>Hãy chọn một bộ thẻ và bắt đầu ôn tập để ghi nhận chuỗi ngày học nhé.</p>
            <Link className="btn primary" to="/decks">Khám phá bộ thẻ</Link>
          </div>
        )}
      </div>
    </section>
  )
}
