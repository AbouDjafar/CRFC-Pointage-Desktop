import { SEED_ADMIN } from '@/data/seeds'
import { genId } from '@/lib/id'
import type { User, UserRole } from '@/types'

export function ensureSeedAdmin(users: User[]) {
  return users.some((user) => user.id === SEED_ADMIN.id) ? users : [SEED_ADMIN, ...users]
}

export function userFullName(user: User) {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function loginWithUsers(users: User[], loginId: string, password: string) {
  const id = loginId.trim().toLowerCase()
  return (
    users.find((user) => {
      const emailLower = user.email.toLowerCase()
      const shortLogin = emailLower.split('@')[0]
      return (emailLower === id || shortLogin === id) && user.password === password && user.isActive
    }) ?? null
  )
}

export function registerUser(
  users: User[],
  data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string },
) {
  const email = data.email.trim().toLowerCase()
  if (!email.includes('@') || email.length < 5) return { success: false as const, error: 'Email invalide.' }
  if (data.password.length < 6) return { success: false as const, error: 'Mot de passe trop court (6 caracteres min).' }
  if (!data.firstName.trim() || !data.lastName.trim() || !data.jobTitle.trim()) return { success: false as const, error: 'Tous les champs sont obligatoires.' }
  if (users.some((user) => user.email.toLowerCase() === email)) return { success: false as const, error: 'Cet email est deja utilise.' }

  const newUser: User = {
    id: genId(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email,
    jobTitle: data.jobTitle.trim(),
    password: data.password,
    role: 'AGENT',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  return { success: true as const, users: [...users, newUser], createdUser: newUser }
}

export function updateUserProfile(users: User[], currentUser: User, updates: { firstName?: string; lastName?: string; jobTitle?: string; currentPassword?: string; newPassword?: string }) {
  if (updates.newPassword) {
    if (updates.currentPassword !== currentUser.password) return { success: false as const, error: 'Mot de passe actuel incorrect.' }
    if (updates.newPassword.length < 6) return { success: false as const, error: 'Nouveau mot de passe trop court.' }
  }
  const updated: User = {
    ...currentUser,
    firstName: updates.firstName?.trim() || currentUser.firstName,
    lastName: updates.lastName?.trim() || currentUser.lastName,
    jobTitle: updates.jobTitle?.trim() || currentUser.jobTitle,
    password: updates.newPassword || currentUser.password,
  }
  return { success: true as const, users: users.map((user) => (user.id === currentUser.id ? updated : user)), updatedUser: updated }
}

export function createManagedUser(actor: User, users: User[], data: { firstName: string; lastName: string; email: string; jobTitle: string; password: string; role: UserRole }) {
  if (actor.role !== 'ADMIN') return { success: false as const, error: 'Acces refuse.' }
  const email = data.email.trim().toLowerCase()
  if (!email.includes('@') || email.length < 5) return { success: false as const, error: 'Email invalide.' }
  if (data.password.length < 6) return { success: false as const, error: 'Mot de passe trop court.' }
  if (!data.firstName.trim() || !data.lastName.trim() || !data.jobTitle.trim()) return { success: false as const, error: 'Tous les champs sont obligatoires.' }
  if (users.some((user) => user.email.toLowerCase() === email)) return { success: false as const, error: 'Cet email est deja utilise.' }
  return {
    success: true as const,
    users: [
      ...users,
      {
        id: genId(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        jobTitle: data.jobTitle.trim(),
        password: data.password,
        role: data.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: actor.id,
      },
    ],
  }
}

export function deleteManagedUser(actor: User, users: User[], targetId: string) {
  if (actor.role !== 'ADMIN' || targetId === actor.id || targetId === SEED_ADMIN.id) return users
  return users.filter((user) => user.id !== targetId)
}

export function toggleManagedUserActive(actor: User, users: User[], targetId: string) {
  if (actor.role !== 'ADMIN' || targetId === actor.id || targetId === SEED_ADMIN.id) return users
  return users.map((user) => (user.id === targetId ? { ...user, isActive: !user.isActive } : user))
}
