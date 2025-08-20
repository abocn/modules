import { db } from '../db'
import { modules, ratings, releases, user, account, replies, helpfulVotes, githubTokens, releaseSchedule, moduleGithubSync } from '../db/schema'
import { eq, desc, avg, count, sql, and, gte, ilike, or, lte } from 'drizzle-orm'
import type { Module, AdminModule, DbModule, Rating, Release } from '@/types/module'
import type { UserAdvancedFilters, UserQueryResult } from '@/types/admin'

/**
 * Transform a database module to a Module object with computed fields
 * @param dbModule - Raw module from database
 * @param includeReleases - Whether to include all releases in the response
 * @returns Module object with latest release info, ratings, and download stats
 */
export async function transformDbModuleToModule(dbModule: DbModule, includeReleases = false): Promise<Module> {
  const latestRelease = await db
    .select()
    .from(releases)
    .where(and(eq(releases.moduleId, dbModule.id), eq(releases.isLatest, true)))
    .limit(1)

  const ratingStats = await db
    .select({
      avgRating: avg(ratings.rating),
      reviewCount: count(ratings.id),
    })
    .from(ratings)
    .where(eq(ratings.moduleId, dbModule.id))
    .groupBy(ratings.moduleId)

  const downloadStats = await db
    .select({
      totalDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
    })
    .from(releases)
    .where(eq(releases.moduleId, dbModule.id))

  const release = latestRelease[0]
  const stats = ratingStats[0]
  const downloads = Number(downloadStats[0]?.totalDownloads) || 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const lastUpdateDate = release?.createdAt || dbModule.lastUpdated
  const isRecentlyUpdated = lastUpdateDate > thirtyDaysAgo

  let allReleases: Release[] | undefined
  if (includeReleases) {
    allReleases = await getModuleReleases(dbModule.id)
  }

  return {
    id: dbModule.id,
    name: dbModule.name,
    slug: dbModule.slug,
    description: dbModule.description,
    shortDescription: dbModule.shortDescription,
    version: release?.version || '1.0.0',
    author: dbModule.author,
    category: dbModule.category,
    downloads,
    rating: Number(stats?.avgRating) || 0,
    reviewCount: Number(stats?.reviewCount) || 0,
    lastUpdated: (release?.createdAt || dbModule.lastUpdated).toISOString().split('T')[0], // YYYY-MM-DD
    size: release?.size || '0 MB',
    icon: dbModule.icon || undefined,
    images: dbModule.images || undefined,
    isOpenSource: dbModule.isOpenSource,
    license: dbModule.license,
    compatibility: dbModule.compatibility,
    warnings: dbModule.warnings,
    features: dbModule.features,
    changelog: release?.changelog || '',
    downloadUrl: release?.downloadUrl || '',
    sourceUrl: dbModule.sourceUrl || undefined,
    communityUrl: dbModule.communityUrl || undefined,
    isFeatured: dbModule.isFeatured,
    isRecentlyUpdated,
    isRecommended: dbModule.isRecommended,
    isPublished: dbModule.isPublished,
    status: dbModule.status,
    submittedBy: dbModule.submittedBy,
    createdAt: dbModule.createdAt.toISOString().split('T')[0],
    latestRelease: release || null,
    releases: allReleases,
  }
}

/**
 * Transform multiple database modules to Module objects with optimized batch queries
 * Fetches all related data (releases, ratings, downloads) in single queries for performance
 * @param dbModules - Array of raw modules from database
 * @returns Array of Module objects with computed fields
 */
