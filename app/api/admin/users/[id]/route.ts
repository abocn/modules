import { NextResponse } from 'next/server'
import { updateUserRole, getUserWithStats, deleteUser, updateUser } from '@/lib/db-utils'
import { user, adminActions } from '@/db/schema'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { logUserEdit, compareUserData } from '@/lib/audit-utils'
import { withAdminAuth } from '@/lib/middleware/admin-auth'
import { withErrorHandling, createErrorResponse } from '@/lib/middleware/error-handler'

/**
 * Get user details by ID
 * @description Retrieve detailed information about a specific user including statistics. Admin access required.
 * @tags Admin - Users
 * @auth Admin role required
 */
export const GET = withErrorHandling(withAdminAuth(async (_request, context) => {
  const { id } = await context.params as { id: string }

    const userData = await getUserWithStats(id)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...userData,
      joinDate: userData.createdAt.toISOString().split('T')[0],
      lastActive: userData.updatedAt.toISOString().split('T')[0],
    })
}))

/**
 * Update user information or role
 * @description Modify user details or change user role. Admin access required.
 * @tags Admin - Users
 * @auth Admin role required
 */
export const PATCH = withErrorHandling(withAdminAuth(async (request, context, adminUser) => {
  const { id } = await context.params as { id: string }

    const body = await request.json()
    const { action, role, name, email } = body

    if (id === adminUser.id && action === 'changeRole' && role !== 'admin') {
      return createErrorResponse(new Error('Cannot change your own admin role'), 400)
    }

    if (action === 'changeRole' && role) {
      const currentUser = await db.select().from(user).where(eq(user.id, id)).limit(1)
      if (currentUser.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const oldUserData = currentUser[0]
      await updateUserRole(id, role)

      const changeInfo = compareUserData(
        oldUserData as Record<string, unknown>,
        { ...oldUserData, role } as Record<string, unknown>
      )

      if (changeInfo) {
        await logUserEdit(adminUser.id, changeInfo)
      }

      return NextResponse.json({
        message: `User role updated to ${role}`
      })
    }

    if (action === 'editUser') {
      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
      }
      const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1)
      if (existingUser[0] && existingUser[0].id !== id) {
        return NextResponse.json({ error: 'Email is already taken' }, { status: 400 })
      }

      const currentUser = await db.select().from(user).where(eq(user.id, id)).limit(1)
      if (currentUser.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const oldUserData = currentUser[0]
      await updateUser(id, { name: name.trim(), email: email.trim() })

      const changeInfo = compareUserData(
        oldUserData as Record<string, unknown>,
        { ...oldUserData, name: name.trim(), email: email.trim() } as Record<string, unknown>
      )

      if (changeInfo) {
        await logUserEdit(adminUser.id, changeInfo)
      }

      return NextResponse.json({
        message: 'User updated successfully'
      })
    }

    return createErrorResponse(new Error('Invalid action'), 400)
}))

/**
 * Delete a user account
 * @description Permanently delete a user account and all associated data. Admin access required.
 * @tags Admin - Users
 * @auth Admin role required
 */
export const DELETE = withErrorHandling(withAdminAuth(async (_request, context, adminUser) => {
  const { id } = await context.params as { id: string }

    if (id === adminUser.id) {
      return createErrorResponse(new Error('Cannot delete your own account'), 400)
    }

    const userToDelete = await getUserWithStats(id)
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await deleteUser(id)

    await db.insert(adminActions).values({
      adminId: adminUser.id,
      action: 'User Deleted',
      details: `Deleted user: ${userToDelete.name} (${userToDelete.email})`,
      targetType: 'user',
      targetId: id,
    })

    return NextResponse.json({
      message: 'User deleted successfully'
    })
}))