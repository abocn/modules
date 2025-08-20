import { db } from '@/db'
import { modules, releases, ratings } from '@/db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { MODULE_CATEGORIES } from '@/lib/constants/categories'
import {
  generateNavigationSection,
  getAPIEndpoints,
  generateAPISection,
  generateModuleSubmissionSection,
} from '@/lib/llm-content-generator'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const allModules = await db
    .select({
      id: modules.id,
      slug: modules.slug,
      name: modules.name,
      shortDescription: modules.shortDescription,
      category: modules.category,
      author: modules.author,
      isFeatured: modules.isFeatured,
      isRecommended: modules.isRecommended,
      lastUpdated: modules.lastUpdated,
    })
    .from(modules)
    .where(
      and(
        eq(modules.status, 'approved'),
        eq(modules.isPublished, true)
      )
    )
    .orderBy(desc(modules.isFeatured), desc(modules.isRecommended), desc(modules.lastUpdated))

  const moduleStats = await db
    .select({
      totalModules: sql<number>`count(*)`,
      featuredCount: sql<number>`count(*) filter (where ${modules.isFeatured} = true)`,
      recommendedCount: sql<number>`count(*) filter (where ${modules.isRecommended} = true)`,
      openSourceCount: sql<number>`count(*) filter (where ${modules.isOpenSource} = true)`,
      totalRatings: sql<number>`(select count(*) from ${ratings})`,
      avgRating: sql<number>`(select avg(rating) from ${ratings})`,
    })
    .from(modules)
    .where(
      and(
        eq(modules.status, 'approved'),
        eq(modules.isPublished, true)
      )
    )

  const totalDownloads = await db
    .select({
      downloads: sql<number>`sum(${releases.downloads})`,
    })
    .from(releases)

  const recentModules = allModules.slice(0, 10)
  const stats = moduleStats[0] || {
    totalModules: 0,
    featuredCount: 0,
    recommendedCount: 0,
    openSourceCount: 0,
    totalRatings: 0,
    avgRating: 0
  }
  const totalDownloadCount = totalDownloads[0]?.downloads || 0

  const modulesByCategory = MODULE_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = allModules.filter(mod => mod.category === category.id)
    return acc
  }, {} as Record<string, typeof allModules>)

  const featuredModules = allModules.filter(mod => mod.isFeatured)
  const recommendedModules = allModules.filter(mod => mod.isRecommended && !mod.isFeatured)

  const apiEndpoints = await getAPIEndpoints()

  const llmsTxt = `# modules

> "modules" is a web-based Magisk/KernelSU modules repository. This is a comprehensive data dump of all Android root modules, including full descriptions, releases, ratings, and metadata.

## About

This platform serves as a centralized repository for Android root modules. Users can discover modules for system customization, performance optimization, privacy enhancement, and more. All modules are vetted for safety and compatibility.

**Key Features:**
- Browse modules by category, popularity, and recommendations
- User ratings and reviews for each module
- Automatic GitHub release synchronization
- Admin-vetted modules for safety
- Support for both Magisk and KernelSU root methods
- Real-time search and filtering
- Module version management
- Community-driven recommendations

## Platform Statistics

- **Total Modules**: ${stats.totalModules}
- **Featured Modules**: ${stats.featuredCount}
- **Recommended Modules**: ${stats.recommendedCount}
- **Open Source Modules**: ${stats.openSourceCount}
- **Total Reviews**: ${stats.totalRatings.toLocaleString()}
- **Average Rating**: ${Number(stats.avgRating).toFixed(1)}/5
- **Total Downloads**: ${totalDownloadCount.toLocaleString()}

${generateNavigationSection(baseUrl)}

## Featured Modules

Our admins-choice modules:

${featuredModules.length > 0 ? featuredModules.map(mod =>
  `- [${mod.name}](${baseUrl}/module/${mod.slug}): ${mod.shortDescription}`
).join('\n') : '- No featured modules at this time'}

## Recommended Modules

Admin-recommended modules:

${recommendedModules.length > 0 ? recommendedModules.map(mod =>
  `- [${mod.name}](${baseUrl}/module/${mod.slug}): ${mod.shortDescription}`
).join('\n') : '- No recommended modules at this time'}

## Recently Updated Modules

Latest modules with recent updates:

${recentModules.length > 0 ? recentModules.map(mod =>
  `- [${mod.name}](${baseUrl}/module/${mod.slug}): ${mod.shortDescription} (Updated: ${mod.lastUpdated ? new Date(mod.lastUpdated).toLocaleDateString() : 'N/A'})`
).join('\n') : '- No recent updates'}

## Modules by Category

${MODULE_CATEGORIES.map(category => {
  const categoryMods = modulesByCategory[category.id]
  if (!categoryMods || categoryMods.length === 0) return null

  return `### ${category.label} (${categoryMods.length} modules)

Top modules in this category:
${categoryMods.slice(0, 5).map(mod =>
  `- [${mod.name}](${baseUrl}/module/${mod.slug}): ${mod.shortDescription}`
).join('\n')}${categoryMods.length > 5 ? `\n- [View all ${category.label} modules](${baseUrl}/category/${category.id})` : ''}`
}).filter(Boolean).join('\n\n')}

## Module Index

Browse all ${stats.totalModules} modules alphabetically:

${allModules.slice(0, 50).map(mod =>
  `- [${mod.name}](${baseUrl}/module/${mod.slug}) by ${mod.author}`
).join('\n')}${allModules.length > 50 ? `\n\n[View complete module list](${baseUrl}/llms-full.txt)` : ''}

${generateAPISection(apiEndpoints, false)}

${generateModuleSubmissionSection(baseUrl)}

## modules Platform Features

### For Users
- **Browse & Search**: Find modules by name, category, or features
- **Ratings & Reviews**: Read and write detailed reviews
- **Download Tracking**: See download counts and popularity
- **Version History**: Track module updates and changelogs
- **Compatibility Filters**: Find modules for your device
- **Helpful Votes**: Vote on reviews that helped you

### For Developers
- **Easy Submission**: Web-based module submission
- **GitHub Integration**: Automatic release synchronization
- **Analytics**: Track downloads and user engagement
- **Version Management**: Manage multiple releases
- **User Feedback**: Direct feedback through reviews

### Module Review Process
- **Quality Assurance**: All modules are carefully reviewed
- **Safety First**: Modules checked for malicious code
- **Community Driven**: User reviews help identify quality modules
- **Regular Updates**: Continuous monitoring for issues

## License

The modules platform and its data is available under the Unlicense, and in the public domain. Individual modules have their own licenses as specified by their authors.

---

Last updated: ${new Date().toISOString().split('T')[0]}
Total modules: ${stats.totalModules} | Total downloads: ${totalDownloadCount.toLocaleString()}`

  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}