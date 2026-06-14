import React, { createContext, useContext, useState, useCallback } from 'react'
import { login as apiLogin, register as apiRegister } from '../services/api'
import { queryClient } from '../queryClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('token') || null)

  const isAuthenticated = Boolean(token)

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    const { access_token } = data

    // Decode user info from token payload (basic JWT decode, no verification)
    let userInfo = { email }
    try {
      const payload = JSON.parse(atob(access_token.split('.')[1]))
      userInfo = {
        email: payload.sub || email,
        name: payload.name || email.split('@')[0],
      }
    } catch {
      userInfo = { email, name: email.split('@')[0] }
    }

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userInfo))
    setToken(access_token)
    setUser(userInfo)
    return data
  }, [])

  const register = useCallback(async (userData) => {
    const data = await apiRegister(userData)
    const { access_token } = data

    const userInfo = {
      email: userData.email,
      name: userData.name,
    }

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userInfo))
    setToken(access_token)
    setUser(userInfo)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    queryClient.clear()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
