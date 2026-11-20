import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form)
      navigate('/decks')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-brand">
        <Link className="auth-home" to="/">‹ Trang chủ</Link>
        <div>
          <h1>Chinh phục mọi bộ thẻ, học mọi lúc mọi nơi.</h1>
          <p>Cách học hiệu quả nhất. Đăng ký miễn phí ngay!</p>
        </div>
        <strong>SmartCard</strong>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <h2>Đăng nhập</h2>
          {error && <div className="alert error">{error}</div>}
          <label>Tên đăng nhập hoặc email
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label>Mật khẩu
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button className="btn primary full" disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <p className="auth-switch">Chưa có tài khoản? <Link to="/signup">Đăng ký ngay</Link></p>
        </form>
      </div>
    </section>
  )
}
