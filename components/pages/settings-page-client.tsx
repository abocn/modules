"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { UserSettings } from "@/components/features/settings/user-settings"
import { useModuleNavigation, getCurrentCategory } from "@/lib/navigation"
import { usePathname } from "next/navigation"

export function SettingsPageClient() {
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
      currentPage="Settings"
      selectedCategory={currentCategory}
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>
          <UserSettings />
        </div>
      </div>
    </SharedLayout>
  )
}