"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Module, Release } from "@/types/module"

interface ChangelogSectionProps {
  module: Module
}

export function ChangelogSection({ module }: ChangelogSectionProps) {
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
  const latestChangelog = actualLatestRelease?.changelog || module.changelog || "No changelog available"

  return (
    <Card>
      <CardHeader>
        <CardTitle>What&apos;s New{actualLatestRelease ? ` (v${actualLatestRelease.version})` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground max-w-none overflow-hidden break-words [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:break-all [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-sm [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_strong]:font-semibold [&_em]:italic">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{latestChangelog}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}