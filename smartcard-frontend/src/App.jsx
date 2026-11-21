import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/home/Home'
import Login from './pages/login/Login'
import Register from './pages/register/Register'
import Decks from './pages/decks/Decks'
import DeckDetail from './pages/decks/DeckDetail'
import Exams from './pages/exams/Exams'
import Profile from './pages/user/Profile'
import NotFound from './pages/page404/Page404'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/decks/:id" element={<DeckDetail />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
