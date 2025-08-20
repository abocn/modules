"use client"

import { useCallback, forwardRef, useImperativeHandle } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useJobs, useJobActions } from "@/hooks/use-jobs"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Eye,
  RotateCcw,
  X
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface Job {
  id: number
  type: string
  name: string
  description?: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  startedBy: string
  startedAt?: string
  completedAt?: string
  duration?: number
  parameters?: Record<string, unknown>
  results?: {
    success: boolean
    processedCount?: number
    errorCount?: number
    errors?: string[]
    summary?: string
  }
  logs?: {
    timestamp: string
    level: "info" | "warn" | "error"
    message: string
  }[]
}

interface JobHistoryProps {
  statusFilter: string
  typeFilter: string
  onJobUpdate: () => void
}

export interface JobHistoryRef {
  refetchJobs: () => void
}

export const JobHistory = forwardRef<JobHistoryRef, JobHistoryProps>(function JobHistory({ statusFilter, typeFilter, onJobUpdate }, ref) {

  const { jobs, isLoading: loading, refetch: refetchJobs } = useJobs(statusFilter, typeFilter)
  const { cancelJob: cancelJobAction, retryJob: retryJobAction } = useJobActions()

  useImperativeHandle(ref, () => ({
    refetchJobs
  }), [refetchJobs])

  const handleCancelJob = useCallback(async (jobId: number) => {
    try {
      await cancelJobAction(jobId)
      toast.success("The job has been cancelled successfully.")
      refetchJobs()
      onJobUpdate()
    } catch (error) {
      console.error('Error cancelling job:', error)
      toast.error("Failed to cancel job. Please try again.")
    }
  }, [cancelJobAction, refetchJobs, onJobUpdate])

  const handleRetryJob = useCallback(async (job: Job) => {
    try {
      await retryJobAction(job)
      toast.success("A new job has been created with the same parameters.")
      refetchJobs()
      onJobUpdate()
    } catch (error) {
      console.error('Error retrying job:', error)
      toast.error("Failed to retry job. Please try again.")
    }
  }, [retryJobAction, refetchJobs, onJobUpdate])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "running":
        return <Play className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
      pending: "secondary",
      running: "default",
      completed: "default",
      failed: "destructive",
      cancelled: "outline"
    }
    return (
      <Badge variant={variants[status] || "secondary"}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    )
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading jobs...</div>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started By</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{job.name}</div>
                      {job.description && (
                        <div className="text-sm text-muted-foreground">{job.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.status === "running" ? (
                      <div className="space-y-1">
                        <Progress value={job.progress} className="w-16" />
                        <span className="text-xs text-muted-foreground">{job.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{job.startedBy}</TableCell>
                  <TableCell>
                    {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : "-"}
                  </TableCell>
                  <TableCell>{formatDuration(job.duration)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{job.name}</DialogTitle>
                            <DialogDescription>
                              Job #{job.id} - {job.type}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh]">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Status</h4>
                                  {getStatusBadge(job.status)}
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Progress</h4>
                                  {job.status === "running" ? (
                                    <div className="space-y-1">
                                      <Progress value={job.progress} />
                                      <span className="text-sm text-muted-foreground">{job.progress}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </div>

                              {job.results && (
                                <div>
                                  <h4 className="font-medium mb-2">Results</h4>
                                  <div className="bg-muted p-3 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>Success: {job.results.success ? "Yes" : "No"}</div>
                                      <div>Processed: {job.results.processedCount || 0}</div>
                                      <div>Errors: {job.results.errorCount || 0}</div>
                                    </div>
                                    {job.results.summary && (
                                      <div className="mt-2">
                                        <div className="font-medium">Summary:</div>
                                        <div className="text-sm">{job.results.summary}</div>
                                      </div>
                                    )}
                                    {job.results.errors && job.results.errors.length > 0 && (
                                      <div className="mt-2">
                                        <div className="font-medium text-red-500">Errors:</div>
                                        <ul className="text-sm list-disc list-inside">
                                          {job.results.errors.map((error, index) => (
                                            <li key={index} className="text-red-500">{error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {job.logs && job.logs.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Logs</h4>
                                  <div className="bg-black text-green-400 p-3 rounded-lg font-mono text-sm max-h-60 overflow-auto">
                                    {job.logs.map((log, index) => (
                                      <div key={index} className="mb-1">
                                        <span className="text-gray-400">[{log.timestamp}]</span>
                                        <span className={`ml-2 ${
                                          log.level === "error" ? "text-red-400" :
                                          log.level === "warn" ? "text-yellow-400" :
                                          "text-green-400"
                                        }`}>
                                          {log.level.toUpperCase()}
                                        </span>
                                        <span className="ml-2">{log.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {job.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetryJob(job)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}

                      {(job.status === "pending" || job.status === "running") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelJob(job.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
})