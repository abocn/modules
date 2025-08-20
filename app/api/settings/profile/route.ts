import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateUser } from "@/lib/db-utils"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters")
})

/**
 * Update user profile
 * @description Update the authenticated user's profile information
 * @body UpdateProfileBody
 * @response 200:UpdateProfileResponse:Profile updated successfully
 * @response 400:ErrorResponse:Invalid profile data
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to update profile
 * @auth bearer
 * @openapi
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    await updateUser(session.user.id, { name: validatedData.name })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}