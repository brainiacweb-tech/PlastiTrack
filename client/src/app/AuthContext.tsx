import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../lib/api'
import { authenticateDemoUser, loadDemoUser } from '../lib/demo'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadDemoUser)

  async function login(email: string, password: string) {
    const response = authenticateDemoUser(email, password)
    localStorage.setItem('plastitrack-token', response.token)
    localStorage.setItem('plastitrack-user', JSON.stringify(response.user))
    setUser(response.user)
  }

  function logout() {
    localStorage.removeItem('plastitrack-token')
    localStorage.removeItem('plastitrack-user')
    setUser(null)
  }

  const value = useMemo(() => ({ user, loading: false, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