export async function transformDbModulesToModulesBatch(dbModules: DbModule[]): Promise<Module[]> {
  if (dbModules.length === 0) return []

  const moduleIds = dbModules.map(m => m.id)

  const latestReleases = await db
    .select()
    .from(releases)
    .where(and(
      sql`${releases.moduleId} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`,
      eq(releases.isLatest, true)
    ))

  const releaseMap = new Map<string, typeof releases.$inferSelect>()
  latestReleases.forEach(release => {
    releaseMap.set(release.moduleId, release)
  })

  const ratingStats = await db
    .select({
      moduleId: ratings.moduleId,
      avgRating: avg(ratings.rating),
      reviewCount: count(ratings.id),
    })
    .from(ratings)
    .where(sql`${ratings.moduleId} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(ratings.moduleId)

  const ratingMap = new Map<string, { avgRating: number; reviewCount: number }>()
  ratingStats.forEach(stat => {
    ratingMap.set(stat.moduleId, {
      avgRating: Number(stat.avgRating) || 0,
      reviewCount: Number(stat.reviewCount) || 0,
    })
  })

  const downloadStats = await db
    .select({
      moduleId: releases.moduleId,
      totalDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
    })
    .from(releases)
    .where(sql`${releases.moduleId} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(releases.moduleId)

  const downloadMap = new Map<string, number>()
  downloadStats.forEach(stat => {
    downloadMap.set(stat.moduleId, Number(stat.totalDownloads) || 0)
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return dbModules.map(dbModule => {
    const release = releaseMap.get(dbModule.id)
    const stats = ratingMap.get(dbModule.id)
    const downloads = downloadMap.get(dbModule.id) || 0

    const lastUpdateDate = release?.createdAt || dbModule.lastUpdated
    const isRecentlyUpdated = lastUpdateDate > thirtyDaysAgo

    return {
      id: dbModule.id,
      name: dbModule.name,
      slug: dbModule.slug,
      description: dbModule.description,
      shortDescription: dbModule.shortDescription,
      version: release?.version || '1.0.0',
      author: dbModule.author,
      category: dbModule.category,
      downloads,
      rating: stats?.avgRating || 0,
      reviewCount: stats?.reviewCount || 0,
      lastUpdated: (release?.createdAt || dbModule.lastUpdated).toISOString().split('T')[0],
      size: release?.size || '0 MB',
      icon: dbModule.icon || undefined,
      images: dbModule.images || undefined,
      isOpenSource: dbModule.isOpenSource,
      license: dbModule.license,
      compatibility: dbModule.compatibility,
      warnings: dbModule.warnings,
      features: dbModule.features,
      changelog: release?.changelog || '',
      downloadUrl: release?.downloadUrl || '',
      sourceUrl: dbModule.sourceUrl || undefined,
      communityUrl: dbModule.communityUrl || undefined,
      isFeatured: dbModule.isFeatured,
      isRecentlyUpdated,
      isRecommended: dbModule.isRecommended,
      isPublished: dbModule.isPublished,
      status: dbModule.status,
      submittedBy: dbModule.submittedBy,
      createdAt: dbModule.createdAt.toISOString().split('T')[0],
      latestRelease: release ? {
        id: release.id,
        moduleId: release.moduleId,
        version: release.version,
        downloadUrl: release.downloadUrl,
        size: release.size,
        changelog: release.changelog,
        downloads: release.downloads,
        isLatest: release.isLatest,
        githubReleaseId: release.githubReleaseId,
        githubTagName: release.githubTagName,
        assets: release.assets,
        createdAt: release.createdAt,
        updatedAt: release.updatedAt,
      } : null,
      releases: undefined,
    }
  })
}

export async function transformDbModuleToAdminModule(dbModule: DbModule, includeReleases = false): Promise<AdminModule> {
  const baseModule = await transformDbModuleToModule(dbModule, includeReleases)
  return {
    ...baseModule,
    reviewNotes: dbModule.reviewNotes,
  }
}

/**
 * Get all published modules with optimized queries
 * @returns Array of modules with latest release data
 */
export async function getAllModules(): Promise<Module[]> {
  const dbModules = await db.select().from(modules).where(eq(modules.isPublished, true))
  return transformDbModulesToModulesBatch(dbModules)
}

export async function getModuleById(id: string, includeReleases = false): Promise<Module | null> {
  const dbModule = await db
    .select()
    .from(modules)
    .where(eq(modules.id, id))
    .limit(1)

  if (!dbModule[0]) return null

  return transformDbModuleToModule(dbModule[0], includeReleases)
}

export async function getModuleBySlug(slug: string, includeReleases = false): Promise<Module | null> {
  const dbModule = await db
    .select()
    .from(modules)
    .where(eq(modules.slug, slug))
    .limit(1)

  if (!dbModule[0]) return null

  return transformDbModuleToModule(dbModule[0], includeReleases)
}

export async function checkSlugExists(slug: string): Promise<boolean> {
  const result = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.slug, slug))
    .limit(1)

  return result.length > 0
}

/**
 * Get modules by category with optimized queries
 * @param category - Module category to filter by
 * @returns Array of modules in the specified category
 */
export async function getModulesByCategory(category: string): Promise<Module[]> {
  const dbModules = await db
    .select()
    .from(modules)
    .where(and(eq(modules.category, category), eq(modules.isPublished, true)))
  
  return transformDbModulesToModulesBatch(dbModules)
}

/**
 * Get featured modules with optimized queries
 * @returns Array of featured modules
 */
export async function getFeaturedModules(): Promise<Module[]> {
  const dbModules = await db
    .select()
    .from(modules)
    .where(and(eq(modules.isFeatured, true), eq(modules.isPublished, true)))
  
  return transformDbModulesToModulesBatch(dbModules)
}

/**
 * Get recommended modules with optimized queries
 * @returns Array of recommended modules
 */
export async function getRecommendedModules(): Promise<Module[]> {
  const dbModules = await db
    .select()
    .from(modules)
    .where(and(eq(modules.isRecommended, true), eq(modules.isPublished, true)))
  
  return transformDbModulesToModulesBatch(dbModules)
}

/**
 * Get modules that have had releases in the last 30 days
 * @returns Array of modules sorted by latest release date (newest first)
 */
export async function getRecentlyUpdatedModules(): Promise<Module[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentReleases = await db
    .select({
      moduleId: releases.moduleId,
      latestReleaseDate: sql<Date>`MAX(${releases.createdAt})`.as('latestReleaseDate'),
    })
    .from(releases)
    .innerJoin(modules, eq(releases.moduleId, modules.id))
    .where(
      and(
        gte(releases.createdAt, thirtyDaysAgo),
        eq(modules.isPublished, true)
      )
    )
    .groupBy(releases.moduleId)
    .orderBy(desc(sql`MAX(${releases.createdAt})`))

  if (recentReleases.length === 0) {
    return []
  }

  const moduleIds = recentReleases.map(r => r.moduleId).filter(Boolean)

  const dbModules = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.isPublished, true),
        sql`${modules.id} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`
      )
    )

  const releaseDateMap = new Map(recentReleases.map(r => [r.moduleId, r.latestReleaseDate]))

  const transformedModules = await transformDbModulesToModulesBatch(dbModules)

  return transformedModules.sort((a, b) => {
    const rawDateA = releaseDateMap.get(a.id)
    const rawDateB = releaseDateMap.get(b.id)
    const dateA = rawDateA ? new Date(rawDateA) : new Date(0)
    const dateB = rawDateB ? new Date(rawDateB) : new Date(0)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Get trending modules based on various algorithms and time ranges
 * @param options - Options for fetching trending modules
 * @param options.limit - Maximum number of modules to return (default: 20)
 * @param options.algorithm - Algorithm to use for determining trending modules (default: 'downloads')
 * @param options.range - Time range to consider for trending data (default: '7d')
 * @returns Promise<Module[]> - Array of trending modules
 */
export async function getTrendingModules(options: {
  limit?: number
  algorithm?: 'downloads' | 'rating' | 'recent' | 'combined'
  range?: '7d' | '30d' | 'all'
} = {}): Promise<Module[]> {
  const { limit = 20, algorithm = 'downloads', range = '7d' } = options

  let dateFilter: Date | undefined
  if (range === '7d') {
    dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - 7)
  } else if (range === '30d') {
    dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - 30)
  }

  if (algorithm === 'downloads') {
    const trendingData = await db
      .select({
        moduleId: releases.moduleId,
        recentDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`.as('recentDownloads'),
      })
      .from(releases)
      .where(dateFilter ? gte(releases.createdAt, dateFilter) : undefined)
      .groupBy(releases.moduleId)
      .orderBy(desc(sql`COALESCE(SUM(${releases.downloads}), 0)`))
      .limit(limit)

    const moduleIds = trendingData.map(item => item.moduleId).filter(Boolean)

    if (moduleIds.length === 0) {
      const dbModules = await db
        .select()
        .from(modules)
        .where(eq(modules.isPublished, true))
        .orderBy(desc(modules.createdAt))
        .limit(limit)

      const modulePromises = dbModules.map(dbModule => transformDbModuleToModule(dbModule))
      return Promise.all(modulePromises)
    }

    const dbModules = await db
      .select()
      .from(modules)
      .where(
        and(
          eq(modules.isPublished, true),
          sql`${modules.id} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`
        )
      )

    const modulesWithData = await Promise.all(
      dbModules.map(async (dbModule) => {
        const transformedModule = await transformDbModuleToModule(dbModule)
        const trendingItem = trendingData.find(item => item.moduleId === dbModule.id)
        return {
          ...transformedModule,
          recentDownloads: trendingItem?.recentDownloads || 0
        }
      })
    )

    return modulesWithData.sort((a, b) => b.recentDownloads - a.recentDownloads)
  } else {
    const whereConditions = [eq(modules.isPublished, true)]

    if (dateFilter) {
      whereConditions.push(gte(modules.lastUpdated, dateFilter))
    }

    const dbModules = await db
      .select()
      .from(modules)
      .where(and(...whereConditions))
      .limit(limit * 2)

    const modulePromises = dbModules.map(dbModule => transformDbModuleToModule(dbModule))
    const allModules = await Promise.all(modulePromises)

    return allModules.slice(0, limit)
  }
}

/**
 * Search modules by name, description, author, or features
 * @param query - Search query string
 * @returns Array of modules matching the search criteria
 */
export async function searchModules(query: string): Promise<Module[]> {
  const dbModules = await db
    .select()
    .from(modules)
    .where(
      and(
        sql`
          ${modules.name} ILIKE ${`%${query}%`} OR
          ${modules.description} ILIKE ${`%${query}%`} OR
          ${modules.author} ILIKE ${`%${query}%`} OR
          ${modules.features}::text ILIKE ${`%${query}%`}
        `,
        eq(modules.isPublished, true)
      )
    )

  return transformDbModulesToModulesBatch(dbModules)
}

export async function getModuleRatings(moduleId: string): Promise<Rating[]> {
  return db
    .select({
      id: ratings.id,
      moduleId: ratings.moduleId,
      userId: ratings.userId,
      rating: ratings.rating,
      comment: ratings.comment,
      helpful: ratings.helpful,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(ratings)
    .leftJoin(user, eq(ratings.userId, user.id))
    .where(eq(ratings.moduleId, moduleId))
    .orderBy(desc(ratings.createdAt))
}

/**
 * Get all releases for a module ordered by creation date
 * @param moduleId - The module ID to get releases for
 * @returns Array of releases sorted by creation date (newest first)
 */
export async function getModuleReleases(moduleId: string): Promise<Release[]> {
  return db
    .select()
    .from(releases)
    .where(eq(releases.moduleId, moduleId))
    .orderBy(desc(releases.createdAt))
}

export async function getLatestRelease(moduleId: string): Promise<Release | null> {
  const result = await db
    .select()
    .from(releases)
    .where(and(eq(releases.moduleId, moduleId), eq(releases.isLatest, true)))
    .limit(1)

  return result[0] || null
}

export async function getUserRating(moduleId: string, userId: string): Promise<Rating | null> {
  const result = await db
    .select({
      id: ratings.id,
      moduleId: ratings.moduleId,
      userId: ratings.userId,
      rating: ratings.rating,
      comment: ratings.comment,
      helpful: ratings.helpful,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(ratings)
    .leftJoin(user, eq(ratings.userId, user.id))
    .where(and(eq(ratings.moduleId, moduleId), eq(ratings.userId, userId)))
    .limit(1)

  return result[0] || null
}

export async function createRating(data: {
  moduleId: string
  userId: string
  rating: number
  comment?: string
}): Promise<Rating> {
  const existingRating = await getUserRating(data.moduleId, data.userId)
  if (existingRating) {
    throw new Error('You have already reviewed this module')
  }

  const result = await db
    .insert(ratings)
    .values({
      moduleId: data.moduleId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment,
    })
    .returning()

  return result[0]
}

export async function updateRating(data: {
  moduleId: string
  userId: string
  rating: number
  comment?: string
}): Promise<Rating> {
  const result = await db
    .update(ratings)
    .set({
      rating: data.rating,
      comment: data.comment,
      updatedAt: new Date(),
    })
    .where(and(eq(ratings.moduleId, data.moduleId), eq(ratings.userId, data.userId)))
    .returning()

  if (result.length === 0) {
    throw new Error('Rating not found')
  }

  return result[0]
}

export async function incrementReleaseDownloads(releaseId: number): Promise<void> {
  await db
    .update(releases)
    .set({
      downloads: sql`${releases.downloads} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(releases.id, releaseId))
}

// = Admin Functions =
export async function deleteModule(moduleId: string): Promise<void> {
  await db.delete(modules).where(eq(modules.id, moduleId))
}

export async function updateModuleFeaturedStatus(
  moduleId: string,
  isFeatured: boolean
): Promise<void> {
  await db
    .update(modules)
    .set({
      isFeatured,
      updatedAt: new Date(),
    })
    .where(eq(modules.id, moduleId))
}

export async function updateModuleRecommendedStatus(
  moduleId: string,
  isRecommended: boolean
): Promise<void> {
  await db
    .update(modules)
    .set({
      isRecommended,
      updatedAt: new Date(),
    })
    .where(eq(modules.id, moduleId))
}

// = User Management Functions =
export async function getAllUsers() {
  return db
    .select({
      user,
      provider: account.providerId,
    })
    .from(user)
    .leftJoin(account, eq(user.id, account.userId))
    .orderBy(desc(user.createdAt))
}

export async function searchUsers(query: string, roleFilter?: string) {
  let whereClause = or(
    ilike(user.name, `%${query}%`),
    ilike(user.email, `%${query}%`)
  )

  if (roleFilter && roleFilter !== 'all') {
    whereClause = and(whereClause, eq(user.role, roleFilter))
  }

  return db
    .select({
      user,
      provider: account.providerId,
    })
    .from(user)
    .leftJoin(account, eq(user.id, account.userId))
    .where(whereClause)
    .orderBy(desc(user.createdAt))
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  await db
    .update(user)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
}

export async function getUserStats() {
  const totalUsers = await db.select({ count: count() }).from(user)
  const adminUsers = await db.select({ count: count() }).from(user).where(eq(user.role, 'admin'))

  return {
    total: totalUsers[0]?.count || 0,
    admins: adminUsers[0]?.count || 0,
  }
}

export async function deleteUser(userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId))
}

