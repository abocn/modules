import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { modules, releases, ratings, adminActions } from "@/db/schema"
import { user as userTable } from "@/db/schema"
import { desc, eq, like, or, sql } from "drizzle-orm"
import { getAuthenticatedUser, requireAdmin } from "@/lib/unified-auth"
import { createSuccessResponse, createErrorResponse } from "@/lib/api-middleware"
import { applyRateLimit } from "@/lib/rate-limit-enhanced"
import { nanoid } from "nanoid"
import { moduleSubmissionSchema } from "@/lib/validations/module"
import { generateSlug } from "@/lib/slug-utils"
import { createModuleGithubSync } from "@/lib/db-utils"
import { jobExecutionService } from "@/lib/job-execution-service"
import { adminJobs } from "@/db/schema"
import * as z from "zod"

/**
 * Extract GitHub repository from a source URL
 * @param sourceUrl - The source URL to parse
 * @returns GitHub repo in format "owner/repo" or null if not a valid GitHub URL
 */
function extractGithubRepo(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    const url = new URL(sourceUrl)
    if (url.hostname !== 'github.com') return null

    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    if (pathParts.length < 2) return null

    return `${pathParts[0]}/${pathParts[1]}`
  } catch {
    return null
  }
}

/**
 * List all modules (admin)
 * @description Get a list of all modules with administrative details. Requires admin role.
 * @tags Admin, Modules
 * @params AdminModulesQueryParams - Query parameters for filtering and pagination
 * @response 200:AdminModulesListResponse:Successfully retrieved list of modules
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 429:ErrorResponse:Rate limit exceeded
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @rateLimit 200 requests per 15 minutes for admin operations
 * @openapi
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, 'ADMIN_OPERATIONS')

  if (!rateLimitResult.success) {
    return createErrorResponse(
      'Rate limit exceeded',
      429,
      {
        "X-RateLimit-Limit": "200",
        "X-RateLimit-Remaining": "0",
        "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
      }
    )
  }

  try {
    const { user, error } = await getAuthenticatedUser(request)

    if (error || !user) {
      return createErrorResponse(error || "Authentication required", 401)
    }

    try {
      requireAdmin(user)
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : "Admin access required", 403)
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const baseQuery = db
      .select({
        id: modules.id,
        name: modules.name,
        description: modules.description,
        shortDescription: modules.shortDescription,
        author: modules.author,
        category: modules.category,
        downloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
        averageRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
        reviewCount: sql<number>`COUNT(DISTINCT ${ratings.id})`,
        latestVersion: sql<string>`(
          SELECT ${releases.version}
          FROM ${releases}
          WHERE ${releases.moduleId} = ${modules.id}
          AND ${releases.isLatest} = true
          LIMIT 1
        )`,
        latestSize: sql<string>`(
          SELECT ${releases.size}
          FROM ${releases}
          WHERE ${releases.moduleId} = ${modules.id}
          AND ${releases.isLatest} = true
          LIMIT 1
        )`,
        latestChangelog: sql<string>`(
          SELECT ${releases.changelog}
          FROM ${releases}
          WHERE ${releases.moduleId} = ${modules.id}
          AND ${releases.isLatest} = true
          LIMIT 1
        )`,
        latestDownloadUrl: sql<string>`(
          SELECT ${releases.downloadUrl}
          FROM ${releases}
          WHERE ${releases.moduleId} = ${modules.id}
          AND ${releases.isLatest} = true
          LIMIT 1
        )`,
        icon: modules.icon,
        images: modules.images,
        isOpenSource: modules.isOpenSource,
        license: modules.license,
        compatibility: modules.compatibility,
        warnings: modules.warnings,
        reviewNotes: modules.reviewNotes,
        features: modules.features,
        sourceUrl: modules.sourceUrl,
        communityUrl: modules.communityUrl,
        isFeatured: modules.isFeatured,
        isRecommended: modules.isRecommended,
        isPublished: modules.isPublished,
        status: modules.status,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
        lastUpdated: modules.lastUpdated,
        submittedBy: modules.submittedBy,
        submittedByUsername: userTable.name,
        hasRejectionAction: sql<boolean>`EXISTS(
          SELECT 1 FROM ${adminActions}
          WHERE ${adminActions.targetId} = ${modules.id}
          AND ${adminActions.action} = 'Module Rejected'
        )`,
      })
      .from(modules)
      .leftJoin(releases, eq(modules.id, releases.moduleId))
      .leftJoin(ratings, eq(modules.id, ratings.moduleId))
      .leftJoin(userTable, eq(modules.submittedBy, userTable.id))
      .$dynamic()

    const queryWithFilters = search
      ? baseQuery.where(
          or(
            like(modules.name, `%${search}%`),
            like(modules.author, `%${search}%`),
            like(modules.description, `%${search}%`)
          )
        )
      : baseQuery

    const modulesList = await queryWithFilters
      .groupBy(modules.id, userTable.name)
      .orderBy(desc(modules.createdAt))
      .limit(limit)
      .offset(offset)

    const transformedModules = modulesList.map(module => ({
      id: module.id,
      name: module.name,
      description: module.description,
      shortDescription: module.shortDescription,
      version: module.latestVersion || "1.0.0",
      author: module.author,
      category: module.category,
      downloads: Number(module.downloads),
      rating: Number(module.averageRating) || 0,
      reviewCount: Number(module.reviewCount) || 0,
      lastUpdated: module.lastUpdated.toISOString(),
      size: module.latestSize || "Unknown",
      icon: module.icon,
      images: module.images || [],
      isOpenSource: module.isOpenSource,
      license: module.license,
      compatibility: module.compatibility,
      isPublished: module.isPublished,
      status: module.status,
      createdAt: module.createdAt.toISOString(),
      warnings: module.warnings || [],
      reviewNotes: module.reviewNotes || [],
      features: module.features || [],
      changelog: module.latestChangelog || "",
      downloadUrl: module.latestDownloadUrl || "",
      sourceUrl: module.sourceUrl,
      communityUrl: module.communityUrl,
      isFeatured: module.isFeatured,
      isRecentlyUpdated: module.lastUpdated && new Date(module.lastUpdated).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000),
      isRecommended: module.isRecommended,
      submittedBy: module.submittedBy,
      submittedByUsername: module.submittedByUsername,
      hasRejectionAction: Boolean(module.hasRejectionAction),
    }))

    return createSuccessResponse({ modules: transformedModules })
  } catch (error) {
    console.error("[! /api/admin/modules] Error fetching admin modules:", error)
    return createErrorResponse("Internal server error", 500)
  }
}

/**
 * Create a new module (admin)
 * @description Create a new module directly without going through submission process. Requires admin role.
 * @tags Admin, Modules
 * @body ModuleSubmissionRequest - Module details for creation
 * @response 201:ModuleCreateResponse:Module created successfully
 * @response 400:ErrorResponse:Validation failed
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 429:ErrorResponse:Rate limit exceeded
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @rateLimit 200 requests per 15 minutes for admin operations
 * @openapi
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, 'ADMIN_OPERATIONS')

  if (!rateLimitResult.success) {
    return createErrorResponse(
      'Rate limit exceeded',
      429,
      {
        "X-RateLimit-Limit": "200",
        "X-RateLimit-Remaining": "0",
        "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
      }
    )
  }

  try {
    const { user, error } = await getAuthenticatedUser(request)

    if (error || !user) {
      return createErrorResponse(error || "Authentication required", 401)
    }

    try {
      requireAdmin(user)
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : "Admin access required", 403)
    }

    const body = await request.json()

    const createModuleSchema = moduleSubmissionSchema.extend({
      manualReleaseVersion: z.string().optional(),
      manualReleaseUrl: z.string().optional(),
      manualReleaseChangelog: z.string().optional(),
      isFeatured: z.boolean().optional(),
      isRecommended: z.boolean().optional(),
    })

    const parsed = createModuleSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      console.error('[Create Module Validation Error]:', errors)
      return NextResponse.json(
        {
          error: 'Validation failed. Please check your input.',
          errors,
          message: errors[0]?.message || 'Validation failed. Please check your input.'
        },
        { status: 400 }
      )
    }

    const moduleData = parsed.data
    const id = nanoid(12)
    const now = new Date()
    const moduleSlug = generateSlug(moduleData.name, moduleData.author)

    await db.transaction(async (tx) => {
      await tx.insert(modules).values({
        id,
        name: moduleData.name,
        slug: moduleSlug,
        shortDescription: moduleData.shortDescription,
        description: moduleData.description,
        author: moduleData.author,
        category: moduleData.category,
        lastUpdated: now,
        icon: moduleData.icon || null,
        images: moduleData.images?.length ? moduleData.images : null,
        isOpenSource: moduleData.isOpenSource,
        license: moduleData.license || (moduleData.isOpenSource ? "GPL-3.0" : "Proprietary"),
        compatibility: moduleData.compatibility,
        warnings: [],
        features: moduleData.features,
        sourceUrl: moduleData.sourceUrl || null,
        communityUrl: moduleData.communityUrl || null,
        isFeatured: body.isFeatured || false,
        isRecommended: body.isRecommended || false,
        isPublished: true,
        status: 'approved',
        createdAt: now,
        updatedAt: now,
        submittedBy: user.id
      })

      if (!moduleData.isOpenSource && body.manualReleaseVersion && body.manualReleaseUrl) {
        await tx.insert(releases).values({
          moduleId: id,
          version: body.manualReleaseVersion,
          downloadUrl: body.manualReleaseUrl,
          size: 'Unknown',
          changelog: body.manualReleaseChangelog || null,
          downloads: 0,
          isLatest: true,
          createdAt: now,
          updatedAt: now
        })
      }
    })

    if (moduleData.sourceUrl) {
      const githubRepo = extractGithubRepo(moduleData.sourceUrl)
      if (githubRepo) {
        try {
          await createModuleGithubSync({
            moduleId: id,
            githubRepo,
            enabled: true
          })

          const [job] = await db
            .insert(adminJobs)
            .values({
              type: "scrape_releases",
              name: `Auto Sync - New Module ${moduleData.name}`,
              description: `Automatically triggered GitHub release sync for newly created module ${moduleData.name}`,
              status: "pending",
              progress: 0,
              startedBy: user.id,
              parameters: {
                moduleId: id,
                scope: "single",
                manual: false,
                autoTriggered: true
              },
              logs: []
            })
            .returning()

          console.log(`[Admin Module Created] Created sync job ${job.id} for module ${id} from repo ${githubRepo}`)

          jobExecutionService.executeJob(job.id).catch(error => {
            console.error(`[Admin Module Created] Failed to execute sync job ${job.id} for module ${id}:`, error)
          })

        } catch (syncError) {
          console.error(`[Admin Module Created] Failed to set up GitHub sync for module ${id}:`, syncError)
        }
      }
    }

    console.log(`[Admin Module Created] ID: ${id}, Name: ${moduleData.name}, User: ${user.id}`)

    return createSuccessResponse(
      {
        id,
        message: 'Module created successfully!',
        success: true
      },
      201
    )
  } catch (error) {
    console.error("[! /api/admin/modules] Error creating module:", error)

    const message = error instanceof Error && error.message.includes('duplicate')
      ? 'A module with this name may already exist.'
      : 'An error occurred while creating the module. Please try again.'

    return createErrorResponse(message, 500)
  }
}