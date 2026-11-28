import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signup(form)
      navigate('/decks')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng ký.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-brand">
        <div className="auth-orb auth-orb-1" aria-hidden="true" />
        <div className="auth-orb auth-orb-2" aria-hidden="true" />
        <Link className="auth-home" to="/">‹ Trang chủ</Link>
        <div className="auth-brand-body">
          <motion.div
            className="auth-floating-card"
            animate={{ y: [0, -8, 0], rotate: [2, -1, 2] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <span><Sparkles size={14} /> SmartCard</span>
            <strong>Tạo bộ thẻ &amp; luyện đề AI</strong>
          </motion.div>
          <h1>Bắt đầu hành trình học tập.</h1>
          <p>Tạo tài khoản và quản lý bộ thẻ của bạn.</p>
        </div>
        <strong>SmartCard</strong>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <h2>Tạo tài khoản</h2>
          {error && <div className="alert error">{error}</div>}
          <label>Tên đăng nhập<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Mật khẩu<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>Xác nhận mật khẩu<input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required /></label>
          <button className="btn primary full" disabled={loading}>{loading ? 'Đang tạo...' : 'Đăng ký'}</button>
          <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </form>
      </div>
    </section>
  )
}