export async function updateUser(userId: string, data: {
  name?: string
  email?: string
  role?: string
}): Promise<void> {
  await db
    .update(user)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
}

export async function getUserById(userId: string) {
  const result = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  return result[0] || null
}

export async function getUserWithStats(userId: string) {
  const userData = await getUserById(userId)
  if (!userData) return null

  const providerInfo = await db
    .select({ provider: account.providerId })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1)
  const moduleCount = await db
    .select({ count: count() })
    .from(modules)
    .where(eq(modules.author, userData.name))
  const reviewCount = await db
    .select({ count: count() })
    .from(ratings)
    .where(eq(ratings.userId, userId))

  return {
    ...userData,
    provider: providerInfo[0]?.provider || null,
    modulesSubmitted: moduleCount[0]?.count || 0,
    reviewsWritten: reviewCount[0]?.count || 0,
  }
}

export async function searchUsersAdvanced(filters: UserAdvancedFilters): Promise<UserQueryResult[]> {
  const conditions = []

  if (filters.query && filters.query.trim()) {
    conditions.push(
      or(
        ilike(user.name, `%${filters.query}%`),
        ilike(user.email, `%${filters.query}%`)
      )
    )
  }

  if (filters.roleFilter && filters.roleFilter !== 'all') {
    conditions.push(eq(user.role, filters.roleFilter))
  }

  if (filters.providerFilter && filters.providerFilter !== 'all') {
    conditions.push(eq(account.providerId, filters.providerFilter))
  }

  if (filters.joinDateFrom) {
    conditions.push(gte(user.createdAt, new Date(filters.joinDateFrom)))
  }
  if (filters.joinDateTo) {
    const endDate = new Date(filters.joinDateTo)
    endDate.setHours(23, 59, 59, 999)
    conditions.push(lte(user.createdAt, endDate))
  }

  if (filters.lastActiveFrom) {
    conditions.push(gte(user.updatedAt, new Date(filters.lastActiveFrom)))
  }
  if (filters.lastActiveTo) {
    const endDate = new Date(filters.lastActiveTo)
    endDate.setHours(23, 59, 59, 999)
    conditions.push(lte(user.updatedAt, endDate))
  }

  if (filters.emailVerified !== undefined) {
    const emailVerifiedBool = typeof filters.emailVerified === 'string'
      ? filters.emailVerified === 'true'
      : filters.emailVerified
    conditions.push(eq(user.emailVerified, emailVerifiedBool))
  }

  const baseQuery = db
    .select({
      user,
      provider: account.providerId,
    })
    .from(user)
    .leftJoin(account, eq(user.id, account.userId))

  let whereClause
  if (conditions.length > 0) {
    whereClause = and(...conditions)
  }

  const users = await (whereClause ? baseQuery.where(whereClause) : baseQuery)
    .orderBy(desc(user.createdAt))

  if (filters.minModules !== undefined || filters.minReviews !== undefined) {
    const usersWithCounts = await Promise.all(
      users.map(async (userRow) => {
        const userData = userRow.user || userRow

        const moduleCount = await db
          .select({ count: count() })
          .from(modules)
          .where(eq(modules.author, userData.name))

        const reviewCount = await db
          .select({ count: count() })
          .from(ratings)
          .where(eq(ratings.userId, userData.id))

        const modulesCount = moduleCount[0]?.count || 0
        const reviewsCount = reviewCount[0]?.count || 0

        const meetsModuleReq = filters.minModules === undefined || modulesCount >= filters.minModules
        const meetsReviewReq = filters.minReviews === undefined || reviewsCount >= filters.minReviews

        return {
          ...userRow,
          modulesCount,
          reviewsCount,
          meetsRequirements: meetsModuleReq && meetsReviewReq
        }
      })
    )

    return usersWithCounts.filter(u => u.meetsRequirements)
  }

  return users
}

