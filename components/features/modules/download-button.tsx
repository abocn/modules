"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, ChevronDown, FileDown } from "lucide-react"
import type { Module, Release } from "@/types/module"
import { useDownloadTracking } from "@/hooks/use-modules"

interface DownloadButtonProps {
  module: Module
}

export function DownloadButton({ module }: DownloadButtonProps) {
  const { trackDownload } = useDownloadTracking()
  const [isTracking, setIsTracking] = useState(false)

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
    if (!module.releases || module.releases.length === 0) {
      return module.latestRelease
    }

    const sortedReleases = [...module.releases].sort((a, b) => -compareVersions(a.version, b.version))
    return sortedReleases[0] || module.latestRelease
  }

  const getBestDownloadUrl = (release: Release | null | undefined) => {
    if (!release) return null

    if (!release.assets || release.assets.length === 0) {
      return release.downloadUrl
    }

    const releaseFile = release.assets.find((asset) =>
      asset.name.toLowerCase().includes('release')
    )

    if (releaseFile) {
      return releaseFile.downloadUrl
    }

    return release.assets[0]?.downloadUrl || release.downloadUrl
  }

  const handleDownload = async (downloadUrl: string, releaseId?: number) => {
    if (!downloadUrl) return

    setIsTracking(true)
    try {
      await trackDownload(module.id, releaseId)
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Failed to track download:', error)
      window.open(downloadUrl, '_blank')
    } finally {
      setIsTracking(false)
    }
  }

  const handleAssetDownload = (asset: { downloadUrl: string; name: string; size: string }, releaseId: number) => {
    handleDownload(asset.downloadUrl, releaseId)
  }

  const latestRelease = getLatestRelease()
  const bestDownloadUrl = getBestDownloadUrl(latestRelease)
  const hasMultipleFiles = latestRelease?.assets && latestRelease.assets.length > 1

  if (!hasMultipleFiles) {
    return (
      <Button
        className="w-full h-10 text-sm font-medium"
        size="default"
        onClick={() => bestDownloadUrl && handleDownload(bestDownloadUrl, latestRelease?.id)}
        disabled={!bestDownloadUrl || isTracking}
      >
        <Download className="w-4 h-4" />
        {isTracking ? 'Preparing...' : `Download Latest (${latestRelease?.version || module.version})`}
      </Button>
    )
  }

  return (
    <div className="w-full space-y-2">
      <Button
        className="w-full h-10 text-sm font-medium"
        size="default"
        onClick={() => bestDownloadUrl && handleDownload(bestDownloadUrl, latestRelease?.id)}
        disabled={!bestDownloadUrl || isTracking}
      >
        <Download className="w-4 h-4" />
        {isTracking ? 'Preparing...' : `Download Latest (${latestRelease?.version || module.version})`}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full h-9 text-sm" size="sm">
            <FileDown className="w-4 h-4" />
            All Files
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {latestRelease?.assets && latestRelease.assets.length > 0 ? (
            latestRelease.assets.map((asset, idx) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => handleAssetDownload(asset, latestRelease.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center">
                  <FileDown className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{asset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {latestRelease.version} • {asset.size}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          ) : latestRelease ? (
            <DropdownMenuItem
              onClick={() => handleDownload(latestRelease.downloadUrl, latestRelease.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center">
                <Download className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Version {latestRelease.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {latestRelease.size} • {latestRelease.downloads} downloads
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}