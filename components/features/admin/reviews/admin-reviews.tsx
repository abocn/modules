"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Filters, FilterField, FilterValues } from "@/components/features/admin/filters"
import { MessageSquare, Star, Trash2, TrendingUp, Heart } from "lucide-react"
import { toast } from "sonner"

interface Review {
  id: number
  rating: number
  comment: string | null
  helpful: number
  createdAt: Date
  updatedAt: Date
  userId: string
  moduleId: string
  userName: string | null
  moduleName: string | null
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    helpfulReviews: 0,
    recentReviews: 0
  })
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    query: "",
    rating: "all",
    dateFrom: undefined,
    dateTo: undefined,
    minHelpful: 0,
    module: "all"
  })

  const fetchReviews = useCallback(async (filters?: FilterValues) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      const currentFilters = filters || advancedFilters

      if (currentFilters.query) params.append('query', currentFilters.query as string)
      if (currentFilters.rating !== 'all') params.append('rating', currentFilters.rating as string)
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom as string)
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo as string)
      if (currentFilters.minHelpful && typeof currentFilters.minHelpful === 'number' && currentFilters.minHelpful > 0) {
        params.append('minHelpful', currentFilters.minHelpful.toString())
      }
      if (currentFilters.module !== 'all') params.append('module', currentFilters.module as string)

      const response = await fetch(`/api/admin/reviews?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch reviews')
      const data = await response.json()
      setReviews(data.reviews)
      setStats(data.stats)
    } catch (error) {
      console.error('[!] Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }, [advancedFilters])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchReviews()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [fetchReviews])

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search Reviews',
      placeholder: 'Search by author, module, or comment...'
    },
    {
      type: 'select',
      key: 'rating',
      label: 'Rating',
      options: [
        { value: '5', label: '5 Stars' },
        { value: '4', label: '4 Stars' },
        { value: '3', label: '3 Stars' },
        { value: '2', label: '2 Stars' },
        { value: '1', label: '1 Star' }
      ]
    },
    {
      type: 'date',
      key: 'dateFrom',
      label: 'Date From'
    },
    {
      type: 'date',
      key: 'dateTo',
      label: 'Date To'
    },
    {
      type: 'number',
      key: 'minHelpful',
      label: 'Minimum Helpful Votes',
      placeholder: '0',
      min: 0
    }
  ]

  const resetAdvancedFilters = () => {
    const resetFilters = {
      query: "",
      rating: "all",
      dateFrom: undefined,
      dateTo: undefined,
      minHelpful: 0,
      module: "all"
    }
    setAdvancedFilters(resetFilters)
  }

  const handleDeleteReview = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete review')

      toast.success("Review deleted successfully")
      fetchReviews()
    } catch (error) {
      console.error('[!] Error deleting review:', error)
      toast.error("Failed to delete review")
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Module User Reviews</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Reviews</CardTitle>
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.total}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">All live reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Avg Rating</CardTitle>
              <Star className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {loading ? '...' : stats.averageRating.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Out of 5 stars</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Helpful</CardTitle>
              <Heart className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.helpfulReviews}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">5+ helpful votes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Recent</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.recentReviews}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Filters
            fields={filterFields}
            values={advancedFilters}
            onChange={setAdvancedFilters}
            onReset={resetAdvancedFilters}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Helpful</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading reviews...
                    </TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-muted text-xs">
                              {(review.userName || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{review.userName || 'Unknown User'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{review.moduleName || 'Unknown Module'}</span>
                      </TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm line-clamp-2">{review.comment || 'No comment'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>👍 {review.helpful}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteReview(review.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
