import { db } from '../db'
import { adminActions } from '../db/schema'

export interface AuditLogEntry {
  adminId: string
  action: string
  details: string
  targetType: "module" | "user" | "system" | "review"
  targetId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

export interface ModuleChangeInfo {
  id: string
  name: string
  oldValues: Record<string, unknown>
  newValues: Record<string, unknown>
}

export interface UserChangeInfo {
  id: string
  name: string
  oldValues: Record<string, unknown>
  newValues: Record<string, unknown>
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  const adminId = entry.adminId === 'system' ? 'SYSTEM' : entry.adminId

  await db.insert(adminActions).values({
    adminId,
    action: entry.action,
    details: entry.details,
    targetType: entry.targetType,
    targetId: entry.targetId,
    oldValues: entry.oldValues,
    newValues: entry.newValues,
  })
}

export async function logModuleEdit(
  adminId: string,
  moduleInfo: ModuleChangeInfo
): Promise<void> {
  const changedFields = Object.keys(moduleInfo.newValues).filter(
    key => JSON.stringify(moduleInfo.oldValues[key]) !== JSON.stringify(moduleInfo.newValues[key])
  )

  if (changedFields.length === 0) return

  const changeDetails = changedFields.map(field => {
    const oldValue = moduleInfo.oldValues[field]
    const newValue = moduleInfo.newValues[field]

    if (typeof oldValue === 'boolean' && typeof newValue === 'boolean') {
      return `${field}: ${oldValue} → ${newValue}`
    }
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return `${field}: [${oldValue.length} items] → [${newValue.length} items]`
    }
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      const oldPreview = oldValue.length > 50 ? oldValue.substring(0, 50) + '...' : oldValue
      const newPreview = newValue.length > 50 ? newValue.substring(0, 50) + '...' : newValue
      return `${field}: "${oldPreview}" → "${newPreview}"`
    }
    return `${field}: modified`
  }).join(', ')

  await logAdminAction({
    adminId,
    action: "Module Edited",
    details: `Updated module "${moduleInfo.name}": ${changeDetails}`,
    targetType: "module",
    targetId: moduleInfo.id,
    oldValues: moduleInfo.oldValues,
    newValues: moduleInfo.newValues,
  })
}

export async function logModuleDeletion(
  adminId: string,
  moduleId: string,
  moduleName: string,
  moduleData?: Record<string, unknown>
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "Module Deleted",
    details: `Deleted module: ${moduleName}`,
    targetType: "module",
    targetId: moduleId,
    oldValues: moduleData,
    newValues: undefined,
  })
}

export async function logReviewDeletion(
  adminId: string,
  reviewId: number,
  reviewData: {
    id: number
    rating: number
    comment: string | null
    userName: string | null
    moduleName: string | null
    userId: string
    moduleId: string
  }
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "Review Deleted",
    details: `Deleted ${reviewData.rating}-star review by ${reviewData.userName || 'Unknown User'} on module "${reviewData.moduleName || 'Unknown Module'}"`,
    targetType: "review",
    targetId: reviewId.toString(),
    oldValues: {
      rating: reviewData.rating,
      comment: reviewData.comment,
      userId: reviewData.userId,
      moduleId: reviewData.moduleId,
      userName: reviewData.userName,
      moduleName: reviewData.moduleName,
    },
    newValues: undefined,
  })
}

export function compareModuleData(oldData: Record<string, unknown>, newData: Record<string, unknown>): ModuleChangeInfo | null {
  const oldModule = oldData as Record<string, unknown>
  const newModule = newData as Record<string, unknown>

  if (!oldModule.id || !newModule.id) return null

  const relevantFields = [
    'name', 'description', 'shortDescription', 'author', 'category',
    'icon', 'images', 'isOpenSource', 'license', 'compatibility',
    'warnings', 'features', 'sourceUrl', 'communityUrl',
    'isFeatured', 'isRecommended', 'isPublished', 'status'
  ]

  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}

  for (const field of relevantFields) {
    if (field in oldModule) oldValues[field] = oldModule[field]
    if (field in newModule) newValues[field] = newModule[field]
  }

  return {
    id: String(oldModule.id),
    name: String(oldModule.name || 'Unknown Module'),
    oldValues,
    newValues,
  }
}

export async function logUserEdit(
  adminId: string,
  userInfo: UserChangeInfo
): Promise<void> {
  const changedFields = Object.keys(userInfo.newValues).filter(
    key => JSON.stringify(userInfo.oldValues[key]) !== JSON.stringify(userInfo.newValues[key])
  )

  if (changedFields.length === 0) return

  const changeDetails = changedFields.map(field => {
    const oldValue = userInfo.oldValues[field]
    const newValue = userInfo.newValues[field]

    if (field === 'role') {
      return `${field}: ${oldValue} → ${newValue}`
    }
    if (field === 'emailVerified') {
      return `${field}: ${oldValue ? 'verified' : 'unverified'} → ${newValue ? 'verified' : 'unverified'}`
    }
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      const oldPreview = oldValue.length > 30 ? oldValue.substring(0, 30) + '...' : oldValue
      const newPreview = newValue.length > 30 ? newValue.substring(0, 30) + '...' : newValue
      return `${field}: "${oldPreview}" → "${newPreview}"`
    }
    return `${field}: modified`
  }).join(', ')

  await logAdminAction({
    adminId,
    action: "User Edited",
    details: `Updated user "${userInfo.name}": ${changeDetails}`,
    targetType: "user",
    targetId: userInfo.id,
    oldValues: userInfo.oldValues,
    newValues: userInfo.newValues,
  })
}

export function compareUserData(oldData: Record<string, unknown>, newData: Record<string, unknown>): UserChangeInfo | null {
  const oldUser = oldData as Record<string, unknown>
  const newUser = newData as Record<string, unknown>

  if (!oldUser.id || !newUser.id) return null

  const relevantFields = [
    'name', 'email', 'role', 'emailVerified'
  ]

  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}

  for (const field of relevantFields) {
    if (field in oldUser) oldValues[field] = oldUser[field]
    if (field in newUser) newValues[field] = newUser[field]
  }

  return {
    id: String(oldUser.id),
    name: String(oldUser.name || 'Unknown User'),
    oldValues,
    newValues,
  }
}