"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ModuleManagement } from "@/components/features/admin/modules/module-management"
import { Filters, FilterField, FilterValues } from "@/components/features/admin/filters"
import { useAdminModules, useAdminModulesList } from "@/hooks/use-admin"
import { Plus, Search, Star, AlertTriangle, Package, Clock } from "lucide-react"

export function AdminModules() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const { modules, isLoading, error, refetch } = useAdminModulesList(searchQuery)
  const { deleteModule, updateFeaturedStatus, updateModuleStatus, error: adminError } = useAdminModules()
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    query: "",
    category: "all",
    status: "all",
    featured: "all",
    recommended: "all",
    hasWarnings: "all",
    isOpenSource: "all",
    createdDateRange: {},
    updatedDateRange: {},
    minDownloads: 0,
    minRating: 0
  })

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search Modules',
      placeholder: 'Search by name, description, author...'
    },
    {
      type: 'select',
      key: 'category',
      label: 'Category',
      options: [
        { value: 'security', label: 'Security' },
        { value: 'performance', label: 'Performance' },
        { value: 'ui', label: 'UI/UX' },
        { value: 'system', label: 'System' },
        { value: 'media', label: 'Media' },
        { value: 'development', label: 'Development' },
        { value: 'gaming', label: 'Gaming' }
      ]
    },
    {
      type: 'select',
      key: 'status',
      label: 'Publication Status',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'pending', label: 'Pending Approval' },
        { value: 'declined', label: 'Declined/Rejected' }
      ]
    },
    {
      type: 'select',
      key: 'featured',
      label: 'Featured Status',
      options: [
        { value: 'true', label: 'Featured' },
        { value: 'false', label: 'Not Featured' }
      ]
    },
    {
      type: 'select',
      key: 'recommended',
      label: 'Recommended Status',
      options: [
        { value: 'true', label: 'Recommended' },
        { value: 'false', label: 'Not Recommended' }
      ]
    },
    {
      type: 'select',
      key: 'hasWarnings',
      label: 'Security Warnings',
      options: [
        { value: 'true', label: 'Has Warnings' },
        { value: 'false', label: 'No Warnings' }
      ]
    },
    {
      type: 'select',
      key: 'isOpenSource',
      label: 'Open Source',
      options: [
        { value: 'true', label: 'Open Source' },
        { value: 'false', label: 'Closed Source' }
      ]
    },
    {
      type: 'daterange',
      key: 'createdDateRange',
      label: 'Created Date Range'
    },
    {
      type: 'daterange',
      key: 'updatedDateRange',
      label: 'Last Updated Range'
    },
    {
      type: 'slider',
      key: 'minDownloads',
      label: 'Minimum Downloads',
      min: 0,
      max: 10000,
      step: 100
    },
    {
      type: 'slider',
      key: 'minRating',
      label: 'Minimum Rating',
      min: 0,
      max: 5,
      step: 0.1
    }
  ]

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      query: "",
      category: "all",
      status: "all",
      featured: "all",
      recommended: "all",
      hasWarnings: "all",
      isOpenSource: "all",
      createdDateRange: {},
      updatedDateRange: {},
      minDownloads: 0,
      minRating: 0
    })
    setSearchQuery("")
  }

  const filteredModules = modules?.filter((module) => {
    // Text search
    if (advancedFilters.query && typeof advancedFilters.query === 'string' && advancedFilters.query.trim()) {
      const query = advancedFilters.query.toLowerCase()
      if (!(
        module.name.toLowerCase().includes(query) ||
        module.author.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query) ||
        module.submittedByUsername?.toLowerCase().includes(query)
      )) {
        return false
      }
    }

    // Category filter
    if (advancedFilters.category && typeof advancedFilters.category === 'string' && advancedFilters.category !== 'all') {
      if (module.category !== advancedFilters.category) {
        return false
      }
    }

    // Status filter
    if (advancedFilters.status && typeof advancedFilters.status === 'string' && advancedFilters.status !== 'all') {
      if (advancedFilters.status === 'published' && !module.isPublished) {
        return false
      }
      if (advancedFilters.status === 'pending' && (module.isPublished || module.hasRejectionAction)) {
        return false
      }
      if (advancedFilters.status === 'declined' && (!module.hasRejectionAction || module.isPublished)) {
        return false
      }
    }

    // Featured filter
    if (advancedFilters.featured && typeof advancedFilters.featured === 'string' && advancedFilters.featured !== 'all') {
      if (advancedFilters.featured === 'true' && !module.isFeatured) {
        return false
      }
      if (advancedFilters.featured === 'false' && module.isFeatured) {
        return false
      }
    }

    // Recommended filter
    if (advancedFilters.recommended && typeof advancedFilters.recommended === 'string' && advancedFilters.recommended !== 'all') {
      if (advancedFilters.recommended === 'true' && !module.isRecommended) {
        return false
      }
      if (advancedFilters.recommended === 'false' && module.isRecommended) {
        return false
      }
    }

    // Warnings filter
    if (advancedFilters.hasWarnings && typeof advancedFilters.hasWarnings === 'string' && advancedFilters.hasWarnings !== 'all') {
      const hasWarnings = module.warnings && module.warnings.length > 0
      if (advancedFilters.hasWarnings === 'true' && !hasWarnings) {
        return false
      }
      if (advancedFilters.hasWarnings === 'false' && hasWarnings) {
        return false
      }
    }

    // Open source filter
    if (advancedFilters.isOpenSource && typeof advancedFilters.isOpenSource === 'string' && advancedFilters.isOpenSource !== 'all') {
      if (advancedFilters.isOpenSource === 'true' && !module.isOpenSource) {
        return false
      }
      if (advancedFilters.isOpenSource === 'false' && module.isOpenSource) {
        return false
      }
    }

    // Minimum downloads filter
    if (advancedFilters.minDownloads && typeof advancedFilters.minDownloads === 'number' && advancedFilters.minDownloads > 0) {
      if (module.downloads < advancedFilters.minDownloads) {
        return false
      }
    }

    // Minimum rating filter
    if (advancedFilters.minRating && typeof advancedFilters.minRating === 'number' && advancedFilters.minRating > 0) {
      if (module.rating < advancedFilters.minRating) {
        return false
      }
    }

    // Date range filters
    const createdDateRange = advancedFilters.createdDateRange as { from?: string; to?: string } | undefined
    if (createdDateRange?.from || createdDateRange?.to) {
      const createdDate = new Date(module.createdAt)
      if (createdDateRange.from) {
        const fromDate = new Date(createdDateRange.from)
        if (createdDate < fromDate) {
          return false
        }
      }
      if (createdDateRange.to) {
        const toDate = new Date(createdDateRange.to)
        if (createdDate > toDate) {
          return false
        }
      }
    }

    // Updated date range filters
    const updatedDateRange = advancedFilters.updatedDateRange as { from?: string; to?: string } | undefined
    if (updatedDateRange?.from || updatedDateRange?.to) {
      const updatedDate = new Date(module.lastUpdated)
      if (updatedDateRange.from) {
        const fromDate = new Date(updatedDateRange.from)
        if (updatedDate < fromDate) {
          return false
        }
      }
      if (updatedDateRange.to) {
        const toDate = new Date(updatedDateRange.to)
        if (updatedDate > toDate) {
          return false
        }
      }
    }

    return true
  }) || []

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return
    }

    const success = await deleteModule(id)
    if (success) {
      refetch?.()
    }
  }

  const handleToggleFeatured = async (id: string) => {
    const targetModule = modules?.find(m => m.id === id)
    if (!targetModule) return

    const success = await updateFeaturedStatus(id, !targetModule.isFeatured)
    if (success) {
      refetch?.()
    }
  }

  const handleTogglePublished = async (id: string) => {
    const targetModule = modules?.find(m => m.id === id)
    if (!targetModule) return

    const newPublishedStatus = !targetModule.isPublished
    const success = await updateModuleStatus(id, newPublishedStatus)
    if (success) {
      refetch?.()
    }
  }

  const moduleStats = {
    total: modules?.length || 0,
    featured: modules?.filter((m) => m.isFeatured).length || 0,
    withWarnings: modules?.filter((m) => m.warnings && m.warnings.length > 0).length || 0,
    pending: modules?.filter((m) => !m.isPublished && !m.hasRejectionAction).length || 0,
    declined: modules?.filter((m) => !m.isPublished && m.hasRejectionAction).length || 0,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading modules...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading modules: {error}</p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {adminError && (
          <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Admin operation failed: {adminError}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Module Management</h1>
          <Button onClick={() => router.push("/admin/modules/create")} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Add Module
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.total}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Active modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Featured</CardTitle>
              <Star className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.featured}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Featured modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.withWarnings}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
              <Clock className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.pending}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Declined</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.declined}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Rejected modules</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setAdvancedFilters(prev => ({ ...prev, query: e.target.value }))
              }}
              className="pl-10"
            />
          </div>
          <Filters
            fields={filterFields}
            values={advancedFilters}
            onChange={setAdvancedFilters}
            onReset={resetAdvancedFilters}
          />
        </div>

        <ModuleManagement
          modules={modules}
          onDeleteModule={handleDeleteModule}
          onToggleFeatured={handleToggleFeatured}
          onTogglePublished={handleTogglePublished}
          onModuleUpdated={refetch}
          filteredModules={filteredModules}
        />
      </div>
    </div>
  )
}
