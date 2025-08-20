"use client"

import type { Module } from "@/types/module";
import { FlashlightCard, FlashlightCardContent } from "@/components/ui/flashlight-card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Download,
  AlertTriangle,
  Code,
} from "lucide-react";
import { SiMagisk } from "react-icons/si";
import { BsYinYang } from "react-icons/bs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ModuleCardProps {
  module: Module
  onClick: () => void
}

export function ModuleCard({ module, onClick }: ModuleCardProps) {
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
    if (module.releases && module.releases.length > 0) {
      const sortedReleases = [...module.releases].sort((a, b) => -compareVersions(a.version, b.version))
      return sortedReleases[0]
    }
    return module.latestRelease
  }

  const latestRelease = getLatestRelease()
  const currentVersion = latestRelease?.version || module.version
  const currentSize = latestRelease?.size || module.size

  const getWarningColor = (type: string) => {
    switch (type) {
      case "malware":
        return "destructive"
      case "closed-source":
        return "warning"
      case "stolen-code":
        return "destructive"
      default:
        return "destructive"
    }
  }

  return (
    <FlashlightCard
      className="cursor-pointer hover:shadow-lg transition-[shadow,transform] duration-200 hover:duration-200 active:duration-75 h-[270px] flex flex-col border-border active:scale-[0.98] py-0"
      onClick={onClick}
      flashlightSize={500}
      flashlightIntensity={0.03}
      borderGlowIntensity={0.08}
    >
      <FlashlightCardContent className="p-4 pb-3 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3 min-h-[60px]">
          <Avatar className="w-12 h-12 rounded-xl flex-shrink-0">
            <AvatarImage src={module.icon} alt={module.name} />
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white font-semibold">
              {module.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1">{module.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{module.author}</p>
          </div>
        </div>

        <div className="mb-3 h-12">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-4 break-words text-ellipsis">{module.shortDescription}</p>
        </div>

        <div className="flex items-center gap-1 mb-3 h-4">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">
            {module.rating} ({module.reviewCount.toLocaleString()})
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 h-5">
          {module.isOpenSource && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              <Code className="w-2.5 h-2.5 mr-1" />
              Open Source
            </Badge>
          )}
          {module.isFeatured && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              Featured
            </Badge>
          )}
          {module.warnings.length > 0 && (
            <Badge
              variant={getWarningColor(module.warnings[0].type)}
              className={`text-xs h-5 px-1.5 ${
                module.warnings[0].type === "closed-source" ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
              Warning
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground mb-2 h-5 flex items-center gap-1">
          {module.compatibility.rootMethods.map((method) => (
            method === "Magisk" ? (
              <Badge variant="outline" className="text-xs h-5 px-1.5" key={method}>
                <SiMagisk />
                Magisk
              </Badge>
            ) : method === "KernelSU" ? (
              <Badge variant="outline" className="text-xs h-5 px-1.5" key={method}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
                  <rect x="0" y="0" width="100" height="100" fill="#000000"/>
                  <rect x="100" y="0" width="100" height="100" fill="#ffffff"/>
                  <rect x="0" y="100" width="100" height="100" fill="#ffffff"/>
                  <rect x="100" y="100" width="100" height="100" fill="#000000"/>\
                  <rect x="0" y="0" width="200" height="200" fill="none" stroke="#000000" strokeWidth="12"/>
                </svg>
                KernelSU
              </Badge>
            ) : method === "KernelSU-Next" ? (
              <Badge variant="outline" className="text-xs h-5 px-1.5" key={method}>
                <BsYinYang />
                KernelSU-Next
              </Badge>
            ) : null
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-16">{module.downloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs truncate max-w-20">{currentSize}</span>
            <span className="text-xs truncate max-w-24">v{currentVersion}</span>
          </div>
        </div>
      </FlashlightCardContent>
    </FlashlightCard>
  )
}
