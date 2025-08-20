"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { EditModuleForm } from "@/components/features/admin/modules/edit-module-form"
import { useModuleNavigation } from "@/lib/navigation"
import type { modules } from "@/db/schema"

interface EditModulePageClientProps {
  module: typeof modules.$inferSelect
}

export function EditModulePageClient({ module }: EditModulePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage={`Edit ${module.name}`}
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
              <h1 className="text-3xl font-bold">Edit Module</h1>
              <p className="text-muted-foreground">
                {module.name}
              </p>
            </div>
            <EditModuleForm module={module} />
          </div>
        </div>
      </SharedLayout>
    </AdminGuard>
  )
}