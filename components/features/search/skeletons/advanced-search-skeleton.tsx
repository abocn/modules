"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Filter, ChevronDown, ChevronUp } from "lucide-react"
import { ModuleCardSkeleton } from "@/components/features/modules/skeletons/module-card-skeleton"

export function AdvancedSearchSkeleton() {
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    rootMethods: true,
    androidVersions: false,
    preferences: false,
    status: false,
    additional: false
  })

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const FilterSectionSkeleton = ({ section, itemCount = 4 }: { section: string; itemCount?: number }) => {
    const isExpanded = expandedSections[section]
    return (
      <div className="space-y-3">
        <button
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full text-left"
          type="button"
        >
          <Skeleton className="h-4 w-24" />
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="space-y-2">
            {[...Array(itemCount)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2 min-h-[2.5rem] px-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const FilterSectionWithSliderSkeleton = ({ section }: { section: string }) => {
    const isExpanded = expandedSections[section]
    return (
      <div className="space-y-3">
        <button
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full text-left"
          type="button"
        >
          <Skeleton className="h-4 w-24" />
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex relative">
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
        showFilters && isMobile ? "opacity-100" : "opacity-0 pointer-events-none"
      }`} onClick={() => setShowFilters(false)} />

      <div className={`${
        isMobile
          ? `fixed inset-y-0 left-0 w-80 bg-background border-r z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
              showFilters ? "translate-x-0" : "-translate-x-full"
            }`
          : `transition-all duration-300 ease-in-out ${
              showFilters
                ? "w-80 border-r bg-muted/30 opacity-100"
                : "w-0 border-r-0 opacity-0 overflow-hidden"
            }`
      }`}>
        {isMobile && showFilters && (
          <div className="flex items-center justify-between p-4 border-b">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        )}

        <div className={`${isMobile ? "h-[calc(100vh-4rem)]" : "h-[calc(100vh-3.5rem)]"} overflow-auto`}>
          <div className="p-4 space-y-6">
            {!isMobile && showFilters && (
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded" />
                </div>
              </div>
            )}

            <FilterSectionSkeleton section="categories" itemCount={7} />
            <Separator />
            <FilterSectionSkeleton section="rootMethods" itemCount={3} />
            <Separator />

            <div className="space-y-3">
              <button
                onClick={() => toggleSection("androidVersions")}
                className="flex items-center justify-between w-full text-left"
                type="button"
              >
                <Skeleton className="h-4 w-32" />
                {expandedSections.androidVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.androidVersions && (
                <div className="grid grid-cols-2 gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-2 min-h-[2.25rem] px-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />
            <FilterSectionWithSliderSkeleton section="preferences" />
            <Separator />
            
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("status")}
                className="flex items-center justify-between w-full text-left"
                type="button"
              >
                <Skeleton className="h-4 w-28" />
                {expandedSections.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.status && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-2 min-h-[2.5rem] px-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-9 w-full rounded" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-9 w-full rounded" />
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <FilterSectionSkeleton section="additional" itemCount={2} />

            <div className="pt-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded" />
                <Skeleton className="h-7 w-24 rounded" />
              </div>
            </div>

            {isMobile && showFilters && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-9 flex-1 ml-2 rounded" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-9 flex-1 rounded" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-7 md:h-8 w-40 mb-2" />
              <Skeleton className="h-4 md:h-5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-9 w-40 rounded" />
              <Skeleton className="h-9 w-32 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-9 w-20 rounded" />
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <Skeleton className="h-9 w-full rounded" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded" />
                  ))}
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>

            <div className={`grid gap-4 ${
              showFilters && !isMobile
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            }`}>
              {[...Array(10)].map((_, i) => (
                <ModuleCardSkeleton key={i} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-1">
                <Skeleton className="h-9 w-12 rounded" />
                <Skeleton className="h-9 w-9 rounded" />
                <Skeleton className="h-4 w-24 mx-3" />
                <Skeleton className="h-9 w-9 rounded" />
                <Skeleton className="h-9 w-12 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}