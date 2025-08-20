import { notFound, redirect } from "next/navigation"
import { getModuleById, getModuleBySlug } from "@/lib/db-utils"
import type { Metadata } from "next"
import { ModulePageClient } from "@/components/pages/module-page-client"
import { DownloadButton } from "@/components/features/modules/download-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewSection } from "@/components/features/modules/review-section"
import { ExternalLink, MessageCircle, Star, Code, AlertTriangle, User, Smartphone, Eye } from "lucide-react"
import { SiMagisk } from "react-icons/si"
import { BsYinYang } from "react-icons/bs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { ModuleStructuredData } from "@/components/shared/structured-data"
import { ReleasesSection } from "@/components/features/modules/releases-section"
import { AllFilesSection } from "@/components/features/modules/all-files-section"
import { ChangelogSection } from "@/components/features/modules/changelog-section"

interface ModulePageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    id?: string
  }>
}

export async function generateMetadata({ params, searchParams }: ModulePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  let moduleData;
  if (resolvedSearchParams.id) {
    moduleData = await getModuleById(resolvedSearchParams.id, true)
  } else {
    moduleData = await getModuleBySlug(resolvedParams.slug, true)
  }

  if (!moduleData) {
    return {
      title: "Module Not Found",
      description: "The requested module could not be found.",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
  const moduleUrl = `${baseUrl}/module/${resolvedParams.slug}`

  return {
    title: `${moduleData.name} - ${moduleData.author}`,
    description: `${moduleData.description.slice(0, 155)}...`,
    keywords: [
      moduleData.name,
      moduleData.author,
      'magisk module',
      'kernelsu module',
      'android root',
      moduleData.category,
      ...moduleData.features.slice(0, 3),
    ],
    authors: [{ name: moduleData.author }],
    creator: moduleData.author,
    publisher: 'modules.lol',
    alternates: {
      canonical: moduleUrl,
    },
    openGraph: {
      title: `${moduleData.name} by ${moduleData.author}`,
      description: moduleData.description,
      url: moduleUrl,
      siteName: 'modules',
      locale: 'en_US',
      type: 'website',
      images: moduleData.icon ? [
        {
          url: moduleData.icon,
          width: 512,
          height: 512,
          alt: `${moduleData.name} icon`,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${moduleData.name} by ${moduleData.author}`,
      description: moduleData.description,
      images: moduleData.icon ? [moduleData.icon] : [],
    },
    other: {
      'android:version': moduleData.compatibility.androidVersions.join(', '),
      'root:methods': moduleData.compatibility.rootMethods.join(', '),
      'module:rating': moduleData.rating.toString(),
      'module:downloads': moduleData.downloads.toString(),
      'module:version': moduleData.version,
      'module:license': moduleData.license,
    },
  }
}

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  let moduleData;
  if (resolvedSearchParams.id) {
    moduleData = await getModuleById(resolvedSearchParams.id, true)
    if (moduleData) {
      redirect(`/module/${moduleData.slug}`)
    }
  } else {
    moduleData = await getModuleBySlug(resolvedParams.slug, true)
  }

  if (!moduleData) {
    notFound()
  }

  const displayModuleData = moduleData

  const compareVersions = (a: string, b: string) => {
    const cleanA = a.replace(/^v/, '').toLowerCase()
    const cleanB = b.replace(/^v/, '').toLowerCase()
    const partsA = cleanA.split(/[.-]/)
    const partsB = cleanB.split(/[.-]/)
    const isNumeric = (str: string) => /^\d+$/.test(str)
    const maxLength = Math.max(partsA.length, partsB.length)

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || '0'
      const partB = partsB[i] || '0'

      if (isNumeric(partA) && isNumeric(partB)) {
        const numA = parseInt(partA, 10)
        const numB = parseInt(partB, 10)
        if (numA !== numB) {
          return numA - numB
        }
      } else {
        const preReleaseOrder = { alpha: 1, beta: 2, rc: 3 }
        const orderA = preReleaseOrder[partA as keyof typeof preReleaseOrder] || (isNumeric(partA) ? parseInt(partA, 10) + 1000 : 999)
        const orderB = preReleaseOrder[partB as keyof typeof preReleaseOrder] || (isNumeric(partB) ? parseInt(partB, 10) + 1000 : 999)

        if (orderA !== orderB) {
          return orderA - orderB
        }

        if (partA !== partB) {
          return partA.localeCompare(partB)
        }
      }
    }

    return 0
  }

  const getLatestRelease = () => {
    if (!displayModuleData.releases || displayModuleData.releases.length === 0) {
      return displayModuleData.latestRelease
    }

    const sortedReleases = [...displayModuleData.releases].sort((a, b) => -compareVersions(a.version, b.version))
    return sortedReleases[0] || displayModuleData.latestRelease
  }

  const latestRelease = getLatestRelease()
  const currentVersion = latestRelease?.version || displayModuleData.version
  const currentSize = latestRelease?.size || displayModuleData.size

  const getWarningIcon = (type: string) => {
    switch (type) {
      case "malware":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "closed-source":
        return <Eye className="w-4 h-4 text-orange-500" />
      case "stolen-code":
        return <Code className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (categoryId: string) => {
    const category = MODULE_CATEGORIES.find(cat => cat.id === categoryId)
    return category?.shortLabel || categoryId
  }

  return (
    <>
      <ModuleStructuredData module={displayModuleData} />
      <ModulePageClient moduleName={displayModuleData.name}>
        <div className="w-full h-full md:grid md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 md:gap-0 overflow-x-hidden">
          <div className="w-full md:col-span-2 lg:col-span-2 xl:col-span-2 md:h-full md:overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-4 lg:p-6 xl:p-8 space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
              <div className="flex items-start gap-4 sm:gap-6 lg:gap-8 w-full overflow-hidden">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex-shrink-0 shadow-lg ring-2 ring-border/50">
                  <AvatarImage src={displayModuleData.icon} alt={displayModuleData.name} />
                  <AvatarFallback className="rounded-3xl bg-gradient-to-br from-gray-700 to-gray-900 text-white text-lg sm:text-xl font-bold">
                    {displayModuleData.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden items-center">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words leading-tight">{displayModuleData.name}</h1>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground text-sm sm:text-base truncate font-medium">{displayModuleData.author}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm sm:text-base mt-1">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="font-medium">
                        {displayModuleData.rating}
                      </span>
                      <span className="text-muted-foreground">
                        ({displayModuleData.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">{displayModuleData.downloads.toLocaleString()}</span>
                      <span>downloads</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {displayModuleData.isOpenSource && (
                  <Badge variant="outline" className="border-muted-foreground text-sm px-3 py-1">
                    <Code className="w-3 h-3 mr-1.5" />
                    Open Source
                  </Badge>
                )}
                <Badge variant="outline" className="text-sm px-3 py-1">{displayModuleData.license}</Badge>
                {displayModuleData.isFeatured && <Badge variant="secondary" className="text-sm px-3 py-1">Featured</Badge>}
                {displayModuleData.isRecommended && <Badge variant="secondary" className="text-sm px-3 py-1">Recommended</Badge>}
              </div>

              <div className="md:hidden w-full">
                <Card className="shadow-md gap-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DownloadButton module={displayModuleData} />
                    <div className="flex flex-col sm:flex-row gap-2">
                      {displayModuleData.communityUrl && (
                        <Button variant="outline" className="flex-1 bg-transparent h-9" asChild>
                          <a href={displayModuleData.communityUrl} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Join Community</span>
                            <span className="sm:hidden">Community</span>
                          </a>
                        </Button>
                      )}
                      {displayModuleData.sourceUrl && (
                        <Button variant="outline" className="flex-1 bg-transparent h-9" asChild>
                          <a href={displayModuleData.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">View Source</span>
                            <span className="sm:hidden">Source</span>
                          </a>
                        </Button>
                      )}
                    </div>
                    {displayModuleData.releases && displayModuleData.releases.length > 1 && (
                      <div className="pt-3 border-t">
                        <span className="text-sm text-muted-foreground font-medium">
                          {displayModuleData.releases.length} versions available
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {displayModuleData.warnings.length > 0 && (
                <Card className="border-red-500/50 bg-red-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Security Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 -mt-4">
                    {displayModuleData.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start gap-2 text-red-300">
                        {getWarningIcon(warning.type)}
                        <span className="text-sm">{warning.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="w-full max-w-full shadow-md">
                <CardHeader>
                  <CardTitle>About this module</CardTitle>
                </CardHeader>
                <CardContent className="w-full max-w-full">
                  <div className="text-muted-foreground w-full max-w-full overflow-hidden break-words text-sm sm:text-base leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_p]:mb-3 [&_p]:break-words [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_li]:break-words [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:break-words [&_code]:bg-muted [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:break-all [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:max-w-full [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_strong]:font-semibold [&_strong]:break-words [&_em]:italic [&_em]:break-words [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4 [&_thead]:border-b-2 [&_thead]:border-muted [&_th]:text-left [&_th]:p-2 [&_th]:font-semibold [&_td]:p-2 [&_td]:border-b [&_td]:border-muted [&_tr:last-child_td]:border-b-0">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {displayModuleData.description}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full max-w-full shadow-md">
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent className="w-full max-w-full">
                  <ul className="space-y-3 -mt-2">
                    {displayModuleData.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 w-full">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground break-words flex-1 text-sm sm:text-base leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <ChangelogSection module={displayModuleData} />

              <AllFilesSection module={displayModuleData} />

              <Card className="md:hidden shadow-md gap-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Module Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Version</span>
                      <span className="font-semibold text-sm text-right">{currentVersion}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Size</span>
                      <span className="font-semibold text-sm text-right">{currentSize}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Updated</span>
                      <span className="font-semibold text-sm text-right">{displayModuleData.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Category</span>
                      <span className="font-semibold text-sm text-right">{getCategoryLabel(displayModuleData.category)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-base">
                      <Smartphone className="w-4 h-4" />
                      Compatibility
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium mb-2 block">Android Versions:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {displayModuleData.compatibility.androidVersions.map((version) => (
                            <Badge key={version} variant="outline" className="text-xs px-2 py-1">
                              {version}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-medium mb-2 block">Root Methods:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {displayModuleData.compatibility.rootMethods.map((method) => (
                            method === "Magisk" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <SiMagisk className="w-3 h-3 mr-1" />
                                Magisk
                              </Badge>
                            ) : method === "KernelSU" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-3 h-3 mr-1">
                                  <rect x="0" y="0" width="100" height="100" fill="currentColor"/>
                                  <rect x="100" y="0" width="100" height="100" fill="transparent"/>
                                  <rect x="0" y="100" width="100" height="100" fill="transparent"/>
                                  <rect x="100" y="100" width="100" height="100" fill="currentColor"/>
                                  <rect x="0" y="0" width="200" height="200" fill="none" stroke="currentColor" strokeWidth="12"/>
                                </svg>
                                KernelSU
                              </Badge>
                            ) : method === "KernelSU-Next" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <BsYinYang className="w-3 h-3 mr-1" />
                                KernelSU-Next
                              </Badge>
                            ) : null
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="md:hidden">
                <ReleasesSection module={displayModuleData} />
              </div>

              <ReviewSection module={displayModuleData} />
            </div>
          </div>

          <div className="hidden md:block md:col-span-1 lg:col-span-1 xl:col-span-1 h-full overflow-y-auto border-l border-border bg-muted/20">
            <div className="p-4 lg:p-6 xl:p-8 space-y-4 lg:space-y-6 xl:space-y-8 w-full">
              <Card className="shadow-md gap-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DownloadButton module={displayModuleData} />
                  <div className="flex flex-col gap-2">
                    {displayModuleData.communityUrl && (
                      <Button variant="outline" className="w-full bg-transparent h-9" asChild>
                        <a href={displayModuleData.communityUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-4 h-4" />
                          Join Community
                        </a>
                      </Button>
                    )}
                    {displayModuleData.sourceUrl && (
                      <Button variant="outline" className="w-full bg-transparent h-9" asChild>
                        <a href={displayModuleData.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          View Source
                        </a>
                      </Button>
                    )}
                  </div>
                  {displayModuleData.releases && displayModuleData.releases.length > 1 && (
                    <div className="pt-3 border-t">
                      <span className="text-sm text-muted-foreground font-medium">
                        {displayModuleData.releases.length} versions available
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-md gap-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg font-semibold">Module Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Version</span>
                      <span className="font-semibold text-sm text-right">{currentVersion}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Size</span>
                      <span className="font-semibold text-sm text-right">{currentSize}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Updated</span>
                      <span className="font-semibold text-sm text-right">{displayModuleData.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground text-sm font-medium">Category</span>
                      <span className="font-semibold text-sm text-right">{getCategoryLabel(displayModuleData.category)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-base">
                      <Smartphone className="w-4 h-4" />
                      Compatibility
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium mb-2 block">Android Versions:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {displayModuleData.compatibility.androidVersions.map((version) => (
                            <Badge key={version} variant="outline" className="text-xs px-2 py-1">
                              {version}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-medium mb-2 block">Root Methods:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {displayModuleData.compatibility.rootMethods.map((method) => (
                            method === "Magisk" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <SiMagisk className="w-3 h-3 mr-1" />
                                Magisk
                              </Badge>
                            ) : method === "KernelSU" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-3 h-3 mr-1">
                                  <rect x="0" y="0" width="100" height="100" fill="currentColor"/>
                                  <rect x="100" y="0" width="100" height="100" fill="transparent"/>
                                  <rect x="0" y="100" width="100" height="100" fill="transparent"/>
                                  <rect x="100" y="100" width="100" height="100" fill="currentColor"/>
                                  <rect x="0" y="0" width="200" height="200" fill="none" stroke="currentColor" strokeWidth="12"/>
                                </svg>
                                KernelSU
                              </Badge>
                            ) : method === "KernelSU-Next" ? (
                              <Badge variant="outline" className="text-xs h-6 px-2" key={method}>
                                <BsYinYang className="w-3 h-3 mr-1" />
                                KernelSU-Next
                              </Badge>
                            ) : null
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ReleasesSection module={displayModuleData} />
            </div>
          </div>
        </div>
      </ModulePageClient>
    </>
  )
}