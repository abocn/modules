import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { modules } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getAuthenticatedUser, requireScope } from "@/lib/unified-auth"

/**
 * Get user's module submissions
 * @description Retrieve all modules submitted by the authenticated user, including submission status, warnings, and review progress.
 * @tags User Submissions
 * @response 200:MySubmissionsResponse:Successfully retrieved user's module submissions with status information
 * @response 401:ErrorResponse:Authentication required - please sign in to view submissions
 * @response 500:ErrorResponse:Internal server error while fetching user submissions
 * @auth bearer
 * @rateLimit No rate limit applied
 * @example
 * // Request
 * GET /api/modules/my-submissions
 *
 * // Response
 * {
 *   "submissions": [
 *     {
 *       "id": "abc123",
 *       "name": "My Module",
 *       "shortDescription": "Enhanced security for Android",
 *       "status": "pending",
 *       "category": "security",
 *       "isPublished": false,
 *       "createdAt": "2024-01-15T10:30:00Z",
 *       "updatedAt": "2024-01-15T10:30:00Z",
 *       "warnings": []
 *     }
 *   ]
 * }
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)

    if (error || !user) {
      return NextResponse.json({ error: error || "Authentication required" }, { status: 401 })
    }

    requireScope(user, "read")

    const userSubmissions = await db
      .select()
      .from(modules)
      .where(eq(modules.submittedBy, user.id))
      .orderBy(modules.updatedAt)

    const submissionsWithStatus = userSubmissions.map(submission => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { reviewNotes: _reviewNotes, ...safeSubmission } = submission
      return {
        ...safeSubmission,
        warnings: submission.warnings || [],
      }
    })

    return NextResponse.json({ submissions: submissionsWithStatus })
  } catch (error) {
    console.error("Error fetching user submissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}