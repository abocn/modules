import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { modules as modulesTable, releases as releasesTable } from '@/db/schema'
import { nanoid } from 'nanoid'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { moduleSubmissionWithReleaseSchema } from '@/lib/validations/module'
import { validateTurnstileToken, getClientIP } from '@/lib/turnstile'
import { writeFile, mkdir } from 'fs/promises'
import path, { join } from 'path'
import { existsSync } from 'fs'
import { validateURL, safeFetch } from '@/lib/security/ssrf-protection'
import { generateSlug } from '@/lib/slug-utils'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]

async function downloadAndStoreImage(url: string, type: 'icon' | 'screenshot'): Promise<string | null> {
  try {
    const validation = await validateURL(url, {
      allowPrivateIPs: false
    })

    if (!validation.safe) {
      console.error(`SSRF validation failed for ${url}: ${validation.error}`)
      return null
    }

    const response = await safeFetch(url, {
      headers: {
        'User-Agent': 'Modules/1.0'
      },
      allowPrivateIPs: false
    })

    if (!response.ok) {
      console.error(`Failed to download image from ${url}: ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !ALLOWED_CONTENT_TYPES.some(ct => contentType.includes(ct))) {
      console.error(`Invalid image type for ${url}: ${contentType}`)
      return null
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      console.error(`Image too large for ${url}: ${contentLength} bytes`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > MAX_IMAGE_SIZE) {
      console.error(`Image too large for ${url}: ${buffer.length} bytes`)
      return null
    }

    const magicBytes = buffer.subarray(0, 8)
    const isValidImage =
      (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8) || // JPEG
      (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) || // PNG
      (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46) || // GIF
      (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46) // WebP

    if (!isValidImage) {
      console.error(`Invalid image file content for ${url}`)
      return null
    }

    let extension = '.jpg'
    if (contentType.includes('png')) extension = '.png'
    else if (contentType.includes('gif')) extension = '.gif'
    else if (contentType.includes('webp')) extension = '.webp'
    else if (contentType.includes('svg')) extension = '.svg'

    const filename = `${nanoid(12)}${extension}`
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const relativePath = join('images', 'modules', year, month)
    const publicDir = join(process.cwd(), 'public')
    const absolutePath = join(publicDir, relativePath)

    const normalizedPath = path.resolve(absolutePath)
    if (!normalizedPath.startsWith(publicDir)) {
      console.error('Path traversal attempt detected')
      return null
    }

    if (!existsSync(absolutePath)) {
      await mkdir(absolutePath, { recursive: true })
    }

    const filePath = join(absolutePath, filename)
    await writeFile(filePath, buffer)
    const publicUrl = `/${relativePath}/${filename}`

    console.log(`[Image Downloaded] Original: ${url}, Saved: ${publicUrl}, Type: ${type}`)
    return publicUrl
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error)
    return null
  }
}

/**
 * Submit a new module
 * @description Submit a new module for community review and approval. Includes automatic image processing, file size validation, and duplicate prevention. All submissions undergo moderation before publication.
 * @tags Modules
 * @body SubmitModuleRequest - Complete module and release information with Turnstile captcha
 * @response 201:SubmitModuleResponse:Module submitted successfully and queued for review
 * @response 400:ValidationErrorResponse:Invalid submission data, failed captcha verification, or file size exceeded
 * @response 401:ErrorResponse:Authentication required - please sign in to submit modules
 * @response 409:ErrorResponse:Duplicate submission detected within 24 hours
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (maximum 5 submissions per hour)
 * @response 500:ErrorResponse:Internal server error during submission processing
 * @auth bearer
 * @rateLimit 5 submissions per hour per authenticated user
 * @example
 * // Request
 * POST /api/modules/submit
 * {
 *   "module": {
 *     "name": "Example Module",
 *     "shortDescription": "Example Module",
 *     "description": "A powerful firewall module that provides...",
 *     "author": "moddev",
 *     "category": "security",
 *     "license": "GPL-3.0",
 *     "isOpenSource": true,
 *     "sourceUrl": "https://github.com/moddev/module",
 *     "features": ["Example feature 1", "Example feature 2"],
 *     "compatibility": {
 *       "androidVersions": ["11+", "12+", "13+", "14+"],
 *       "rootMethods": ["Magisk", "KernelSU"]
 *     },
 *     "icon": "https://example.com/icon.png"
 *   },
 *   "release": {
 *     "version": "1.0.0",
 *     "downloadUrl": "https://github.com/moddev/module/releases/download/v1.0.0/module.zip",
 *     "changelog": "Initial release"
 *   },
 *   "turnstileToken": "0.ABC123..."
 * }
 *
 * // Response
 * {
 *   "id": "abc123def456",
 *   "message": "Module submitted successfully! It will be reviewed by our team.",
 *   "pending": true
 * }
 * @openapi
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(req)

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Authentication required. Please sign in to submit modules.' },
        { status: 401 }
      )
    }

    requireScope(user, "write")

    const rateLimitResult = await checkRateLimit(
      user.id,
      'module_submit',
      { interval: 60 * 60 * 1000, limit: 5 }
    )

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime)
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can submit again at ${resetDate.toLocaleTimeString()}.`,
          resetTime: rateLimitResult.resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      )
    }

    const json = await req.json()

    console.log('[API Submit] Received turnstile token:', json.turnstileToken ? `${json.turnstileToken.substring(0, 20)}...` : 'none')
    const clientIP = getClientIP(req)
    console.log('[API Submit] Client IP:', clientIP)

    const turnstileResult = await validateTurnstileToken(
      json.turnstileToken,
      { remoteip: clientIP }
    )

    console.log('[API Submit] Turnstile result:', turnstileResult.success)

    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          error: turnstileResult.error || 'Captcha verification failed',
          captchaError: true
        },
        { status: 400 }
      )
    }

    const parsed = moduleSubmissionWithReleaseSchema.safeParse(json)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      console.error('[Validation Error]:', errors)
      return NextResponse.json(
        {
          error: 'Validation failed. Please check your input.',
          errors,
          message: errors[0]?.message || 'Validation failed. Please check your input.'
        },
        { status: 400 }
      )
    }

    const { module: moduleData, release: releaseData } = parsed.data

    let processedIconUrl: string | null = null
    if (moduleData.icon) {
      console.log(`[Image Processing] Downloading icon: ${moduleData.icon}`)
      processedIconUrl = await downloadAndStoreImage(moduleData.icon, 'icon')
      if (!processedIconUrl) {
        return NextResponse.json(
          { error: 'Failed to download icon. Please check the URL and try again.' },
          { status: 400 }
        )
      }
    }

    let processedImageUrls: string[] | null = null
    if (moduleData.images && moduleData.images.length > 0) {
      processedImageUrls = []
      for (let i = 0; i < moduleData.images.length; i++) {
        const imageUrl = moduleData.images[i]
        console.log(`[Image Processing] Downloading screenshot ${i + 1}/${moduleData.images.length}: ${imageUrl}`)
        const processedUrl = await downloadAndStoreImage(imageUrl, 'screenshot')
        if (processedUrl) {
          processedImageUrls.push(processedUrl)
        } else {
          console.warn(`[Image Processing] Failed to download screenshot: ${imageUrl}`)
        }
      }

      if (processedImageUrls.length === 0) {
        processedImageUrls = null
      }
    }

    if (releaseData?.downloadUrl && !releaseData.size) {
      try {
        const response = await fetch(releaseData.downloadUrl, { method: 'HEAD' })
        if (response.ok) {
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const sizeInMB = parseInt(contentLength) / (1024 * 1024)
            if (sizeInMB > 100) {
              return NextResponse.json(
                { error: 'File size exceeds 100MB limit' },
                { status: 400 }
              )
            }
            releaseData.size = `${sizeInMB.toFixed(2)} MB`
          }
        }
      } catch (error) {
        console.warn('Could not determine file size:', error)
        releaseData.size = 'Unknown'
      }
    }

    const id = nanoid(12)
    const now = new Date()
    const submitterName = moduleData.author || user.name || user.email?.split('@')[0] || 'Unknown'

    const recentSubmission = await db.query.modules.findFirst({
      where: (modules, { and, eq, gte }) => and(
        eq(modules.submittedBy, user.id),
        eq(modules.name, moduleData.name),
        gte(modules.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      )
    })

    if (recentSubmission) {
      return NextResponse.json(
        {
          error: 'You have already submitted a module with this name in the last 24 hours.',
          existingId: recentSubmission.id
        },
        { status: 409 }
      )
    }

    const moduleSlug = generateSlug(moduleData.name, submitterName)

    await db.transaction(async (tx) => {
      await tx.insert(modulesTable).values({
        id,
        name: moduleData.name,
        slug: moduleSlug,
        shortDescription: moduleData.shortDescription,
        description: moduleData.description,
        author: submitterName,
        category: moduleData.category,
        lastUpdated: now,
        icon: processedIconUrl,
        images: processedImageUrls,
        isOpenSource: moduleData.isOpenSource,
        license: moduleData.license,
        compatibility: moduleData.compatibility,
        warnings: [],
        features: moduleData.features,
        sourceUrl: moduleData.sourceUrl || null,
        communityUrl: moduleData.communityUrl || null,
        isFeatured: false,
        isRecommended: false,
        isPublished: false,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        submittedBy: user.id
      })

      if (releaseData) {
        await tx.insert(releasesTable).values({
          moduleId: id,
          version: releaseData.version,
          downloadUrl: releaseData.downloadUrl,
          size: releaseData.size || 'Unknown',
          changelog: releaseData.changelog || null,
          downloads: 0,
          isLatest: true,
          githubReleaseId: releaseData.githubReleaseId || null,
          githubTagName: releaseData.githubTagName || null,
          assets: releaseData.assets || null,
          createdAt: now,
          updatedAt: now
        })
      }
    })

    console.log(`[Module Submitted] ID: ${id}, Name: ${moduleData.name}, User: ${user.id}, Has Release: ${!!releaseData}`)

    return NextResponse.json(
      {
        id,
        message: 'Module submitted successfully! It will be reviewed by our team.',
        pending: true
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    )
  } catch (err) {
    console.error('[! /api/modules/submit]:', err)

    const message = err instanceof Error && err.message.includes('duplicate')
      ? 'A module with this name may already exist.'
      : 'An error occurred while submitting your module. Please try again.'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
