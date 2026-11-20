import { Link } from 'react-router-dom'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function Profile() {
  const { user } = useAuth()

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
      <p className="eyebrow dark">TÀI KHOẢN</p>
      <h1>Thông tin cá nhân</h1>
      <div className="profile-card">
        <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
        <div><p><strong>Tên đăng nhập:</strong> {user.username}</p><p><strong>Email:</strong> {user.email}</p><p><strong>Vai trò:</strong> {user.role}</p></div>
      </div>
    </section>
  )
}
