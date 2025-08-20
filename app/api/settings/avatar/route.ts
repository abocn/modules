import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars')

async function ensureAvatarsDir() {
  try {
    await fs.access(AVATARS_DIR)
  } catch {
    await fs.mkdir(AVATARS_DIR, { recursive: true })
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
  }
  return mimeToExt[mimeType] || '.jpg'
}

/**
 * Upload user avatar
 * @description Upload a new avatar image for the authenticated user
 * @body FormData with 'avatar' file field
 * @response 200:UploadAvatarResponse:Avatar uploaded successfully
 * @response 400:ErrorResponse:Invalid file type, file too large, or no file provided
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to upload avatar
 * @auth bearer
 * @openapi
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    await ensureAvatarsDir()

    if (session.user.image && session.user.image.startsWith('/avatars/')) {
      const oldFilePath = path.join(process.cwd(), 'public', session.user.image)
      try {
        await fs.unlink(oldFilePath)
      } catch (error) {
        console.error("Error deleting old avatar:", error)
      }
    }

    const uuid = crypto.randomUUID()
    const extension = getExtensionFromMimeType(file.type)
    const filename = `${uuid}${extension}`
    const filepath = path.join(AVATARS_DIR, filename)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filepath, buffer)

    const publicPath = `/avatars/${filename}`

    const updateResponse = await auth.api.updateUser({
      body: {
        image: publicPath
      },
      headers: await headers()
    })

    if (!updateResponse) {
      throw new Error('Failed to update user avatar')
    }

    return NextResponse.json({
      success: true,
      avatarUrl: publicPath,
      user: updateResponse
    })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}

/**
 * Delete user avatar
 * @description Remove the authenticated user's avatar image
 * @response 200:DeleteAvatarResponse:Avatar removed successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to remove avatar
 * @auth bearer
 * @openapi
 */
export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete avatar file if it exists
    if (session.user.image && session.user.image.startsWith('/avatars/')) {
      const filePath = path.join(process.cwd(), 'public', session.user.image)
      try {
        await fs.unlink(filePath)
      } catch (error) {
        console.error("Error deleting avatar file:", error)
      }
    }

    // Update user through Better Auth API to ensure session is refreshed
    const updateResponse = await auth.api.updateUser({
      body: {
        image: undefined
      },
      headers: await headers()
    })

    if (!updateResponse) {
      throw new Error('Failed to remove user avatar')
    }

    return NextResponse.json({ 
      success: true,
      user: updateResponse 
    })
  } catch (error) {
    console.error("Error removing avatar:", error)
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    )
  }
}