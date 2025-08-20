import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserGitHubPAT, saveUserGitHubPAT, deleteUserGitHubPAT } from "@/lib/db-utils"
import { hashGitHubPAT, generateSalt } from "@/lib/github-utils"

/**
 * Check GitHub PAT status
 * @description Check if the authenticated user has a GitHub Personal Access Token configured
 * @response 200:GitHubPATStatusResponse:PAT status retrieved successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to check GitHub PAT
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = await getUserGitHubPAT(session.user.id)

    return NextResponse.json({ hasToken: !!token })
  } catch (error) {
    console.error("Error checking GitHub PAT:", error)
    return NextResponse.json(
      { error: "Failed to check GitHub PAT" },
      { status: 500 }
    )
  }
}

/**
 * Save GitHub PAT
 * @description Save a GitHub Personal Access Token for the authenticated user
 * @body GitHubPATBody
 * @response 200:SaveGitHubPATResponse:PAT saved successfully
 * @response 400:ErrorResponse:Invalid PAT format or missing token
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to save GitHub PAT
 * @auth bearer
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: "GitHub PAT is required" },
        { status: 400 }
      )
    }

    if (!/^gh[pso]_[a-zA-Z0-9]{36,251}$/.test(token)) {
      return NextResponse.json(
        { error: "Invalid GitHub PAT format" },
        { status: 400 }
      )
    }

    const salt = generateSalt()
    const hashedToken = hashGitHubPAT(token, salt)

    await saveUserGitHubPAT(session.user.id, hashedToken, salt)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving GitHub PAT:", error)
    return NextResponse.json(
      { error: "Failed to save GitHub PAT" },
      { status: 500 }
    )
  }
}

/**
 * Delete GitHub PAT
 * @description Remove the GitHub Personal Access Token for the authenticated user
 * @response 200:DeleteGitHubPATResponse:PAT removed successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to remove GitHub PAT
 * @auth bearer
 * @openapi
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deleteUserGitHubPAT(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting GitHub PAT:", error)
    return NextResponse.json(
      { error: "Failed to remove GitHub PAT" },
      { status: 500 }
    )
  }
}