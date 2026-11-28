import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import PageTransition from './components/ui/PageTransition'
import Home from './pages/home/Home'
import Login from './pages/login/Login'
import Register from './pages/register/Register'
import Decks from './pages/decks/Decks'
import DeckDetail from './pages/decks/DeckDetail'
import Exams from './pages/exams/Exams'
import Profile from './pages/user/Profile'
import NotFound from './pages/page404/Page404'

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/decks" element={<PageTransition><Decks /></PageTransition>} />
          <Route path="/decks/:id" element={<PageTransition><DeckDetail /></PageTransition>} />
          <Route path="/exams" element={<PageTransition><Exams /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        </Route>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}
