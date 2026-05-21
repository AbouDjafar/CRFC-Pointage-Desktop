import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { desktopBridge } from '@/bridge'
import { createManagedUser, deleteManagedUser, ensureSeedAdmin, loginWithUsers, registerUser, toggleManagedUserActive, updateUserProfile, userFullName } from '@/domain/auth'
import type { User, UserRole } from '@/types'

interface AuthContextValue {
  user: User | null
  allUsers: User[]
  loading: boolean
  login(loginId: string, password: string): Promise<boolean>
  logout(): Promise<void>
  register(data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string }): Promise<{ success: boolean; error?: string }>
  updateProfile(updates: { firstName?: string; lastName?: string; jobTitle?: string; currentPassword?: string; newPassword?: string }): Promise<{ success: boolean; error?: string }>
  createUser(data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string; role: UserRole }): Promise<{ success: boolean; error?: string }>
  deleteUser(id: string): Promise<void>
  toggleUserActive(id: string): Promise<void>
  getUserById(id: string): User | undefined
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const [rawUsers, sessionUserId] = await Promise.all([desktopBridge.getUsers(), desktopBridge.loadSession()])
      const users = ensureSeedAdmin(rawUsers)
      setAllUsers(users)
      if (users.length !== rawUsers.length) await desktopBridge.saveUsers(users)
      if (sessionUserId) {
        const currentUser = users.find((item) => item.id === sessionUserId && item.isActive) ?? null
        setUser(currentUser)
      }
      setLoading(false)
    }
    void init()
  }, [])

  const persistUsers = useCallback(async (users: User[]) => {
    setAllUsers(users)
    await desktopBridge.saveUsers(users)
  }, [])

  const login = useCallback(async (loginId: string, password: string) => {
    const currentUser = loginWithUsers(allUsers, loginId, password)
    if (!currentUser) return false
    await desktopBridge.saveSession(currentUser.id)
    setUser(currentUser)
    return true
  }, [allUsers])

  const logout = useCallback(async () => {
    await desktopBridge.clearSession()
    setUser(null)
  }, [])

  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string }) => {
    const result = registerUser(allUsers, data)
    if (!result.success) return result
    await persistUsers(result.users)
    return { success: true }
  }, [allUsers, persistUsers])

  const updateProfile = useCallback(async (updates: { firstName?: string; lastName?: string; jobTitle?: string; currentPassword?: string; newPassword?: string }) => {
    if (!user) return { success: false, error: 'Non connecte.' }
    const result = updateUserProfile(allUsers, user, updates)
    if (!result.success) return result
    await persistUsers(result.users)
    setUser(result.updatedUser)
    return { success: true }
  }, [allUsers, persistUsers, user])

  const createUser = useCallback(async (data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string; role: UserRole }) => {
    if (!user) return { success: false, error: 'Acces refuse.' }
    const result = createManagedUser(user, allUsers, data)
    if (!result.success) return result
    await persistUsers(result.users)
    return { success: true }
  }, [allUsers, persistUsers, user])

  const deleteUser = useCallback(async (id: string) => {
    if (!user) return
    const nextUsers = deleteManagedUser(user, allUsers, id)
    await persistUsers(nextUsers)
  }, [allUsers, persistUsers, user])

  const toggleUserActive = useCallback(async (id: string) => {
    if (!user) return
    const nextUsers = toggleManagedUserActive(user, allUsers, id)
    await persistUsers(nextUsers)
  }, [allUsers, persistUsers, user])

  const getUserById = useCallback((id: string) => allUsers.find((item) => item.id === id), [allUsers])

  const value = useMemo(() => ({
    user,
    allUsers,
    loading,
    login,
    logout,
    register,
    updateProfile,
    createUser,
    deleteUser,
    toggleUserActive,
    getUserById,
  }), [allUsers, createUser, deleteUser, getUserById, loading, login, logout, register, toggleUserActive, updateProfile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export { userFullName }
