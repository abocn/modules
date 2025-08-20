import { db } from '../db'
import { user } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Check if a user has admin role by querying the database
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userResult = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return userResult[0]?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get user role from database
 * @param userId - The user ID to check
 * @returns Promise<string | null> - User role or null if not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userResult = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return userResult[0]?.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}