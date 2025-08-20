"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { CreateModuleForm } from "@/components/features/admin/modules/create-module-form"
import { useModuleNavigation } from "@/lib/navigation"

export function CreateModulePageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Create New Module"
        selectedCategory="admin-modules"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showBackButton={true}
        onBack={() => window.history.back()}
      >
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 min-h-full">
            <div>
              <h1 className="text-3xl font-bold">Create New Module</h1>
              <p className="text-muted-foreground">Add a new module to the repository</p>
            </div>
            <CreateModuleForm />
          </div>
        </div>
      </SharedLayout>
    </AdminGuard>
  )
}