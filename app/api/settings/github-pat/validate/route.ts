import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { validateGitHubPAT } from "@/lib/github-utils"

/**
 * Validate GitHub PAT
 * @description Validate a GitHub Personal Access Token and retrieve associated user information
 * @body ValidateGitHubPATBody
 * @response 200:ValidateGitHubPATResponse:PAT is valid
 * @response 400:ErrorResponse:Invalid PAT format or PAT validation failed
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to validate GitHub PAT
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

    const validation = await validateGitHubPAT(token)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid GitHub PAT" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: validation.user
    })
  } catch (error) {
    console.error("Error validating GitHub PAT:", error)
    return NextResponse.json(
      { error: "Failed to validate GitHub PAT" },
      { status: 500 }
    )
  }
}