// = Admin Reviews Functions =
export async function getAllReviewsForAdmin() {
  return db
    .select({
      id: ratings.id,
      rating: ratings.rating,
      comment: ratings.comment,
      helpful: ratings.helpful,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
      userId: ratings.userId,
      moduleId: ratings.moduleId,
      userName: user.name,
      moduleName: modules.name,
    })
    .from(ratings)
    .leftJoin(user, eq(ratings.userId, user.id))
    .leftJoin(modules, eq(ratings.moduleId, modules.id))
    .orderBy(desc(ratings.createdAt))
}

export async function getReviewsWithAdvancedFilters(filters: {
  query?: string
  ratingFilter?: string
  dateFrom?: string
  dateTo?: string
  minHelpful?: number
  moduleFilter?: string
}) {
  const conditions = []

  if (filters.query && filters.query.trim()) {
    conditions.push(
      or(
        ilike(user.name, `%${filters.query}%`),
        ilike(modules.name, `%${filters.query}%`),
        ilike(ratings.comment, `%${filters.query}%`)
      )
    )
  }

  if (filters.ratingFilter && filters.ratingFilter !== 'all') {
    conditions.push(eq(ratings.rating, parseInt(filters.ratingFilter)))
  }

  if (filters.dateFrom) {
    conditions.push(gte(ratings.createdAt, new Date(filters.dateFrom)))
  }
  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setHours(23, 59, 59, 999)
    conditions.push(lte(ratings.createdAt, endDate))
  }

  if (filters.minHelpful !== undefined && filters.minHelpful > 0) {
    conditions.push(gte(ratings.helpful, filters.minHelpful))
  }

  if (filters.moduleFilter && filters.moduleFilter !== 'all') {
    conditions.push(eq(ratings.moduleId, filters.moduleFilter))
  }

  const baseQuery = db
    .select({
      id: ratings.id,
      rating: ratings.rating,
      comment: ratings.comment,
      helpful: ratings.helpful,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
      userId: ratings.userId,
      moduleId: ratings.moduleId,
      userName: user.name,
      moduleName: modules.name,
    })
    .from(ratings)
    .leftJoin(user, eq(ratings.userId, user.id))
    .leftJoin(modules, eq(ratings.moduleId, modules.id))

  let whereClause
  if (conditions.length > 0) {
    whereClause = and(...conditions)
  }

  return await (whereClause ? baseQuery.where(whereClause) : baseQuery)
    .orderBy(desc(ratings.createdAt))
}

