"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  MessageSquare,
  CalendarDays,
  Package,
  Info,
  Search
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Turnstile, TurnstileRef } from "@/components/shared/turnstile"
import { EditSubmissionDialog } from "@/components/features/submissions/edit-submission-dialog"
import { Filters, FilterField } from "@/components/features/admin/filters"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import type { SubmissionAdvancedFilters } from "@/types/admin"

interface Submission {
  id: string
  name: string
  shortDescription: string
  description: string
  author: string
  category: string
  icon?: string
  isPublished: boolean
  status: "pending" | "approved" | "declined"
  createdAt: string
  updatedAt: string
  warnings: {
    type: "malware" | "closed-source" | "stolen-code"
    message: string
  }[]
  reviewNotes: {
    type: "approved" | "rejected" | "changes-requested"
    message: string
    reviewedBy?: string
    reviewedAt?: string
  }[]
  compatibility: {
    androidVersions: string[]
    rootMethods: ("Magisk" | "KernelSU" | "KernelSU-Next")[]
  }
  features: string[]
  isOpenSource: boolean
  sourceUrl?: string
  communityUrl?: string
  images?: string[]
  license: string
}

interface MySubmissionsProps {
  userId?: string
}

export function MySubmissions({ userId }: MySubmissionsProps) {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null)
  const [resubmittingSubmission, setResubmittingSubmission] = useState<Submission | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [resubmitError, setResubmitError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileRef>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<SubmissionAdvancedFilters>({
    query: "",
    category: "all",
    status: "all",
    reviewStatus: "all",
    isOpenSource: "all",
    hasWarnings: "all",
    submittedDateRange: {},
    updatedDateRange: {},
    hasReviewNotes: "all"
  })

  useEffect(() => {
    if (userId) {
      fetchSubmissions()
    } else {
      setLoading(false)
    }
  }, [userId])

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/modules/my-submissions")
      if (!response.ok) {
        throw new Error("Failed to fetch submissions")
      }
      const data = await response.json()
      setSubmissions(data.submissions)
    } catch (err) {
      console.error("Error fetching submissions:", err)
      setError(err instanceof Error ? err.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (submission: Submission) => {
    setEditingSubmission(submission)
  }

  const handleSaveEdit = async (updatedData: Partial<Submission>) => {
    try {
      const response = await fetch(`/api/modules/update/${editingSubmission?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        throw new Error("Failed to update module")
      }

      await fetchSubmissions()
      setEditingSubmission(null)
    } catch (err) {
      console.error("Error updating submission:", err)
      setError(err instanceof Error ? err.message : "Failed to update submission")
    }
  }

  const handleResubmitForReview = async (submission: Submission) => {
    if (!turnstileToken) {
      setResubmitError("Please complete the captcha verification")
      return
    }

    setIsResubmitting(true)
    setResubmitError(null)

    try {
      const response = await fetch(`/api/modules/update/${submission.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "pending",
          turnstileToken
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to resubmit module for review")
      }

      setShowSuccessMessage(true)
      setTurnstileToken(null)
      turnstileRef.current?.reset()

      setTimeout(() => {
        setShowSuccessMessage(false)
        setResubmittingSubmission(null)
      }, 2000)

      await fetchSubmissions()
    } catch (err) {
      console.error("Error resubmitting for review:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to resubmit for review"
      setResubmitError(errorMessage)
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } finally {
      setIsResubmitting(false)
    }
  }

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search Submissions',
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
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'declined', label: 'Rejected' },
        { value: 'rereviewing', label: 'Re-reviewing' },
        { value: 'changes-requested', label: 'Changes Requested' }
      ]
    },
    {
      type: 'select',
      key: 'reviewStatus',
      label: 'Review Status',
      options: [
        { value: 'accepted', label: 'Accepted' },
        { value: 'reviewing', label: 'Reviewing' },
        { value: 'rereviewing', label: 'Rereviewing' },
        { value: 'denied', label: 'Denied' },
        { value: 'changes-requested', label: 'Changes Requested' }
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
      type: 'select',
      key: 'hasWarnings',
      label: 'Warnings',
      options: [
        { value: 'true', label: 'Has Warnings' },
        { value: 'false', label: 'No Warnings' }
      ]
    },
    {
      type: 'select',
      key: 'hasReviewNotes',
      label: 'Review Notes',
      options: [
        { value: 'true', label: 'Has Review Notes' },
        { value: 'false', label: 'No Review Notes' }
      ]
    },
    {
      type: 'daterange',
      key: 'submittedDateRange',
      label: 'Submitted Date Range'
    },
    {
      type: 'daterange',
      key: 'updatedDateRange',
      label: 'Last Updated Range'
    }
  ]

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      query: "",
      category: "all",
      status: "all",
      reviewStatus: "all",
      isOpenSource: "all",
      hasWarnings: "all",
      submittedDateRange: {},
      updatedDateRange: {},
      hasReviewNotes: "all"
    })
    setSearchQuery("")
  }

  // Apply filters to submissions
  const filteredSubmissions = submissions.filter((submission) => {
    // Text search
    if (advancedFilters.query && typeof advancedFilters.query === 'string' && advancedFilters.query.trim()) {
      const query = advancedFilters.query.toLowerCase()
      if (!(
        submission.name.toLowerCase().includes(query) ||
        submission.author.toLowerCase().includes(query) ||
        submission.description.toLowerCase().includes(query) ||
        submission.shortDescription.toLowerCase().includes(query)
      )) {
        return false
      }
    }

    // Category filter
    if (advancedFilters.category && typeof advancedFilters.category === 'string' && advancedFilters.category !== 'all') {
      if (submission.category !== advancedFilters.category) {
        return false
      }
    }

    // Status filter
    if (advancedFilters.status && typeof advancedFilters.status === 'string' && advancedFilters.status !== 'all') {
      const rejectedNote = submission.reviewNotes?.find(n => n.type === "rejected")
      const changesNote = submission.reviewNotes?.find(n => n.type === "changes-requested")
      const hasBeenRejectedOrChanges = rejectedNote || changesNote
      
      if (advancedFilters.status === 'approved' && !(submission.status === "approved" || submission.isPublished)) {
        return false
      }
      if (advancedFilters.status === 'pending' && !(submission.status === "pending" && !hasBeenRejectedOrChanges)) {
        return false
      }
      if (advancedFilters.status === 'declined' && !(submission.status === "declined" || rejectedNote)) {
        return false
      }
      if (advancedFilters.status === 'rereviewing' && !(submission.status === "pending" && hasBeenRejectedOrChanges)) {
        return false
      }
      if (advancedFilters.status === 'changes-requested' && !changesNote) {
        return false
      }
    }

    // Review Status filter
    if (advancedFilters.reviewStatus && typeof advancedFilters.reviewStatus === 'string' && advancedFilters.reviewStatus !== 'all') {
      const rejectedNote = submission.reviewNotes?.find(n => n.type === "rejected")
      const changesNote = submission.reviewNotes?.find(n => n.type === "changes-requested")
      const hasBeenRejectedOrChanges = rejectedNote || changesNote

      if (advancedFilters.reviewStatus === 'accepted' && !(submission.status === "approved" || submission.isPublished)) {
        return false
      }
      if (advancedFilters.reviewStatus === 'reviewing' && !(submission.status === "pending" && !hasBeenRejectedOrChanges)) {
        return false
      }
      if (advancedFilters.reviewStatus === 'rereviewing' && !(submission.status === "pending" && hasBeenRejectedOrChanges)) {
        return false
      }
      if (advancedFilters.reviewStatus === 'denied' && !(submission.status === "declined" || rejectedNote)) {
        return false
      }
      if (advancedFilters.reviewStatus === 'changes-requested' && !changesNote) {
        return false
      }
    }

    // Open source filter
    if (advancedFilters.isOpenSource && typeof advancedFilters.isOpenSource === 'string' && advancedFilters.isOpenSource !== 'all') {
      if (advancedFilters.isOpenSource === 'true' && !submission.isOpenSource) {
        return false
      }
      if (advancedFilters.isOpenSource === 'false' && submission.isOpenSource) {
        return false
      }
    }

    // Warnings filter
    if (advancedFilters.hasWarnings && typeof advancedFilters.hasWarnings === 'string' && advancedFilters.hasWarnings !== 'all') {
      const hasWarnings = submission.warnings && submission.warnings.length > 0
      if (advancedFilters.hasWarnings === 'true' && !hasWarnings) {
        return false
      }
      if (advancedFilters.hasWarnings === 'false' && hasWarnings) {
        return false
      }
    }

    // Review notes filter
    if (advancedFilters.hasReviewNotes && typeof advancedFilters.hasReviewNotes === 'string' && advancedFilters.hasReviewNotes !== 'all') {
      const hasReviewNotes = submission.reviewNotes && submission.reviewNotes.length > 0
      if (advancedFilters.hasReviewNotes === 'true' && !hasReviewNotes) {
        return false
      }
      if (advancedFilters.hasReviewNotes === 'false' && hasReviewNotes) {
        return false
      }
    }

    // Date range filters
    const submittedDateRange = advancedFilters.submittedDateRange as { from?: string; to?: string } | undefined
    if (submittedDateRange?.from || submittedDateRange?.to) {
      const submittedDate = new Date(submission.createdAt)
      if (submittedDateRange.from) {
        const fromDate = new Date(submittedDateRange.from)
        if (submittedDate < fromDate) {
          return false
        }
      }
      if (submittedDateRange.to) {
        const toDate = new Date(submittedDateRange.to)
        if (submittedDate > toDate) {
          return false
        }
      }
    }

    const updatedDateRange = advancedFilters.updatedDateRange as { from?: string; to?: string } | undefined
    if (updatedDateRange?.from || updatedDateRange?.to) {
      const updatedDate = new Date(submission.updatedAt)
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
  })

  const getStatusBadge = (submission: Submission) => {
    const rejectedNote = submission.reviewNotes?.find(n => n.type === "rejected")
    const changesNote = submission.reviewNotes?.find(n => n.type === "changes-requested")
    const hasBeenRejectedOrChanges = rejectedNote || changesNote

    if (submission.status === "approved" || submission.isPublished) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle />
          Approved
        </Badge>
      )
    } else if (submission.status === "pending" && hasBeenRejectedOrChanges) {
      return (
        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          <Clock />
          Rereviewing
        </Badge>
      )
    } else if (submission.status === "declined" || rejectedNote) {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle />
          Rejected
        </Badge>
      )
    } else if (changesNote) {
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
          Pending Review
        </Badge>
      )
    }
  }

  if (!userId) {
    router.push("/")
    return null
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Submissions
            </CardTitle>
            <CardDescription>Loading your submitted modules...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Submissions</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage and track your submitted modules</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Your modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {submissions.filter(s => s.status === "approved" || s.isPublished).length}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">Published modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {submissions.filter(s => s.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Attention</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {submissions.filter(s =>
                s.status === "declined" ||
                s.reviewNotes?.some(n => n.type === "rejected" || n.type === "changes-requested")
              ).length}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">Requires action</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search submissions..."
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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Submissions</CardTitle>
              <CardDescription>
                {filteredSubmissions.length === submissions.length 
                  ? `Showing all ${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`
                  : `Showing ${filteredSubmissions.length} of ${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t submitted any modules yet.
              </p>
              <Button onClick={() => router.push("/submit")}>
                Submit Your First Module
              </Button>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions match your filters</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or clearing the filters.
              </p>
              <Button onClick={resetAdvancedFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {submission.icon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={submission.icon}
                            alt={submission.name}
                            className="w-16 h-16 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg mb-1">{submission.name}</CardTitle>
                          <CardDescription className="mb-2">
                            {submission.shortDescription}
                          </CardDescription>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(submission)}
                            <Badge variant="outline">{MODULE_CATEGORIES.find(cat => cat.id === submission.category)?.shortLabel || submission.category}</Badge>
                            {submission.isOpenSource && (
                              <Badge variant="outline" className="text-green-600">
                                Open Source
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span>Submitted {new Date(submission.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(submission.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {(submission.reviewNotes?.some(n => n.type === "rejected" || n.type === "changes-requested")) && (
                      <Alert className="mb-4">
                        <MessageSquare className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Review Notes:</strong>
                          {submission.reviewNotes?.filter(n => n.type === "rejected" || n.type === "changes-requested").map((note, index) => (
                            <p key={index} className="mt-1 whitespace-pre-wrap">{note.message}</p>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Separator className="my-4" />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(submission)}
                        disabled={submission.isPublished}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      {(submission.status === "declined" || (submission.status !== "pending" && submission.reviewNotes?.some(n => n.type === "rejected" || n.type === "changes-requested"))) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResubmittingSubmission(submission)}
                        >
                          <Package className="h-4 w-4" />
                          Resubmit for Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="mt-4 max-h-[60vh]">
            {selectedSubmission && (
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="text-sm text-muted-foreground [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {selectedSubmission.description}
                    </ReactMarkdown>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Author</h4>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.author}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Category</h4>
                    <p className="text-sm text-muted-foreground">{MODULE_CATEGORIES.find(cat => cat.id === selectedSubmission.category)?.shortLabel || selectedSubmission.category}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">License</h4>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.license}</p>
                  </div>
                  {selectedSubmission.sourceUrl && (
                    <div>
                      <h4 className="font-semibold mb-2">Source</h4>
                      <a
                        href={selectedSubmission.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedSubmission.sourceUrl}
                      </a>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.features.map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Android Versions</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmission.compatibility.androidVersions.map((version, index) => (
                        <Badge key={index} variant="outline">
                          {version}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Root Methods</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmission.compatibility.rootMethods.map((method, index) => (
                        <Badge key={index} variant="outline">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedSubmission.images && selectedSubmission.images.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Screenshots</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSubmission.images.map((image, index) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={index}
                            src={image}
                            alt={`Screenshot ${index + 1}`}
                            className="rounded-lg border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {editingSubmission && (
        <EditSubmissionDialog
          submission={editingSubmission}
          open={!!editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSave={handleSaveEdit}
        />
      )}

      <Dialog open={!!resubmittingSubmission} onOpenChange={() => setResubmittingSubmission(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resubmit for Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to resubmit &quot;{resubmittingSubmission?.name}&quot; for review?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Please confirm that you have:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Made all requested modifications from the review notes</li>
                <li>• Updated the module description if needed</li>
                <li>• Addressed any security concerns mentioned</li>
                <li>• Verified all provided links and information</li>
              </ul>
            </div>
            {resubmittingSubmission?.reviewNotes?.some(n => n.type === "rejected" || n.type === "changes-requested") && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Previous Review Notes:</h4>
                {resubmittingSubmission.reviewNotes?.filter(n => n.type === "rejected" || n.type === "changes-requested").map((note, index) => (
                  <p key={index} className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap mb-2">
                    {note.message}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Security Verification</label>
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    setTurnstileToken(token)
                    setResubmitError(null)
                  }}
                  onError={(error) => {
                    console.error("Turnstile error:", error)
                    setTurnstileToken(null)
                    setResubmitError("Captcha verification failed. Please try again.")
                  }}
                  onExpire={() => {
                    setTurnstileToken(null)
                    setResubmitError("Captcha has expired. Please verify again.")
                  }}
                  theme="auto"
                  size="normal"
                />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Captcha verification is not configured. Please contact the administrator.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {resubmitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{resubmitError}</AlertDescription>
              </Alert>
            )}
          </div>
          {showSuccessMessage ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="text-green-600 font-medium">Module resubmitted successfully!</span>
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setResubmittingSubmission(null)
                setTurnstileToken(null)
                setResubmitError(null)
                turnstileRef.current?.reset()
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => resubmittingSubmission && handleResubmitForReview(resubmittingSubmission)}
                disabled={!turnstileToken || isResubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isResubmitting ? "Resubmitting..." : "Confirm Resubmission"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}