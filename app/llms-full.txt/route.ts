import { db } from '@/db'
import { modules, releases, ratings, user } from '@/db/schema'
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
      description: modules.description,
      shortDescription: modules.shortDescription,
      category: modules.category,
      author: modules.author,
      isFeatured: modules.isFeatured,
      isRecommended: modules.isRecommended,
      isOpenSource: modules.isOpenSource,
      license: modules.license,
      compatibility: modules.compatibility,
      features: modules.features,
      sourceUrl: modules.sourceUrl,
      communityUrl: modules.communityUrl,
      githubRepo: modules.githubRepo,
      lastUpdated: modules.lastUpdated,
      createdAt: modules.createdAt,
      submittedBy: modules.submittedBy,
      submitterName: user.name,
    })
    .from(modules)
    .leftJoin(user, eq(modules.submittedBy, user.id))
    .where(
      and(
        eq(modules.status, 'approved'),
        eq(modules.isPublished, true)
      )
    )
    .orderBy(desc(modules.isFeatured), desc(modules.isRecommended), desc(modules.lastUpdated))

  const moduleReleases = await db
    .select({
      moduleId: releases.moduleId,
      version: releases.version,
      downloadUrl: releases.downloadUrl,
      size: releases.size,
      changelog: releases.changelog,
      downloads: releases.downloads,
      isLatest: releases.isLatest,
      createdAt: releases.createdAt,
    })
    .from(releases)
    .orderBy(desc(releases.createdAt))

  const moduleRatings = await db
    .select({
      moduleId: ratings.moduleId,
      avgRating: sql<number>`avg(${ratings.rating})`,
      totalRatings: sql<number>`count(*)`,
      recentComment: sql<string>`(
        SELECT comment FROM ${ratings} r2 
        WHERE r2.module_id = ${ratings.moduleId} 
        ORDER BY r2.created_at DESC 
        LIMIT 1
      )`,
    })
    .from(ratings)
    .groupBy(ratings.moduleId)

  const ratingsMap = moduleRatings.reduce((acc, rating) => {
    acc[rating.moduleId] = {
      avgRating: Number(rating.avgRating).toFixed(1),
      totalRatings: rating.totalRatings,
      recentComment: rating.recentComment,
    }
    return acc
  }, {} as Record<string, { avgRating: string; totalRatings: number; recentComment: string | null }>)

  const releasesMap = moduleReleases.reduce((acc, release) => {
    if (!acc[release.moduleId]) {
      acc[release.moduleId] = []
    }
    acc[release.moduleId].push(release)
    return acc
  }, {} as Record<string, typeof moduleReleases>)

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

  const stats = moduleStats[0] || {
    totalModules: 0,
    featuredCount: 0,
    recommendedCount: 0,
    openSourceCount: 0,
    totalRatings: 0,
    avgRating: 0,
  }

  const totalDownloads = moduleReleases.reduce((sum, release) => sum + (release.downloads || 0), 0)
  const totalReleases = moduleReleases.length

  const categoryStats = MODULE_CATEGORIES.map(category => {
    const categoryMods = allModules.filter(mod => mod.category === category.id)
    const categoryReleases = categoryMods.flatMap(mod => releasesMap[mod.id] || [])
    const categoryDownloads = categoryReleases.reduce((sum, rel) => sum + (rel.downloads || 0), 0)

    return {
      category: category.label,
      id: category.id,
      totalModules: categoryMods.length,
      featured: categoryMods.filter(m => m.isFeatured).length,
      recommended: categoryMods.filter(m => m.isRecommended).length,
      openSource: categoryMods.filter(m => m.isOpenSource).length,
      totalDownloads: categoryDownloads,
      avgRating: categoryMods.reduce((sum, mod) => {
        const rating = ratingsMap[mod.id]
        return sum + (rating ? parseFloat(rating.avgRating) : 0)
      }, 0) / (categoryMods.length || 1)
    }
  })

  const apiEndpoints = await getAPIEndpoints()

  const llmsFullTxt = `# modules

> "modules" is a web-based Magisk/KernelSU modules repository. This is a comprehensive data dump of all Android root modules, including full descriptions, releases, ratings, and metadata.

## Platform Statistics

### Overall Metrics
- **Total Modules**: ${stats.totalModules}
- **Featured Modules**: ${stats.featuredCount}
- **Recommended Modules**: ${stats.recommendedCount}
- **Open Source Modules**: ${stats.openSourceCount}
- **Total Downloads**: ${totalDownloads.toLocaleString()}
- **Total Releases**: ${totalReleases.toLocaleString()}
- **Total Reviews**: ${stats.totalRatings.toLocaleString()}
- **Average Rating**: ${Number(stats.avgRating).toFixed(2)}/5

### Category Statistics
${categoryStats.map(cat =>
  `- **${cat.category}**: ${cat.totalModules} modules, ${cat.totalDownloads.toLocaleString()} downloads, ${cat.avgRating.toFixed(1)}★ avg`
).join('\n')}

${generateNavigationSection(baseUrl)}

## Module Database

Total of ${allModules.length} modules in the repository:

${allModules.map((mod, index) => {
  const rating = ratingsMap[mod.id]
  const modReleases = releasesMap[mod.id] || []
  const latestReleases = modReleases.slice(0, 30)
  const totalModDownloads = modReleases.reduce((sum, rel) => sum + (rel.downloads || 0), 0)

  return `### ${index + 1}. ${mod.name}

