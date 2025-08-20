"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { UserProfile } from "@/components/features/profile/user-profile"
import { useModuleNavigation, getCurrentCategory } from "@/lib/navigation"
import { usePathname } from "next/navigation"

export function ProfilePageClient() {
  const pathname = usePathname()
  const currentCategory = getCurrentCategory(pathname)
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect: navHandleCategorySelect } = useModuleNavigation()

  const handleCategorySelect = (category: string) => {
    if (category !== currentCategory) {
      navHandleCategorySelect(category)
    }
  }

  return (
    <SharedLayout
      currentPage="Profile"
      selectedCategory={currentCategory}
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and manage your profile information.
            </p>
          </div>
          <UserProfile />
        </div>
      </div>
    </SharedLayout>
  )
}