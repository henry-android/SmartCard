import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <Link className="brand" to="/">SmartCard</Link>
          <nav className="nav-links">
            <NavLink to="/decks">Bộ thẻ</NavLink>
            <NavLink to="/exams">Kiểm tra</NavLink>
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="profile-link" to="/profile">{user.username}</Link>
                {user.role === 'ADMIN' && <Link className="btn ghost" to="/exams">Quản trị</Link>}
                <button className="btn ghost" type="button" onClick={handleLogout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <Link className="btn ghost" to="/login">Đăng nhập</Link>
                <Link className="btn primary" to="/signup">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="container">© 2026 SmartCard. Học thông minh mỗi ngày.</div>
      </footer>
    </>
  )
}