**Module URL:** [${baseUrl}/module/${mod.slug}](${baseUrl}/module/${mod.slug})
**Author:** ${mod.author}
**Category:** ${MODULE_CATEGORIES.find(c => c.id === mod.category)?.label || mod.category}
**License:** ${mod.license || 'Not specified'}
**Open Source:** ${mod.isOpenSource ? '✅ Yes' : '❌ No'}
${mod.isFeatured ? '**⭐ Featured Module**\n' : ''}${mod.isRecommended ? '**👍 Recommended Module**\n' : ''}${rating ? `**Rating:** ${rating.avgRating}/5 (${rating.totalRatings} reviews)\n` : '**Rating:** No reviews yet\n'}${mod.submitterName ? `**Submitted by:** ${mod.submitterName}\n` : ''}**Last Updated:** ${mod.lastUpdated ? new Date(mod.lastUpdated).toISOString().split('T')[0] : 'N/A'}
**Created:** ${mod.createdAt ? new Date(mod.createdAt).toISOString().split('T')[0] : 'N/A'}
**Total Downloads:** ${totalModDownloads.toLocaleString()}

#### Short Description
${mod.shortDescription}

#### Full Description
${mod.description || 'No detailed description available.'}

#### Features
${mod.features && Array.isArray(mod.features) && mod.features.length > 0
  ? mod.features.map(f => `- ${f}`).join('\n')
  : 'No features listed'}

#### Compatibility
${mod.compatibility
  ? `- **Android Versions:** ${mod.compatibility.androidVersions?.join(', ') || 'Not specified'}
- **Root Methods:** ${mod.compatibility.rootMethods?.join(', ') || 'Not specified'}`
  : 'Compatibility information not specified'}

#### Links & Resources
${[
  mod.sourceUrl ? `- **Source Code:** ${mod.sourceUrl}` : null,
  mod.githubRepo ? `- **GitHub Repository:** ${mod.githubRepo}` : null,
  mod.communityUrl ? `- **Community/Support:** ${mod.communityUrl}` : null,
].filter(Boolean).join('\n') || '- No external links provided'}

#### Latest User Review
${rating?.recentComment ? `"${rating.recentComment}"` : 'No reviews available'}

#### Release History (Latest ${Math.min(30, latestReleases.length)} of ${modReleases.length})
${latestReleases.length > 0 ? latestReleases.map(release => {
  const releaseDate = new Date(release.createdAt).toISOString().split('T')[0]
  const changelogPreview = release.changelog 
    ? release.changelog.substring(0, 200) + (release.changelog.length > 200 ? '...' : '')
    : 'No changelog provided'

  return `##### Version ${release.version}${release.isLatest ? ' (Latest)' : ''}
- **Released:** ${releaseDate}
- **Downloads:** ${release.downloads.toLocaleString()}
- **Size:** ${release.size}
- **Changelog:** ${changelogPreview}
- **Download:** [${release.downloadUrl}](${release.downloadUrl})`
}).join('\n\n') : 'No releases available'}

---
`}).join('\n')}

## Module Categories Deep Dive

${MODULE_CATEGORIES.map(category => {
  const categoryMods = allModules.filter(mod => mod.category === category.id)
  const catStats = categoryStats.find(c => c.id === category.id)
  if (!categoryMods.length) return null

  return `### ${category.label}

**Category Overview:**
- Total modules: ${categoryMods.length}
- Featured: ${catStats?.featured || 0}
- Recommended: ${catStats?.recommended || 0}
- Open Source: ${catStats?.openSource || 0}
- Total Downloads: ${catStats?.totalDownloads.toLocaleString() || '0'}
- Average Rating: ${catStats?.avgRating.toFixed(2) || '0.00'}/5

**Top Modules by Downloads:**
${categoryMods
  .sort((a, b) => {
    const aDownloads = (releasesMap[a.id] || []).reduce((sum, r) => sum + r.downloads, 0)
    const bDownloads = (releasesMap[b.id] || []).reduce((sum, r) => sum + r.downloads, 0)
    return bDownloads - aDownloads
  })
  .slice(0, 10)
  .map((mod, idx) => {
    const downloads = (releasesMap[mod.id] || []).reduce((sum, r) => sum + r.downloads, 0)
    const rating = ratingsMap[mod.id]
    return `${idx + 1}. [${mod.name}](${baseUrl}/module/${mod.slug}) - ${downloads.toLocaleString()} downloads${rating ? `, ${rating.avgRating}★` : ''}`
  })
  .join('\n')}

**All Modules in Category:**
${categoryMods.map(mod => `- [${mod.name}](${baseUrl}/module/${mod.slug}) by ${mod.author}`).join('\n')}`
}).filter(Boolean).join('\n\n')}

${generateAPISection(apiEndpoints, false)}

${generateModuleSubmissionSection(baseUrl)}

## Platform Features

### User Features
- **Module Discovery**: Browse by category, search by keywords, filter by compatibility
- **Ratings System**: 1-5 star ratings with detailed reviews
- **Helpful Votes**: Community-driven review quality system
- **Download Tracking**: See popularity and download trends
- **Version Management**: Access to all historical releases
- **Compatibility Checking**: Filter modules by device and Android version
- **Direct Downloads**: One-click downloads with automatic release selection

### Developer Features
- **Module Submission**: Web-based submission with validation
- **GitHub Integration**: Automatic release synchronization via GitHub API
- **License Management**: Specify and display module licenses
- **Source Code Linking**: Link to repositories and documentation

## Data Export Information

### Export Metadata
- **Export Date:** ${new Date().toISOString()}
- **Total Modules:** ${stats.totalModules}
- **Total Releases:** ${totalReleases}
- **Total Downloads:** ${totalDownloads.toLocaleString()}

## License

The modules platform and its data is available under the Unlicense, and in the public domain. Individual modules have their own licenses as specified by their authors.

---

Generated: ${new Date().toISOString()}
Modules: ${stats.totalModules} | Releases: ${totalReleases} | Downloads: ${totalDownloads.toLocaleString()}`

  return new Response(llmsFullTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}