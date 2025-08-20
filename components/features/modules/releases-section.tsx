"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Download as DownloadIcon, Package, Info, FileDown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import type { Module } from "@/types/module"
import { useDownloadTracking } from "@/hooks/use-modules"

interface ReleasesSectionProps {
  module: Module
}

const RELEASES_PER_PAGE = 5

export function ReleasesSection({ module }: ReleasesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const { trackDownload } = useDownloadTracking()
  const [isTracking, setIsTracking] = useState<number | null>(null)

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

  const sortedReleases = useMemo(() => {
    if (!module.releases || module.releases.length === 0) {
      return []
    }

    const releases = [...module.releases]

    releases.sort((a, b) => {
      const versionComparison = compareVersions(a.version, b.version)

      if (sortOrder === "newest") {
        return -versionComparison
      } else {
        return versionComparison
      }
    })

    return releases
  }, [module.releases, sortOrder])

  const totalPages = Math.ceil(sortedReleases.length / RELEASES_PER_PAGE)
  const startIndex = (currentPage - 1) * RELEASES_PER_PAGE
  const endIndex = startIndex + RELEASES_PER_PAGE
  const currentReleases = sortedReleases.slice(startIndex, endIndex)


  const handleSortChange = (value: string) => {
    setSortOrder(value as typeof sortOrder)
    setCurrentPage(1)
  }

  const handleDownload = async (downloadUrl: string, releaseId: number) => {
    if (!downloadUrl) return

    setIsTracking(releaseId)
    try {
      await trackDownload(module.id, releaseId)
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Failed to track download:', error)
      window.open(downloadUrl, '_blank')
    } finally {
      setIsTracking(null)
    }
  }

  const handleAssetDownload = (asset: { downloadUrl: string; name: string; size: string }, releaseId: number) => {
    handleDownload(asset.downloadUrl, releaseId)
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  if (sortedReleases.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            All Releases
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={sortOrder} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full xs:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground sm:ml-auto">
            {sortedReleases.length} release{sortedReleases.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="space-y-3">
            {currentReleases.map((release) => (
              <div key={release.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium break-words">{release.version}</span>
                      {release.isLatest && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">Latest</Badge>
                      )}
                    </div>
                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs text-muted-foreground">
                      <span className="break-words">{release.size}</span>
                      <span className="break-words">{release.downloads} downloads</span>
                    </div>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2 flex-shrink-0">
                    {release.changelog && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Info className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Release {release.version} - Changelog</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm overflow-hidden break-words [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_p]:break-words [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_li]:break-words [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:break-words [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:break-all [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:break-all [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_strong]:font-semibold [&_strong]:break-words [&_em]:italic [&_em]:break-words">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            >
                              {release.changelog}
                            </ReactMarkdown>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8">
                          <DownloadIcon className="w-4 h-4" />
                          Download
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Download {release.version}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          {release.assets && release.assets.length > 0 ? (
                            release.assets.map((asset, idx) => (
                              <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileDown className="w-5 h-5 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium text-sm">{asset.name}</div>
                                    <div className="text-xs text-muted-foreground">{asset.size}</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleAssetDownload(asset, release.id)}
                                  disabled={isTracking === release.id}
                                >
                                  <DownloadIcon className="w-4 h-4" />
                                  {isTracking === release.id ? 'Preparing...' : 'Download'}
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="border rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileDown className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium text-sm">Version {release.version}</div>
                                  <div className="text-xs text-muted-foreground">{release.size}</div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleDownload(release.downloadUrl, release.id)}
                                disabled={isTracking === release.id}
                              >
                                <DownloadIcon className="w-4 h-4" />
                                {isTracking === release.id ? 'Preparing...' : 'Download'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {release.changelog && (
                  <div className="text-sm text-muted-foreground [&_p]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_strong]:font-semibold">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {truncateText(release.changelog)}
                    </ReactMarkdown>
                    {release.changelog.length > 150 && (
                      <span className="text-xs text-muted-foreground/70"> (truncated)</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0 flex-shrink-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}