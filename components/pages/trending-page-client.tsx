"use client"

import { useState, useEffect } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { ModuleCard } from "@/components/features/modules/module-card"
import { ModuleCardSkeleton } from "@/components/features/modules/skeletons/module-card-skeleton"
import { useModuleNavigation } from "@/lib/navigation"
import type { Module } from "@/types/module"
import { TrendingUp, Flame, Download, Star, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TrendingAlgorithm = 'downloads' | 'rating' | 'recent' | 'combined'

export function TrendingPageClient() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [algorithm, setAlgorithm] = useState<TrendingAlgorithm>('downloads')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  useEffect(() => {
    const fetchTrendingModules = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/modules?filter=trending&algorithm=${algorithm}&range=${timeRange}`)
        if (!response.ok) {
          throw new Error('Failed to fetch trending modules')
        }
        const data = await response.json()
        setModules(data.modules || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingModules()
  }, [algorithm, timeRange])

  const sortModulesByAlgorithm = (modules: Module[]) => {
    switch (algorithm) {
      case 'rating':
        return [...modules].sort((a, b) => b.rating - a.rating)
      case 'recent':
        return [...modules].sort((a, b) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        )
      case 'combined':
        return [...modules].sort((a, b) => {
          const aScore = (a.downloads * 0.5) + (a.rating * 100) + (a.reviewCount * 10)
          const bScore = (b.downloads * 0.5) + (b.rating * 100) + (b.reviewCount * 10)
          return bScore - aScore
        })
      case 'downloads':
      default:
        return [...modules].sort((a, b) => b.downloads - a.downloads)
    }
  }

  const displayModules = sortModulesByAlgorithm(modules)

  if (error) {
    return (
      <SharedLayout
        currentPage="Trending"
        selectedCategory="trending"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="container mx-auto p-6">
          <Alert className="border-destructive">
            <AlertDescription>
              Failed to load trending modules: {error}
            </AlertDescription>
          </Alert>
        </div>
      </SharedLayout>
    )
  }

  return (
    <SharedLayout
      currentPage="Trending"
      selectedCategory="trending"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold">Trending Modules</h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as TrendingAlgorithm)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>By Downloads</span>
                  </div>
                </SelectItem>
                <SelectItem value="rating">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span>By Rating</span>
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Most Recent</span>
                  </div>
                </SelectItem>
                <SelectItem value="combined">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Combined Score</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as '7d' | '30d' | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No trending modules yet</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Trending modules will appear here as they gain downloads and popularity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayModules.map((module, index) => (
            <div key={module.id} className="relative">
              {index < 3 && (
                <div className="absolute -top-2 -left-2 z-10">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-yellow-500 text-yellow-900' : ''}
                    ${index === 1 ? 'bg-gray-400 text-gray-900' : ''}
                    ${index === 2 ? 'bg-orange-600 text-orange-100' : ''}
                  `}>
                    {index + 1}
                  </div>
                </div>
              )}
              <ModuleCard module={module} onClick={() => handleModuleSelect(module)} />
            </div>
          ))}
        </div>
      )}
      </div>
    </SharedLayout>
  )
}