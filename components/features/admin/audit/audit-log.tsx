"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Users, AlertTriangle, TrendingUp, Star, FileCheck, RefreshCw, ChevronRight, GitBranch, GitPullRequest } from "lucide-react"

interface RecentAction {
  id: string
  action: string
  details: string
  targetType: string
  targetId: string
  createdAt: string
  adminName: string
}

const ITEMS_PER_PAGE = 20

export function AuditLog() {
  const [actions, setActions] = useState<RecentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchActions = async (page: number, reset: boolean = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/recent-actions?limit=${ITEMS_PER_PAGE}&offset=${(page - 1) * ITEMS_PER_PAGE}`)

      if (!response.ok) {
        throw new Error('Failed to fetch audit log')
      }

      const data = await response.json()
      const newActions = data.actions || []

      if (reset) {
        setActions(newActions)
      } else {
        setActions(prev => [...prev, ...newActions])
      }

      setHasMore(newActions.length === ITEMS_PER_PAGE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActions(1, true)
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return `${diffInDays}d ago`
    }
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getActivityIcon = (action: string) => {
    if (action.includes("GitHub Scrape") || action.includes("GitHub Config")) {
      if (action.includes("Failed")) {
        return <GitBranch className="w-4 h-4 text-red-500" />
      }
      return <GitBranch className="w-4 h-4 text-green-500" />
    }
    if (action.includes("Job")) {
      return <GitPullRequest className="w-4 h-4 text-blue-500" />
    }
    if (action.includes("Approved") || action.includes("approved")) {
      return <FileCheck className="w-4 h-4 text-green-500" />
    }
    if (action.includes("Rejected") || action.includes("rejected") || action.includes("declined")) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
    if (action.includes("Featured") || action.includes("featured")) {
      return <Star className="w-4 h-4 text-yellow-500" />
    }
    if (action.includes("User") || action.includes("user")) {
      return <Users className="w-4 h-4 text-purple-500" />
    }
    if (action.includes("Module") || action.includes("module")) {
      return <Package className="w-4 h-4 text-blue-500" />
    }
    if (action.includes("Warning") || action.includes("warning")) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
    return <Package className="w-4 h-4 text-gray-500" />
  }

  const getActionBadge = (action: string) => {
    if (action.includes("GitHub Scrape Successful")) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Scraped</Badge>
    }
    if (action.includes("GitHub Scrape Failed")) {
      return <Badge variant="destructive">Scrape Failed</Badge>
    }
    if (action.includes("GitHub Scrape Job") || action.includes("GitHub Config Sync")) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sync</Badge>
    }
    if (action.includes("Job Started")) {
      return <Badge variant="outline" className="border-blue-500 text-blue-700">Started</Badge>
    }
    if (action.includes("Approved") || action.includes("approved")) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
    }
    if (action.includes("Rejected") || action.includes("rejected") || action.includes("declined")) {
      return <Badge variant="destructive">Rejected</Badge>
    }
    if (action.includes("Featured") || action.includes("featured")) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Featured</Badge>
    }
    if (action.includes("Warning") || action.includes("warning")) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Warning</Badge>
    }
    return <Badge variant="outline">Action</Badge>
  }

  const handleRefresh = () => {
    setCurrentPage(1)
    setActions([])
    fetchActions(1, true)
  }

  const handleLoadMore = () => {
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    fetchActions(nextPage, false)
  }

  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  )

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Administrative Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                <p>{error}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && actions.length === 0 ? (
                      <LoadingSkeleton />
                    ) : actions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="w-8 h-8 opacity-50" />
                            <p>No administrative actions found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      actions.map((action, index) => (
                        <TableRow key={`${action.id}-${index}`} className="hover:bg-muted/50">
                          <TableCell>
                            {getActivityIcon(action.action)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {action.action}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {action.details}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getActionBadge(action.action)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {action.adminName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div title={formatFullDate(action.createdAt)}>
                              {formatTimeAgo(action.createdAt)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {actions.length > 0 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {actions.length} action{actions.length !== 1 ? 's' : ''}
                    </div>
                    {hasMore && (
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}