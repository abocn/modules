import { NextResponse } from 'next/server'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { MODULE_CATEGORIES } from '@/lib/constants/categories'
import { cache, CACHE_KEYS } from '@/lib/cache'

async function generateSitemap(): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '1.0',
    },
    {
      url: `${baseUrl}/featured`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/recent`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/recommended`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: '0.6',
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.7',
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.7',
    },
  ]

  const categoryPages = MODULE_CATEGORIES.map(category => ({
    url: `${baseUrl}/category/${category.id}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: '0.7',
  }))

  const modulePages = []
  let databaseAvailable = true

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    )

    const queryPromise = db
      .select({
        id: modules.id,
        slug: modules.slug,
        updatedAt: modules.updatedAt,
        isFeatured: modules.isFeatured,
        isRecommended: modules.isRecommended,
      })
      .from(modules)
      .where(eq(modules.isPublished, true))

    const allModules = await Promise.race([queryPromise, timeoutPromise]) as Array<{
      id: string;
      slug: string;
      updatedAt: Date | null;
      isFeatured: boolean;
      isRecommended: boolean;
    }>

    modulePages.push(
      ...allModules.map((module) => {
        let priority = '0.7'
        if (module.isFeatured) priority = '0.9'
        else if (module.isRecommended) priority = '0.8'

        const daysSinceUpdate = module.updatedAt
          ? Math.floor((Date.now() - new Date(module.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999

        let changeFrequency = 'monthly'
        if (daysSinceUpdate < 7) changeFrequency = 'weekly'
        else if (daysSinceUpdate < 30) changeFrequency = 'monthly'
        else if (daysSinceUpdate < 90) changeFrequency = 'monthly'
        else changeFrequency = 'yearly'

        return {
          url: `${baseUrl}/module/${module.slug}`,
          lastModified: module.updatedAt?.toISOString() || new Date().toISOString(),
          changeFrequency,
          priority,
        }
      })
    )

    console.log(`[Sitemap] Successfully fetched ${modulePages.length} modules`)
  } catch (error) {
    databaseAvailable = false
    console.warn('[Sitemap] Database unavailable, generating sitemap without module pages:', error)
  }

  const allUrls = [...staticPages, ...categoryPages, ...modulePages]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  console.log(`Sitemap generated: ${allUrls.length} total URLs (${staticPages.length} static, ${categoryPages.length} categories, ${modulePages.length} modules)`)
  if (!databaseAvailable) {
    console.log('[Sitemap] Generated without module pages due to database unavailability')
  }

  return sitemap
}

export async function GET() {
  try {
    const cachedSitemap = await cache.get(CACHE_KEYS.SITEMAP)

    if (cachedSitemap) {
      console.log('[Sitemap] Serving from cache')
      return new NextResponse(cachedSitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
          'X-Sitemap-Cache': 'HIT',
        },
      })
    }

    console.log('[Sitemap] Cache miss, generating fresh sitemap')
    const sitemap = await generateSitemap()

    const cached = await cache.set(CACHE_KEYS.SITEMAP, sitemap, CACHE_KEYS.SITEMAP_TTL)
    if (cached) {
      console.log('[Sitemap] Stored in cache for', CACHE_KEYS.SITEMAP_TTL, 'seconds')
    } else {
      console.log('[Sitemap] Could not store in cache (Redis unavailable)')
    }

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'X-Sitemap-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('[Sitemap] Fatal error generating sitemap:', error)

    const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new NextResponse(minimalSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache for 5 minutes on error
        'X-Sitemap-Cache': 'ERROR',
      },
    })
  }
}