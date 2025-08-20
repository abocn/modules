"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileDown, Download as DownloadIcon } from "lucide-react"
import type { Module, Release } from "@/types/module"

interface AllFilesSectionProps {
  module: Module
}

export function AllFilesSection({ module }: AllFilesSectionProps) {
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

  const getLatestRelease = (): Release | null | undefined => {
    if (!module.releases || module.releases.length === 0) {
      return module.latestRelease
    }

    const sortedReleases = [...module.releases].sort((a, b) => -compareVersions(a.version, b.version))
    return sortedReleases[0] || module.latestRelease
  }

  const actualLatestRelease = getLatestRelease()

  if (!actualLatestRelease || !actualLatestRelease.assets || actualLatestRelease.assets.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          All Files (Latest Release v{actualLatestRelease.version})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actualLatestRelease.assets.map((asset, index) => (
            <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileDown className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-muted-foreground">{asset.size}</div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => window.open(asset.downloadUrl, '_blank')}
              >
                <DownloadIcon className="w-4 h-4" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}