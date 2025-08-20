"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Turnstile, TurnstileRef } from "@/components/shared/turnstile"
import { Star, MessageSquare, Info, ChevronDown, ChevronUp, CheckCircle, PenTool, Eye, MessageSquareOff, Loader2, TriangleAlert } from "lucide-react"
import { Module, Reply } from "@/types/module"
import { useModuleRatings } from "@/hooks/use-modules"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-client"
import { SigninDialog } from "@/components/shared/signin-dialog"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import ReactMarkdown from "react-markdown"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ReviewSectionProps {
  module: Module
}

export function ReviewSection({ module }: ReviewSectionProps) {
  const [newReview, setNewReview] = useState({ rating: 0, comment: "" })
  const [hoverRating, setHoverRating] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [helpfulLoading, setHelpfulLoading] = useState<Record<number, boolean>>({})
  const [replyHelpfulLoading, setReplyHelpfulLoading] = useState<Record<number, boolean>>({})
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({})
  const [replies, setReplies] = useState<Record<number, Reply[]>>({})
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({})
  const [showReplyForm, setShowReplyForm] = useState<Record<number, boolean>>({})
  const [replyText, setReplyText] = useState<Record<number, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<Record<number, boolean>>({})
  const [replyTurnstileToken, setReplyTurnstileToken] = useState<Record<number, string | null>>({})
  const [replySubmitError, setReplySubmitError] = useState<Record<number, string | null>>({})
  const [userHelpfulVotes, setUserHelpfulVotes] = useState<{ratings: Set<number>, replies: Set<number>}>({
    ratings: new Set(),
    replies: new Set()
  })
  const [showSigninDialog, setShowSigninDialog] = useState(false)
  const turnstileRef = useRef<TurnstileRef>(null)
  const replyTurnstileRefs = useRef<Record<number, TurnstileRef | null>>({})

  const { ratings, userRating, loading, error, submitRating, refreshRatings } = useModuleRatings(module.id)
  const { data: session } = useSession()

  useEffect(() => {
    if (ratings.length > 0) {
      ratings.forEach(rating => {
        if (!replies[rating.id] && !loadingReplies[rating.id]) {
          setShowReplies(prev => ({ ...prev, [rating.id]: true }))
          loadReplies(rating.id)
        }
      })
    }
  }, [ratings, replies, loadingReplies])

  useEffect(() => {
    const loadHelpfulVotes = async () => {
      try {
        const response = await fetch(`/api/modules/${module.id}/helpful-votes`)
        if (response.ok) {
          const votes = await response.json()
          setUserHelpfulVotes({
            ratings: new Set(votes.ratings),
            replies: new Set(votes.replies)
          })
        }
      } catch (error) {
        console.error('Error loading helpful votes:', error)
      }
    }

    loadHelpfulVotes()
  }, [module.id])

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      toast.error("Please write a review comment")
      return
    }

    if (newReview.rating === 0) {
      toast.error("Please select a rating")
      return
    }

    if (!turnstileToken) {
      setSubmitError("Please complete the captcha verification")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await submitRating(newReview.rating, newReview.comment, turnstileToken)
      setNewReview({ rating: 0, comment: "" })
      setTurnstileToken(null)
      turnstileRef.current?.reset()
      setShowReviewForm(false)
      toast.success("Review submitted successfully!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review'
      setSubmitError(errorMessage)
      toast.error(errorMessage)
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHelpfulClick = async (ratingId: number) => {
    if (!session?.user) {
      setShowSigninDialog(true)
      return
    }

    if (userHelpfulVotes.ratings.has(ratingId)) {
      toast.error('You have already marked this review as helpful')
      return
    }

    setHelpfulLoading(prev => ({ ...prev, [ratingId]: true }))

    try {
      const response = await fetch(`/api/ratings/${ratingId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as helpful')
      }

      toast.success('Marked as helpful!')
      setUserHelpfulVotes(prev => ({
        ...prev,
        ratings: new Set([...prev.ratings, ratingId])
      }))
      refreshRatings()
    } catch (error) {
      console.error('Error marking as helpful:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark as helpful')
    } finally {
      setHelpfulLoading(prev => ({ ...prev, [ratingId]: false }))
    }
  }

  const handleReplyHelpfulClick = async (replyId: number) => {
    if (!session?.user) {
      setShowSigninDialog(true)
      return
    }

    if (userHelpfulVotes.replies.has(replyId)) {
      toast.error('You have already marked this reply as helpful')
      return
    }

    setReplyHelpfulLoading(prev => ({ ...prev, [replyId]: true }))

    try {
      const response = await fetch(`/api/replies/${replyId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as helpful')
      }

      toast.success('Marked as helpful!')
      setUserHelpfulVotes(prev => ({
        ...prev,
        replies: new Set([...prev.replies, replyId])
      }))
      Object.keys(replies).forEach(ratingId => {
        const ratingIdNum = parseInt(ratingId, 10)
        if (replies[ratingIdNum]?.some(r => r.id === replyId)) {
          loadReplies(ratingIdNum)
        }
      })
    } catch (error) {
      console.error('Error marking reply as helpful:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark as helpful')
    } finally {
      setReplyHelpfulLoading(prev => ({ ...prev, [replyId]: false }))
    }
  }

  const loadReplies = async (ratingId: number) => {
    setLoadingReplies(prev => ({ ...prev, [ratingId]: true }))

    try {
      const response = await fetch(`/api/ratings/${ratingId}/replies`)
      if (!response.ok) {
        throw new Error('Failed to load replies')
      }

      const data = await response.json()
      setReplies(prev => ({ ...prev, [ratingId]: data.replies }))
    } catch (error) {
      console.error('Error loading replies:', error)
      toast.error('Failed to load replies')
    } finally {
      setLoadingReplies(prev => ({ ...prev, [ratingId]: false }))
    }
  }

  const handleToggleReplies = async (ratingId: number) => {
    const isCurrentlyShown = showReplies[ratingId]
    setShowReplies(prev => ({ ...prev, [ratingId]: !isCurrentlyShown }))

    if (!isCurrentlyShown && !replies[ratingId]) {
      await loadReplies(ratingId)
    }
  }

  const handleSubmitReply = async (ratingId: number) => {
    if (!session?.user) {
      setShowSigninDialog(true)
      return
    }

    const text = replyText[ratingId]?.trim()
    const token = replyTurnstileToken[ratingId]

    if (!text) {
      toast.error("Please write a reply")
      return
    }

    if (!token) {
      setReplySubmitError(prev => ({ ...prev, [ratingId]: "Please complete the captcha verification" }))
      return
    }

    setReplySubmitting(prev => ({ ...prev, [ratingId]: true }))
    setReplySubmitError(prev => ({ ...prev, [ratingId]: null }))

    try {
      const response = await fetch(`/api/ratings/${ratingId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: text,
          turnstileToken: token,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit reply')
      }

      toast.success('Reply submitted successfully!')
      setReplyText(prev => ({ ...prev, [ratingId]: '' }))
      setReplyTurnstileToken(prev => ({ ...prev, [ratingId]: null }))
      setShowReplyForm(prev => ({ ...prev, [ratingId]: false }))
      replyTurnstileRefs.current[ratingId]?.reset()

      await loadReplies(ratingId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit reply'
      setReplySubmitError(prev => ({ ...prev, [ratingId]: errorMessage }))
      toast.error(errorMessage)
      setReplyTurnstileToken(prev => ({ ...prev, [ratingId]: null }))
      replyTurnstileRefs.current[ratingId]?.reset()
    } finally {
      setReplySubmitting(prev => ({ ...prev, [ratingId]: false }))
    }
  }

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6 sm:w-7 sm:h-7'
    }

    const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

    return (
      <div className="flex gap-0.5 sm:gap-1 items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= displayRating;
          const isHovered = interactive && star <= hoverRating;

          return (
            <Star
              key={star}
              className={`${sizeClasses[size]} transition-all duration-200 ${
                isActive
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
              } ${
                interactive
                  ? "cursor-pointer hover:scale-110 hover:fill-yellow-300 hover:text-yellow-300" 
                  : ""
              } ${
                isHovered ? "scale-110" : ""
              }`}
              onClick={() => interactive && onRatingChange?.(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
            />
          )
        })}
        {interactive && (displayRating > 0 || hoverRating > 0) && (
          <span className="ml-2 text-sm text-muted-foreground font-medium">
            {hoverRating > 0 ? hoverRating : rating} star{(hoverRating > 0 ? hoverRating : rating) !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full gap-0">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="w-5 h-5" />
            <span>Reviews</span>
            <span className="text-muted-foreground font-normal">({loading ? '...' : ratings.length})</span>
          </CardTitle>
          {!userRating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!session?.user) {
                  setShowSigninDialog(true)
                } else {
                  setShowReviewForm(!showReviewForm)
                }
              }}
              className="w-full sm:w-auto"
            >
              Write Review
            </Button>
          )}
        </div>
        {userRating && (
          <Alert className="mt-4 bg-primary/5 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              You&apos;ve already reviewed this module with a rating of {userRating.rating} stars.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {showReviewForm && !userRating && (
          <Card className="border-muted bg-muted/5">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Write a Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 -mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Rating</label>
                {renderStars(newReview.rating, true, (rating) => setNewReview((prev) => ({ ...prev, rating })), 'lg')}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Your Review
                </label>
                <Tabs defaultValue="write" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="write" className="flex items-center gap-2">
                      <PenTool className="w-3 h-3" />
                      Write
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-3 h-3" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="write" className="mt-2">
                    <MarkdownEditor
                      value={newReview.comment}
                      onChange={(value) => setNewReview((prev) => ({ ...prev, comment: value || "" }))}
                      placeholder="Share your experience with this module... You can use Markdown formatting!"
                      height={200}
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-2">
                    <div className="min-h-[200px] p-3 border rounded-md bg-background">
                      {newReview.comment ? (
                        <div className="text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                          <ReactMarkdown>{newReview.comment}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic text-sm">Nothing to preview yet...</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {newReview.comment.length}/1000 characters
                </div>
              </div>

              <div className="space-y-2">
                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                  <div className="w-full overflow-x-auto">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => {
                        setTurnstileToken(token)
                        setSubmitError(null)
                      }}
                      onError={(error) => {
                        console.warn("Turnstile error:", error)
                        setTurnstileToken(null)
                        if (error?.message?.includes("600010")) {
                          setSubmitError("Captcha loading issue. Please refresh the page and try again.")
                        } else {
                          setSubmitError("Captcha verification failed. Please try again.")
                        }
                      }}
                      onExpire={() => {
                        setTurnstileToken(null)
                        setSubmitError("Captcha has expired. Please verify again.")
                      }}
                      theme="auto"
                      size="normal"
                    />
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Captcha verification is not configured properly.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    {submitError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={!newReview.comment.trim() || newReview.rating === 0 || isSubmitting || !turnstileToken}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false)
                    setNewReview({ rating: 0, comment: "" })
                    setSubmitError(null)
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col text-center py-8 items-center justify-center">
              <Loader2 size={32} className="text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col text-center py-8 space-y-6 items-center justify-center">
              <TriangleAlert size={32} className="text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : ratings.length === 0 ? (
            <div className="flex flex-col text-center py-8 space-y-6 items-center justify-center">
              <MessageSquareOff size={32} className="text-muted-foreground" />
              <p className="text-muted-foreground">No reviews yet. Be the first to review this module!</p>
            </div>
          ) : (
            ratings.map((rating) => (
              <div key={rating.id} className="border-b border-border pb-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                    {rating.userImage && <AvatarImage src={rating.userImage} alt={rating.userName || 'User'} />}
                    <AvatarFallback className="bg-muted text-xs">
                      {rating.userId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                      <span className="font-medium text-sm sm:text-base truncate">
                        {rating.userName || `User ${rating.userId.substring(0, 8)}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {renderStars(rating.rating, false, undefined, 'sm')}
                        <span className="text-xs text-muted-foreground">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {rating.comment && (
                      <div className="text-sm sm:text-base text-muted-foreground mb-3 break-words [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                        <ReactMarkdown>{rating.comment}</ReactMarkdown>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <button
                        onClick={() => handleHelpfulClick(rating.id)}
                        disabled={helpfulLoading[rating.id] || userHelpfulVotes.ratings.has(rating.id)}
                        className={`px-2 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          userHelpfulVotes.ratings.has(rating.id)
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {helpfulLoading[rating.id] ? '...' : '👍'} Helpful ({rating.helpful})
                      </button>
                      <button
                        onClick={() => {
                          if (!session?.user) {
                            setShowSigninDialog(true)
                          } else {
                            setShowReplyForm(prev => ({ ...prev, [rating.id]: !prev[rating.id] }))
                          }
                        }}
                        className="px-2 py-1 rounded-md hover:bg-muted transition-colors"
                      >
                        Reply
                      </button>
                      {(replies[rating.id]?.length > 0 || loadingReplies[rating.id]) && (
                        <button
                          onClick={() => handleToggleReplies(rating.id)}
                          className="px-2 py-1 rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                        >
                          {replies[rating.id]?.length > 0 && (
                            <span>{replies[rating.id].length} {replies[rating.id].length === 1 ? 'reply' : 'replies'}</span>
                          )}
                          {showReplies[rating.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {showReplyForm[rating.id] && (
                      <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-muted">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <PenTool className="w-3 h-3" />
                              Reply to Review
                            </label>
                            <Tabs defaultValue="write" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="write" className="flex items-center gap-2 text-xs">
                                  <PenTool className="w-3 h-3" />
                                  Write
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="flex items-center gap-2 text-xs">
                                  <Eye className="w-3 h-3" />
                                  Preview
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="write" className="mt-2">
                                <MarkdownEditor
                                  value={replyText[rating.id] || ''}
                                  onChange={(value) => setReplyText(prev => ({ ...prev, [rating.id]: value || '' }))}
                                  placeholder="Write a helpful reply... Markdown formatting supported!"
                                  height={120}
                                />
                              </TabsContent>
                              <TabsContent value="preview" className="mt-2">
                                <div className="min-h-[120px] p-3 border rounded-md bg-background">
                                  {replyText[rating.id] ? (
                                    <div className="text-sm [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-2 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                                      <ReactMarkdown>{replyText[rating.id]}</ReactMarkdown>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground italic text-sm">Nothing to preview yet...</p>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {(replyText[rating.id] || '').length}/500 characters
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Security Verification</label>
                            <div className="w-full overflow-x-auto">
                              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                                <Turnstile
                                  ref={(ref) => { replyTurnstileRefs.current[rating.id] = ref }}
                                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                  onSuccess={(token) => {
                                    setReplyTurnstileToken(prev => ({ ...prev, [rating.id]: token }))
                                    setReplySubmitError(prev => ({ ...prev, [rating.id]: null }))
                                  }}
                                  onError={(error) => {
                                    console.warn("Reply Turnstile error:", error)
                                    setReplyTurnstileToken(prev => ({ ...prev, [rating.id]: null }))
                                    if (error?.message?.includes("600010")) {
                                      setReplySubmitError(prev => ({ ...prev, [rating.id]: "Captcha loading issue. Please refresh and try again." }))
                                    } else {
                                      setReplySubmitError(prev => ({ ...prev, [rating.id]: "Captcha verification failed." }))
                                    }
                                  }}
                                  onExpire={() => {
                                    setReplyTurnstileToken(prev => ({ ...prev, [rating.id]: null }))
                                    setReplySubmitError(prev => ({ ...prev, [rating.id]: "Captcha expired." }))
                                  }}
                                  theme="auto"
                                  size="normal"
                                />
                              ) : (
                                <Alert>
                                  <Info className="h-4 w-4" />
                                  <AlertDescription className="text-sm">
                                    Captcha verification is not configured.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </div>

                          {replySubmitError[rating.id] && (
                            <Alert variant="destructive">
                              <AlertDescription className="text-sm">
                                {replySubmitError[rating.id]}
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(rating.id)}
                              disabled={!replyText[rating.id]?.trim() || replySubmitting[rating.id] || !replyTurnstileToken[rating.id]}
                              className="w-full sm:w-auto"
                            >
                              {replySubmitting[rating.id] ? 'Submitting...' : 'Submit Reply'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowReplyForm(prev => ({ ...prev, [rating.id]: false }))
                                setReplyText(prev => ({ ...prev, [rating.id]: '' }))
                                setReplySubmitError(prev => ({ ...prev, [rating.id]: null }))
                              }}
                              className="w-full sm:w-auto"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {showReplies[rating.id] && (
                      <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-muted space-y-3">
                        {loadingReplies[rating.id] ? (
                          <div className="text-xs text-muted-foreground">Loading replies...</div>
                        ) : replies[rating.id]?.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No replies yet.</div>
                        ) : (
                          replies[rating.id]?.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <Avatar className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0">
                                {reply.userImage && <AvatarImage src={reply.userImage} alt={reply.userName || 'User'} />}
                                <AvatarFallback className="bg-muted text-xs">
                                  {reply.userId.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                  <span className="font-medium text-xs sm:text-sm truncate">
                                    {reply.userName || `User ${reply.userId.substring(0, 8)}`}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(reply.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground mb-2 break-words [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:ml-3 [&_ul]:mb-1 [&_ol]:list-decimal [&_ol]:ml-3 [&_ol]:mb-1 [&_li]:mb-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-2 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                                  <ReactMarkdown>{reply.comment}</ReactMarkdown>
                                </div>
                                <button
                                  onClick={() => handleReplyHelpfulClick(reply.id)}
                                  disabled={replyHelpfulLoading[reply.id] || userHelpfulVotes.replies.has(reply.id)}
                                  className={`px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs ${
                                    userHelpfulVotes.replies.has(reply.id)
                                      ? 'bg-primary/10 text-primary'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  {replyHelpfulLoading[reply.id] ? '...' : '👍'} Helpful ({reply.helpful})
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <SigninDialog
        open={showSigninDialog}
        onOpenChange={setShowSigninDialog}
      />
    </Card>
  )
}