export async function getReviewStats() {
  const totalReviews = await db.select({ count: count() }).from(ratings)
  const avgRatingResult = await db
    .select({ avgRating: avg(ratings.rating) })
    .from(ratings)
  const helpfulReviews = await db
    .select({ count: count() })
    .from(ratings)
    .where(gte(ratings.helpful, 5))
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentReviews = await db
    .select({ count: count() })
    .from(ratings)
    .where(gte(ratings.createdAt, thirtyDaysAgo))

  return {
    total: totalReviews[0]?.count || 0,
    averageRating: Number(avgRatingResult[0]?.avgRating) || 0,
    helpfulReviews: helpfulReviews[0]?.count || 0,
    recentReviews: recentReviews[0]?.count || 0,
  }
}

export async function deleteReview(reviewId: number): Promise<void> {
  await db.delete(ratings).where(eq(ratings.id, reviewId))
}

export async function incrementRatingHelpful(ratingId: number): Promise<void> {
  await db
    .update(ratings)
    .set({
      helpful: sql`${ratings.helpful} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(ratings.id, ratingId))
}

export async function getRatingReplies(ratingId: number) {
  return db
    .select({
      id: replies.id,
      ratingId: replies.ratingId,
      userId: replies.userId,
      comment: replies.comment,
      helpful: replies.helpful,
      createdAt: replies.createdAt,
      updatedAt: replies.updatedAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(replies)
    .leftJoin(user, eq(replies.userId, user.id))
    .where(eq(replies.ratingId, ratingId))
    .orderBy(desc(replies.createdAt))
}

export async function createReply(data: {
  ratingId: number
  userId: string
  comment: string
}) {
  const result = await db
    .insert(replies)
    .values({
      ratingId: data.ratingId,
      userId: data.userId,
      comment: data.comment,
    })
    .returning()

  return result[0]
}

export async function incrementReplyHelpful(replyId: number): Promise<void> {
  await db
    .update(replies)
    .set({
      helpful: sql`${replies.helpful} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(replies.id, replyId))
}

export async function checkUserHelpfulVote(userId: string, ratingId?: number, replyId?: number): Promise<boolean> {
  const result = await db
    .select()
    .from(helpfulVotes)
    .where(
      and(
        eq(helpfulVotes.userId, userId),
        ratingId ? eq(helpfulVotes.ratingId, ratingId) : sql`${helpfulVotes.ratingId} IS NULL`,
        replyId ? eq(helpfulVotes.replyId, replyId) : sql`${helpfulVotes.replyId} IS NULL`
      )
    )
    .limit(1)

  return result.length > 0
}

export async function addHelpfulVote(userId: string, ratingId?: number, replyId?: number): Promise<void> {
  await db
    .insert(helpfulVotes)
    .values({
      userId,
      ratingId,
      replyId,
    })
}

export async function getUserHelpfulVotes(userId: string, moduleId: string) {
  const ratingVotes = await db
    .select({ ratingId: helpfulVotes.ratingId })
    .from(helpfulVotes)
    .innerJoin(ratings, eq(helpfulVotes.ratingId, ratings.id))
    .where(
      and(
        eq(helpfulVotes.userId, userId),
        eq(ratings.moduleId, moduleId),
        sql`${helpfulVotes.ratingId} IS NOT NULL`
      )
    )

  const replyVotes = await db
    .select({ replyId: helpfulVotes.replyId })
    .from(helpfulVotes)
    .innerJoin(replies, eq(helpfulVotes.replyId, replies.id))
    .innerJoin(ratings, eq(replies.ratingId, ratings.id))
    .where(
      and(
        eq(helpfulVotes.userId, userId),
        eq(ratings.moduleId, moduleId),
        sql`${helpfulVotes.replyId} IS NOT NULL`
      )
    )

  return {
    ratings: ratingVotes.map(v => v.ratingId!),
    replies: replyVotes.map(v => v.replyId!)
  }
}

export async function getUserGitHubPAT(userId: string) {
  const result = await db
    .select()
    .from(githubTokens)
    .where(eq(githubTokens.userId, userId))
    .limit(1)

  return result[0] || null
}

export async function saveUserGitHubPAT(userId: string, hashedToken: string, salt: string) {
  await db.delete(githubTokens).where(eq(githubTokens.userId, userId))

  const result = await db
    .insert(githubTokens)
    .values({
      userId,
      hashedToken,
      salt,
    })
    .returning()

  return result[0]
}

export async function deleteUserGitHubPAT(userId: string) {
  await db.delete(githubTokens).where(eq(githubTokens.userId, userId))
}

export async function getReleaseSchedule() {
  const result = await db
    .select()
    .from(releaseSchedule)
    .limit(1)

  return result[0] || null
}

export async function updateReleaseSchedule(data: {
  enabled?: boolean
  intervalHours?: number
  batchSize?: number
  nextRunAt?: Date
  lastRunAt?: Date
}) {
  const existing = await getReleaseSchedule()

  if (existing) {
    const result = await db
      .update(releaseSchedule)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(releaseSchedule.id, existing.id))
      .returning()

    return result[0]
  } else {
    const result = await db
      .insert(releaseSchedule)
      .values({
        enabled: data.enabled ?? true,
        intervalHours: data.intervalHours ?? 1,
        batchSize: data.batchSize ?? 10,
        nextRunAt: data.nextRunAt ?? new Date(Date.now() + 60 * 60 * 1000), // 1h from now
        lastRunAt: data.lastRunAt,
      })
      .returning()

    return result[0]
  }
}

