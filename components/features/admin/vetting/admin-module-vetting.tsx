"use client"

import { useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAdminModules, useAdminModulesList } from "@/hooks/use-admin"
import { Search, Eye, Check, X, Clock, AlertTriangle, Package, ExternalLink, GitBranch, Users, Shield, Calendar, Star, FileCode, User } from "lucide-react"
import { Filters, FilterField, FilterValues } from "@/components/features/admin/filters"
import type { AdminModule } from "@/types/module"

type ReviewAction = 'approve' | 'reject'
type WarningType = "malware" | "closed-source" | "stolen-code"

export function AdminModuleSubmissions() {
  const { modules, isLoading: loading, error, refetch } = useAdminModulesList(undefined, 100, 0)
  const { updateModuleStatus, updateModuleWarnings, error: adminError, isLoading: adminLoading } = useAdminModules()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModule, setSelectedModule] = useState<AdminModule | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState("overview")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    query: "",
    category: "all",
    hasWarnings: "all",
    isOpenSource: "all",
    submittedDateFrom: undefined,
    submittedDateTo: undefined
  })

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search Modules',
      placeholder: 'Search by name or author...'
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
      type: 'date',
      key: 'submittedDateFrom',
      label: 'Submitted From'
    },
    {
      type: 'date',
      key: 'submittedDateTo',
      label: 'Submitted To'
    }
  ]

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      query: "",
      category: "all",
      hasWarnings: "all",
      isOpenSource: "all",
      submittedDateFrom: undefined,
      submittedDateTo: undefined
    })
    setSearchQuery("")
  }, [])

  const pendingModules = modules?.filter(module => module.status === 'pending') || []

  const filteredModules = pendingModules.filter((module) => {
    const matchesSearch =
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = advancedFilters.category === "all" || module.category === advancedFilters.category
    const hasAnyWarnings = module.warnings.length > 0 || !module.isOpenSource || !module.sourceUrl
    const matchesWarnings = advancedFilters.hasWarnings === "all" ||
      (advancedFilters.hasWarnings === "true" ? hasAnyWarnings : !hasAnyWarnings)
    const matchesOpenSource = advancedFilters.isOpenSource === "all" ||
      (advancedFilters.isOpenSource === "true" ? module.isOpenSource : !module.isOpenSource)
    const moduleDate = new Date(module.createdAt)
    const matchesDateFrom = !advancedFilters.submittedDateFrom || 
      (typeof advancedFilters.submittedDateFrom === 'string' && moduleDate >= new Date(advancedFilters.submittedDateFrom))
    const matchesDateTo = !advancedFilters.submittedDateTo || 
      (typeof advancedFilters.submittedDateTo === 'string' && moduleDate <= new Date(advancedFilters.submittedDateTo))

    return matchesSearch && matchesCategory && matchesWarnings && matchesOpenSource && matchesDateFrom && matchesDateTo
  })

  const handleReviewAction = useCallback(async (action: ReviewAction, moduleId: string) => {
    if (!selectedModule) return

    if (action === 'reject' && !reviewNotes.trim()) {
      alert("Please provide rejection notes explaining why the module was rejected.")
      return
    }

    setIsSubmitting(true)

    try {
      const isPublished = action === 'approve'
      const success = await updateModuleStatus(moduleId, isPublished, reviewNotes.trim() || undefined)

      if (success) {
        setIsReviewDialogOpen(false)
        setReviewNotes("")
        setSelectedModule(null)
        await refetch?.()
      } else {
        alert(adminError || `Failed to ${action} module. Please try again.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `An error occurred while ${action === 'approve' ? 'approving' : 'rejecting'} the module.`
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedModule, reviewNotes, updateModuleStatus, refetch, adminError])

  const handleApproveModule = useCallback((moduleId: string) => {
    handleReviewAction('approve', moduleId)
  }, [handleReviewAction])

  const handleRejectModule = useCallback((moduleId: string) => {
    handleReviewAction('reject', moduleId)
  }, [handleReviewAction])

  const openReviewDialog = useCallback((module: AdminModule) => {
    setSelectedModule(module)
    setIsReviewDialogOpen(true)
    setReviewNotes("")
    setCurrentTab("overview")
  }, [])

  const addSecurityWarning = useCallback(async (type: WarningType, message: string) => {
    if (!selectedModule || !message.trim()) return

    const newWarning = { type, message: message.trim() }
    const updatedWarnings = [...selectedModule.warnings, newWarning]

    try {
      const success = await updateModuleWarnings(selectedModule.id, updatedWarnings)
      if (success) {
        setSelectedModule({
          ...selectedModule,
          warnings: updatedWarnings
        })
        await refetch?.()
      } else {
        alert(adminError || "Could not add security warning. Please try again.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred while adding the warning."
      alert(message)
    }
  }, [selectedModule, updateModuleWarnings, refetch, adminError])

  const removeSecurityWarning = useCallback(async (index: number) => {
    if (!selectedModule || index < 0 || index >= selectedModule.warnings.length) return

    const updatedWarnings = selectedModule.warnings.filter((_, i) => i !== index)

    try {
      const success = await updateModuleWarnings(selectedModule.id, updatedWarnings)
      if (success) {
        setSelectedModule({
          ...selectedModule,
          warnings: updatedWarnings
        })
        await refetch?.()
      } else {
        alert(adminError || "Could not remove security warning. Please try again.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred while removing the warning."
      alert(message)
    }
  }, [selectedModule, updateModuleWarnings, refetch, adminError])

  const moduleStats = {
    pending: pendingModules.length,
    withWarnings: pendingModules.filter((m) =>
      m.warnings.length > 0 || !m.isOpenSource || !m.sourceUrl
    ).length,
    openSource: pendingModules.filter((m) => m.isOpenSource).length,
    featured: pendingModules.filter((m) => m.isFeatured).length,
  }

  if (loading) {
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

        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Module Submissions</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Review</CardTitle>
              <Clock className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.pending}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">With Warnings</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.withWarnings}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Open Source</CardTitle>
              <Package className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.openSource}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Verified source</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Featured</CardTitle>
              <Package className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{moduleStats.featured}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Potential features</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search pending modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="space-y-4">
          {filteredModules.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending modules</h3>
                  <p className="text-muted-foreground">All modules have been reviewed</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredModules.map((module) => {
              const hasSecurityIssues = module.warnings.length > 0 || !module.isOpenSource || !module.sourceUrl
              return (
              <Card key={module.id} className={hasSecurityIssues ? '' : 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'}>
                <CardContent className="p-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    {module.icon && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={module.icon}
                          alt={module.name}
                          className="w-12 h-12 rounded-lg border flex-shrink-0 object-cover"
                        />
                      </>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold break-words">{module.name}</h3>
                        <Badge variant="outline">Pending</Badge>
                        {(module.warnings.length > 0 || !module.isOpenSource || !module.sourceUrl) && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {module.warnings.length > 0 ? `${module.warnings.length} Warning${module.warnings.length > 1 ? 's' : ''}` : 'Needs Review'}
                          </Badge>
                        )}
                        {module.isOpenSource && (
                          <Badge className="bg-green-500 text-white">Open Source</Badge>
                        )}
                        {module.isFeatured && (
                          <Badge className="bg-yellow-500 text-white">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground mb-2">by {module.author}</p>
                      <p className="text-sm mb-3 line-clamp-2 sm:line-clamp-none">{module.shortDescription}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {module.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {module.license}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(module.createdAt).toLocaleDateString()}
                        </span>
                        {module.submittedByUsername && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {module.submittedByUsername}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog(module)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </div>

        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                {selectedModule?.icon && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedModule.icon}
                      alt={selectedModule.name}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover"
                    />
                  </>
                )}
                Review Module: {selectedModule?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedModule && (
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex flex-col flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 mb-3 sm:mb-4">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="details" className="text-xs sm:text-sm sm:inline-flex hidden">Details</TabsTrigger>
                  <TabsTrigger value="media" className="text-xs sm:text-sm sm:inline-flex hidden">Media</TabsTrigger>
                  <TabsTrigger value="security" className="text-xs sm:text-sm">Security</TabsTrigger>
                  <TabsTrigger value="review" className="text-xs sm:text-sm">Review</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Module Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Name</span>
                            <span className="text-sm font-medium">{selectedModule.name}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Author</span>
                            <span className="text-sm font-medium">{selectedModule.author}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Category</span>
                            <Badge variant="secondary">{selectedModule.category}</Badge>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">License</span>
                            <span className="text-sm font-medium">{selectedModule.license}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Open Source</span>
                            {selectedModule.isOpenSource ? (
                              <Badge className="bg-green-500">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Compatibility
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Android Versions</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedModule.compatibility.androidVersions.map((version: string) => (
                                <Badge key={version} variant="outline" className="text-xs">
                                  {version}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Root Methods</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedModule.compatibility.rootMethods.map((method: string) => (
                                <Badge key={method} className="text-xs">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{selectedModule.shortDescription}</p>
                        <div className="prose prose-sm max-w-none dark:prose-invert max-h-48 overflow-y-auto">
                          <ReactMarkdown>{selectedModule.description.length > 500 ? selectedModule.description.substring(0, 500) + '...' : selectedModule.description}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Features</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedModule.features.map((feature: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              <Star className="w-3 h-3 mr-1" />
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4 sm:space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Submission Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Submitted By</span>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {selectedModule.submittedByUsername || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Submitted At</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedModule.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last Updated</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedModule.lastUpdated).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          External Links
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedModule.sourceUrl && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <GitBranch className="w-4 h-4" />
                              Source Code
                            </span>
                            <a
                              href={selectedModule.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Repository
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {selectedModule.communityUrl && (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Community
                              </span>
                              <a
                                href={selectedModule.communityUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Visit Community
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Module Flags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          {selectedModule.isFeatured && (
                            <Badge className="bg-yellow-500">Featured Candidate</Badge>
                          )}
                          {selectedModule.isRecommended && (
                            <Badge className="bg-blue-500">Recommended</Badge>
                          )}
                          {!selectedModule.isPublished && (
                            <Badge variant="secondary">Unpublished</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="media" className="space-y-4 sm:space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Module Icon</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedModule.icon ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedModule.icon}
                              alt={selectedModule.name}
                              className="w-16 h-16 rounded-lg border object-cover"
                            />
                            <div className="text-sm text-muted-foreground">
                              <p>64x64 icon</p>
                              <a
                                href={selectedModule.icon}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View full size
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No icon provided</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Screenshots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedModule.images && selectedModule.images.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedModule.images.map((image: string, index: number) => (
                              <div key={index} className="relative aspect-video">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={image}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg border"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No screenshots provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-4 sm:space-y-6">
                    <Card className={selectedModule.warnings.length > 0 ? "border-red-200" : "border-green-200"}>
                      <CardHeader>
                        <CardTitle className={`text-base flex items-center gap-2 ${selectedModule.warnings.length > 0 ? "text-red-600" : "text-green-600"}`}>
                          {selectedModule.warnings.length > 0 ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Security Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedModule.warnings.length > 0 ? (
                          selectedModule.warnings.map((warning, index: number) => (
                            <div key={index} className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-red-800 dark:text-red-300 mb-1 text-sm sm:text-base">
                                      {warning.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                    <p className="text-red-700 dark:text-red-400 text-xs sm:text-sm break-words">
                                      {warning.message}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs w-full sm:w-auto"
                                  onClick={() => removeSecurityWarning(index)}
                                  disabled={adminLoading}
                                >
                                  Remove from Issues
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-green-700 dark:text-green-400 text-sm">
                              No security issues detected for this module.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {selectedModule.reviewNotes && selectedModule.reviewNotes.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileCode className="w-4 h-4" />
                            Review History
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedModule.reviewNotes.map((note, index: number) => (
                            <div key={index} className={`border rounded-lg p-4 ${
                              note.type === 'approved' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                              note.type === 'rejected' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                              'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                            }`}>
                              <div className="flex items-start gap-3">
                                {note.type === 'approved' ? (
                                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                                ) : note.type === 'rejected' ? (
                                  <X className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className={`font-medium mb-1 ${
                                    note.type === 'approved' ? 'text-green-800 dark:text-green-300' :
                                    note.type === 'rejected' ? 'text-red-800 dark:text-red-300' :
                                    'text-yellow-800 dark:text-yellow-300'
                                  }`}>
                                    {note.type === 'approved' ? 'Approved' : note.type === 'rejected' ? 'Rejected' : 'Changes Requested'}
                                    {note.reviewedBy && ` by ${note.reviewedBy}`}
                                    {note.reviewedAt && ` on ${new Date(note.reviewedAt).toLocaleDateString()}`}
                                  </p>
                                  <p className={`text-sm ${
                                    note.type === 'approved' ? 'text-green-700 dark:text-green-400' :
                                    note.type === 'rejected' ? 'text-red-700 dark:text-red-400' :
                                    'text-yellow-700 dark:text-yellow-400'
                                  }`}>
                                    {note.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Best Practices Checklist</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {selectedModule.isOpenSource ? (
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                              )}
                              <span className="text-sm">Open source code available for review</span>
                            </div>
                            {!selectedModule.isOpenSource && !selectedModule.warnings.some(w => w.type === "closed-source" && w.message.includes("not open source")) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs ml-8 sm:ml-0"
                                onClick={() => addSecurityWarning("closed-source", "Module is not open source - source code needs to be made available for security review.")}
                                disabled={adminLoading}
                              >
                                Add to Issues
                              </Button>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {selectedModule.sourceUrl ? (
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                              )}
                              <span className="text-sm">Source repository provided</span>
                            </div>
                            {!selectedModule.sourceUrl && !selectedModule.warnings.some(w => w.type === "closed-source" && w.message.includes("No source repository URL")) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs ml-8 sm:ml-0"
                                onClick={() => addSecurityWarning("closed-source", "No source repository URL provided - please provide a link to the source code.")}
                                disabled={adminLoading}
                              >
                                Add to Issues
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </TabsContent>

                  <TabsContent value="review" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Decision</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Review Notes</label>
                          <Textarea
                            placeholder="Add your review notes here. For rejections, please provide clear feedback for the developer..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </div>

                        <div className="bg-muted rounded-lg p-3 sm:p-4">
                          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewNotes(reviewNotes + "\n\nModule approved for publication.")}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              Add Approval Note
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewNotes(reviewNotes + "\n\nPlease provide source code for security review.")}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              Request Source
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewNotes(reviewNotes + "\n\nModule description needs more detail.")}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              Need More Info
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setIsReviewDialogOpen(false)}
                            className="w-full sm:w-auto order-2 sm:order-1"
                          >
                            Cancel
                          </Button>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleRejectModule(selectedModule.id)}
                              disabled={!reviewNotes.trim() || isSubmitting || adminLoading}
                              className="w-full sm:w-auto"
                            >
                              {isSubmitting ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              {isSubmitting ? 'Rejecting...' : 'Reject Module'}
                            </Button>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                              onClick={() => handleApproveModule(selectedModule.id)}
                              disabled={isSubmitting || adminLoading}
                            >
                              {isSubmitting ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              {isSubmitting ? 'Approving...' : 'Approve & Publish'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}