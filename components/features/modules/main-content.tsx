"use client"

import type { Module } from "@/types/module"
import { ModuleCard } from "@/components/features/modules/module-card"
import { ModulesCarousel } from "@/components/features/modules/modules-carousel"
import { ClockCard } from "@/components/features/stats/clock-card"
import { TelegramCard } from "@/components/features/stats/telegram-card"
import { RandomStatCard } from "@/components/features/stats/random-stat-card"
import { useModules } from "@/hooks/use-modules"
import { useStats } from "@/hooks/use-stats"
import { useCachedAuth } from "@/hooks/use-cached-auth"
import { HomePageSkeleton } from "@/components/features/modules/skeletons/home-page-skeleton"
import { CategoryPageSkeleton } from "@/components/features/modules/skeletons/category-page-skeleton"
import { CarouselSkeleton } from "@/components/features/modules/skeletons/carousel-skeleton"

interface MainContentProps {
  selectedCategory: string
  searchQuery: string
  onModuleSelect: (module: Module) => void
}

export function MainContent({ selectedCategory, searchQuery, onModuleSelect }: MainContentProps) {
  const { user } = useCachedAuth()
  const { stats, loading: statsLoading } = useStats()

  const getApiParams = () => {
    switch (selectedCategory) {
      case "featured":
        return { filter: 'featured' as const, search: searchQuery }
      case "recent":
        return { filter: 'recent' as const, search: searchQuery }
      case "recommended":
        return { filter: 'recommended' as const, search: searchQuery }
      case "home":
        return { search: searchQuery }
      default:
        return { category: selectedCategory, search: searchQuery }
    }
  }

  const { modules, loading, error } = useModules(getApiParams())
  const { modules: featuredModules, loading: featuredLoading } = useModules({ filter: 'featured' })
  const { modules: recentModules, loading: recentLoading } = useModules({ filter: 'recent' })
  const { modules: recommendedModules, loading: recommendedLoading } = useModules({ filter: 'recommended' })

  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case "home":
        return "Discover Modules"
      case "featured":
        return "Featured Modules"
      case "recent":
        return "Recently Updated"
      case "recommended":
        return "Recommended Modules"
      case "security":
        return "Security & Privacy"
      case "performance":
        return "Performance"
      case "ui":
        return "UI & Theming"
      case "system":
        return "System Tweaks"
      case "media":
        return "Media & Audio"
      case "development":
        return "Development"
      case "gaming":
        return "Gaming"
      default:
        return "Modules"
    }
  }

  if (loading) {
    if (selectedCategory === "home" && !searchQuery) {
      return <HomePageSkeleton />
    }
    return <CategoryPageSkeleton title={getCategoryTitle()} />
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-red-500">Error loading modules: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedCategory === "home" && !searchQuery) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-6 pr-0 sm:pr-6 space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome to Modules{user?.name ? `, ${user.name}` : ""}
            </h1>
          </div>

          <section className="pr-6 sm:pr-0">
            <div className="space-y-3 sm:space-y-4 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <ClockCard />
                <RandomStatCard stats={stats} loading={statsLoading} />
                <div className="col-span-2 md:col-span-1">
                  <TelegramCard />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Featured Modules</h2>
            {featuredLoading ? (
              <CarouselSkeleton />
            ) : (
              <ModulesCarousel modules={featuredModules} onModuleSelect={onModuleSelect} />
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recently Updated</h2>
            {recentLoading ? (
              <CarouselSkeleton />
            ) : (
              <ModulesCarousel modules={recentModules} onModuleSelect={onModuleSelect} />
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recommended</h2>
            {recommendedLoading ? (
              <CarouselSkeleton />
            ) : (
              <ModulesCarousel modules={recommendedModules} onModuleSelect={onModuleSelect} />
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{getCategoryTitle()}</h1>
          <p className="text-muted-foreground">
            {modules.length} module{modules.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} onClick={() => onModuleSelect(module)} />
          ))}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No modules found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