export async function getModuleGithubSync(moduleId: string) {
  const result = await db
    .select()
    .from(moduleGithubSync)
    .where(eq(moduleGithubSync.moduleId, moduleId))
    .limit(1)

  return result[0] || null
}

export async function createModuleGithubSync(data: {
  moduleId: string
  githubRepo: string
  enabled?: boolean
}) {
  const result = await db
    .insert(moduleGithubSync)
    .values({
      moduleId: data.moduleId,
      githubRepo: data.githubRepo,
      enabled: data.enabled ?? true,
    })
    .returning()

  return result[0]
}

export async function updateModuleGithubSync(moduleId: string, data: {
  githubRepo?: string
  enabled?: boolean
  lastSyncAt?: Date
  lastReleaseId?: string
  syncErrors?: { error: string; timestamp: string; retryCount: number }[]
}) {
  const result = await db
    .update(moduleGithubSync)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(moduleGithubSync.moduleId, moduleId))
    .returning()

  return result[0]
}

export async function getModulesForSync(limit: number = 10) {
  return db
    .select({
      module: modules,
      sync: moduleGithubSync,
    })
    .from(modules)
    .innerJoin(moduleGithubSync, eq(modules.id, moduleGithubSync.moduleId))
    .where(
      and(
        eq(modules.isPublished, true),
        eq(moduleGithubSync.enabled, true)
      )
    )
    .limit(limit)
}

