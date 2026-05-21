import { describe, expect, it } from 'vitest'
import { createManagedUser, ensureSeedAdmin, loginWithUsers, registerUser, updateUserProfile } from '@/domain/auth'
import { SEED_ADMIN } from '@/data/seeds'

describe('auth domain', () => {
  it('ensures the seed admin exists', () => {
    const users = ensureSeedAdmin([])
    expect(users[0].email).toBe(SEED_ADMIN.email)
  })

  it('registers and authenticates a new user', () => {
    const registered = registerUser(ensureSeedAdmin([]), {
      firstName: 'Test',
      lastName: 'Agent',
      email: 'test.agent@crfc.cm',
      jobTitle: 'Charge',
      password: 'secret12',
    })
    expect(registered.success).toBe(true)
    if (!registered.success) return
    const currentUser = loginWithUsers(registered.users, 'test.agent', 'secret12')
    expect(currentUser?.email).toBe('test.agent@crfc.cm')
  })

  it('updates profile and password', () => {
    const users = ensureSeedAdmin([])
    const result = updateUserProfile(users, users[0], {
      firstName: 'Admin',
      currentPassword: 'shazam!2023',
      newPassword: 'nouveau123',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.updatedUser.firstName).toBe('Admin')
    expect(result.updatedUser.password).toBe('nouveau123')
  })

  it('allows an admin to create a managed user', () => {
    const result = createManagedUser(SEED_ADMIN, [SEED_ADMIN], {
      firstName: 'Paul',
      lastName: 'Ngono',
      email: 'paul.ngono@crfc.cm',
      jobTitle: 'Analyste',
      password: 'secret12',
      role: 'AGENT',
    })
    expect(result.success).toBe(true)
  })
})
