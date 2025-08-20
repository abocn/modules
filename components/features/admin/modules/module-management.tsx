"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Eye, Star, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { Module } from "@/types/module"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"

interface ModuleManagementProps {
  modules?: Module[]
  onDeleteModule?: (id: string) => void
  onToggleFeatured?: (id: string) => void
  onTogglePublished?: (id: string) => void
  onModuleUpdated?: () => void
  filteredModules?: Module[]
}

export function ModuleManagement({
  modules = [],
  onDeleteModule,
  onToggleFeatured,
  onTogglePublished,
  filteredModules,
}: ModuleManagementProps) {
  const router = useRouter()
  const [localModules, setLocalModules] = useState(modules)
  const [searchQuery, setSearchQuery] = useState("")

  const getReviewStatusBadge = (module: Module) => {
    interface ExtendedModule extends Module {
      reviewNotes?: Array<{
        type: "approved" | "rejected" | "changes-requested"
        message: string
        reviewedBy?: string
        reviewedAt?: string
      }>
    }

    const extendedModule = module as ExtendedModule
    const reviewNotes = extendedModule.reviewNotes
    const hasReviewNotes = reviewNotes && Array.isArray(reviewNotes)
    const rejectedNote = hasReviewNotes ? reviewNotes.find(n => n.type === "rejected") : null
    const changesNote = hasReviewNotes ? reviewNotes.find(n => n.type === "changes-requested") : null
    const hasBeenRejectedOrChanges = rejectedNote || changesNote

    if (module.status === "approved" || module.isPublished) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle />
          Accepted
        </Badge>
      )
    } else if (module.status === "pending" && hasBeenRejectedOrChanges) {
      return (
        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          <Clock />
          Rereviewing
        </Badge>
      )
    } else if (module.status === "declined" || rejectedNote) {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle />
          Denied
        </Badge>
      )
    } else if (changesNote && module.status !== "pending") {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <AlertTriangle />
          Changes Requested
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Clock />
          Reviewing
        </Badge>
      )
    }
  }

  const displayModules =
    filteredModules ||
    localModules.filter(
      (module) =>
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.author.toLowerCase().includes(searchQuery.toLowerCase()),
    )

  const handleDeleteModule = (id: string) => {
    const moduleToDelete = displayModules.find(m => m.id === id)
    if (onDeleteModule) {
      onDeleteModule(id)
      toast.success(`Module "${moduleToDelete?.name}" deleted successfully`)
    } else {
      setLocalModules(localModules.filter((m) => m.id !== id))
      toast.success(`Module "${moduleToDelete?.name}" deleted successfully`)
    }
  }

  const handleToggleFeatured = (id: string) => {
    const moduleToToggle = displayModules.find(m => m.id === id)
    const newFeaturedStatus = !moduleToToggle?.isFeatured

    if (onToggleFeatured) {
      onToggleFeatured(id)
    } else {
      setLocalModules(localModules.map((m) => (m.id === id ? { ...m, isFeatured: !m.isFeatured } : m)))
    }

    toast.success(
      `Module "${moduleToToggle?.name}" ${newFeaturedStatus ? 'added to' : 'removed from'} featured modules`
    )
  }

  const handleTogglePublished = (id: string) => {
    const moduleToToggle = displayModules.find(m => m.id === id)
    const newPublishedStatus = !moduleToToggle?.isPublished

    if (onTogglePublished) {
      onTogglePublished(id)
    } else {
      setLocalModules(localModules.map((m) =>
        m.id === id
          ? {
              ...m,
              isPublished: newPublishedStatus,
              status: newPublishedStatus ? "approved" : "pending"
            }
          : m
      ))
    }

    toast.success(
      `Module "${moduleToToggle?.name}" ${newPublishedStatus ? 'published' : 'unpublished'} successfully`
    )
  }

  return (
    <div className="space-y-4">
      {!filteredModules && (
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Modules ({displayModules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                        {module.icon ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={module.icon}
                            alt={`${module.name} icon`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center text-xs text-white ${module.icon ? 'hidden' : ''}`}>
                          {module.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{module.name}</div>
                        <div className="text-sm text-muted-foreground">v{module.version}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{module.author}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {MODULE_CATEGORIES.find(cat => cat.id === module.category)?.shortLabel || module.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{module.downloads.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{module.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getReviewStatusBadge(module)}
                      {module.isFeatured && <Badge variant="secondary">Featured</Badge>}
                      {module.warnings.length > 0 && <Badge variant="destructive">Warning</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublished(module.id)}
                      >
                        <Eye className={`w-4 h-4 ${module.isPublished ? "text-green-600" : "text-gray-400"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/modules/${module.id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleFeatured(module.id)}>
                        <Star className={`w-4 h-4 ${module.isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteModule(module.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}

