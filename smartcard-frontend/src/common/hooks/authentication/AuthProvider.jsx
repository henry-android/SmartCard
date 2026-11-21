import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../../api/services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.current()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    const { data } = await authService.login(credentials)
    setUser(data)
    return data
  }

  const signup = async (payload) => {
    const { data } = await authService.signup(payload)
    setUser(data)
    return data
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
