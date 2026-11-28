import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardCheck, Layers, LogOut, Menu, Sparkles, User, X } from 'lucide-react'
import { useAuth } from '../../common/hooks/authentication/AuthProvider'

const navItems = [
  { to: '/decks', label: 'Bộ thẻ', icon: Layers },
  { to: '/exams', label: 'Kiểm tra', icon: ClipboardCheck },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    setMobileOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <Link className="brand" to="/" onClick={() => setMobileOpen(false)}>
            <span className="brand-mark"><Sparkles size={18} /></span>
            <span>SmartCard</span>
          </Link>

          <nav className="nav-links" aria-label="Điều hướng chính">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} className={`nav-link-item ${isActive ? 'active' : ''}`}>
                  <Icon size={16} />
                  <span>{label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div className="nav-actions">
            {user ? (
              <>
                <Link className="profile-link" to="/profile">
                  <User size={15} />
                  <span>{user.username}</span>
                </Link>
                {user.role === 'ADMIN' && <Link className="btn ghost nav-admin-btn" to="/exams">Quản trị</Link>}
                <button className="btn ghost nav-logout-btn" type="button" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link className="btn ghost" to="/login">Đăng nhập</Link>
                <Link className="btn primary" to="/signup">Đăng ký</Link>
              </>
            )}
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="mobile-drawer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="container mobile-drawer-inner">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </NavLink>
                ))}
                {user && (
                  <>
                    <NavLink
                      to="/profile"
                      className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <User size={17} />
                      <span>Tài khoản ({user.username})</span>
                    </NavLink>
                    <button type="button" className="btn ghost full" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="container">© 2026 SmartCard. Học thông minh mỗi ngày.</div>
      </footer>
    </>
  )
}
