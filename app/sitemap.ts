import { MetadataRoute } from 'next'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { MODULE_CATEGORIES } from '@/lib/constants/categories'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/featured`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/recent`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/recommended`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]

  const categoryPages: MetadataRoute.Sitemap = MODULE_CATEGORIES.map(category => ({
    url: `${baseUrl}/category/${category.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  const modulePages: MetadataRoute.Sitemap = []
  try {
    const allModules = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        updatedAt: modules.updatedAt,
        isFeatured: modules.isFeatured,
        isRecommended: modules.isRecommended,
      })
      .from(modules)
      .where(eq(modules.status, 'approved'))

    modulePages.push(
      ...allModules.map((module: { id: string; slug: string; updatedAt: Date | null; isFeatured: boolean; isRecommended: boolean }) => {
        let priority = 0.7
        if (module.isFeatured) priority = 0.9
        else if (module.isRecommended) priority = 0.8

        const daysSinceUpdate = module.updatedAt
          ? Math.floor((Date.now() - new Date(module.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999

        let changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' = 'monthly'
        if (daysSinceUpdate < 7) changeFrequency = 'weekly'
        else if (daysSinceUpdate < 30) changeFrequency = 'monthly'
        else if (daysSinceUpdate < 90) changeFrequency = 'monthly'
        else changeFrequency = 'yearly'

        return {
          url: `${baseUrl}/module/${module.slug}`,
          lastModified: module.updatedAt || new Date(),
          changeFrequency,
          priority,
        }
      })
    )
  } catch (error) {
    console.error('Error fetching modules for sitemap:', error)
  }

  return [...staticPages, ...categoryPages, ...modulePages]
}