export async function getModulesUpdatedThisWeek(): Promise<number> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const result = await db
    .select({ moduleId: releases.moduleId })
    .from(releases)
    .innerJoin(modules, eq(releases.moduleId, modules.id))
    .where(
      and(
        gte(releases.createdAt, oneWeekAgo),
        eq(modules.isPublished, true)
      )
    )
    .groupBy(releases.moduleId)

  return result.length
}

export async function getTotalModulesCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(modules)
    .where(eq(modules.isPublished, true))

  return result[0]?.count || 0
}

export async function getFeaturedModulesCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(modules)
    .where(and(eq(modules.isFeatured, true), eq(modules.isPublished, true)))

  return result[0]?.count || 0
}

export async function getRecommendedModulesCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(modules)
    .where(and(eq(modules.isRecommended, true), eq(modules.isPublished, true)))

  return result[0]?.count || 0
}

export async function getTotalDownloads(): Promise<number> {
  const result = await db
    .select({
      totalDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
    })
    .from(releases)
    .innerJoin(modules, eq(releases.moduleId, modules.id))
    .where(eq(modules.isPublished, true))

  return Number(result[0]?.totalDownloads) || 0
}

export async function getModulesByCategoryCount(category: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(modules)
    .where(and(eq(modules.category, category), eq(modules.isPublished, true)))

  return result[0]?.count || 0
}

export async function getNewModulesThisMonth(): Promise<number> {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const result = await db
    .select({ count: count() })
    .from(modules)
    .where(
      and(
        gte(modules.createdAt, oneMonthAgo),
        eq(modules.isPublished, true)
      )
    )

  return result[0]?.count || 0
}