"use client"

import { useState, useEffect } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MySubmissions } from "@/components/features/submissions/my-submissions"
import { useModuleNavigation } from "@/lib/navigation"
import { useSession } from "@/lib/auth-client"

export function MySubmissionsPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isHydrated, setIsHydrated] = useState(false)
  const { handleCategorySelect } = useModuleNavigation()
  const { data: session } = useSession()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return (
      <SharedLayout
        currentPage="My Submissions"
        selectedCategory="my-submissions"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-8 animate-pulse">
          <div>
            <div className="h-8 sm:h-9 bg-muted rounded w-48 mb-2" />
            <div className="h-4 sm:h-5 bg-muted rounded w-96" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-3 sm:h-4 bg-muted rounded w-12" />
                  <div className="w-4 h-4 bg-muted rounded" />
                </div>
                <div className="h-6 sm:h-8 bg-muted rounded w-8 mb-1 mt-8" />
                <div className="h-3 bg-muted rounded w-20 hidden sm:block" />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <div className="h-10 bg-muted rounded" />
            </div>
            <div className="h-10 bg-muted rounded w-24" />
          </div>

          <div className="bg-card border rounded-lg">
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-5 bg-muted rounded w-32 mb-2" />
                  <div className="h-4 bg-muted rounded w-48" />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card border rounded-lg overflow-hidden">
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-muted rounded-lg" />
                          <div>
                            <div className="h-5 bg-muted rounded w-48 mb-2" />
                            <div className="h-4 bg-muted rounded w-64 mb-3" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="h-6 bg-muted rounded w-20" />
                              <div className="h-6 bg-muted rounded w-16" />
                              <div className="h-6 bg-muted rounded w-24" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-20" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-20" />
                        </div>
                      </div>

                      <div className="border-t my-4" />

                      <div className="flex items-center gap-2">
                        <div className="h-8 bg-muted rounded w-24" />
                        <div className="h-8 bg-muted rounded w-16" />
                        <div className="h-8 bg-muted rounded w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SharedLayout>
    )
  }

  return (
    <SharedLayout
      currentPage="My Submissions"
      selectedCategory="my-submissions"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MySubmissions
        userId={session?.user?.id}
      />
    </SharedLayout>
  )
}