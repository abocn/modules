import useSWR from 'swr'
import { useCallback } from 'react'

interface JobStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
}

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

/**
 * Hook for fetching job statistics
 *
 * Provides real-time statistics about admin jobs including:
 * - Total job count
 * - Jobs by status (pending, running, completed, failed)
 *
 * @returns {Object} Job statistics interface
 * @returns {JobStats | undefined} returns.stats - Current job statistics
 * @returns {Error | undefined} returns.error - Any error that occurred
 * @returns {boolean} returns.isLoading - Loading state
 * @returns {Function} returns.refetch - Manual refresh function
 *
 * @example
 * const { stats, isLoading } = useJobStats()
 * console.log(`${stats?.running} jobs currently running`)
 */
export function useJobStats() {
  const { data, error, isLoading, mutate } = useSWR<{ stats: JobStats }>('/api/admin/jobs/stats')

  return {
    stats: data?.stats,
    error,
    isLoading,
    refetch: mutate
  }
}

/**
 * Hook for fetching and filtering jobs with auto-refresh
 *
 * Provides filtered job listings with dynamic refresh intervals:
 * - Faster refresh (2s) when active jobs exist
 * - No refresh when no active jobs
 * - Supports filtering by status and type
 *
 * @param statusFilter - Filter jobs by status ('all', 'pending', 'running', etc.)
 * @param typeFilter - Filter jobs by type ('all', 'scrape_releases', etc.)
 *
 * @returns {Object} Jobs list interface
 * @returns {Job[]} returns.jobs - Array of filtered jobs
 * @returns {Error | undefined} returns.error - Any error that occurred
 * @returns {boolean} returns.isLoading - Loading state
 * @returns {Function} returns.refetch - Manual refresh function
 *
 * @example
 * const { jobs, isLoading } = useJobs('running', 'scrape_releases')
 * console.log(`Found ${jobs.length} running scrape jobs`)
 */
export function useJobs(statusFilter: string = 'all', typeFilter: string = 'all') {
  const params = new URLSearchParams()
  if (statusFilter !== "all") params.append("status", statusFilter)
  if (typeFilter !== "all") params.append("type", typeFilter)

  const queryString = params.toString()
  const url = `/api/admin/jobs${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<{ jobs: Job[] }>(url, {
    refreshInterval: (data) => {
      const hasActiveJobs = data?.jobs?.some(job => 
        job.status === "running" || job.status === "pending"
      )
      return hasActiveJobs ? 2000 : 0
    }
  })

  return {
    jobs: data?.jobs || [],
    error,
    isLoading,
    refetch: mutate
  }
}

/**
 * Hook for job management actions
 *
 * Provides functions to manage job lifecycle:
 * - Start new jobs with specified types and parameters
 * - Cancel running jobs
 * - Retry failed jobs with same parameters
 *
 * @returns {Object} Job action functions
 * @returns {Function} returns.startJob - Function to start a new job
 * @returns {Function} returns.cancelJob - Function to cancel a running job
 * @returns {Function} returns.retryJob - Function to retry a failed job
 *
 * @example
 * const { startJob, cancelJob, retryJob } = useJobActions()
 *
 * // Start a new scrape job
 * await startJob('scrape_releases', 'Manual Sync', { scope: 'all' })
 *
 * // Cancel a running job
 * await cancelJob(123)
 *
 * // Retry a failed job
 * await retryJob(failedJobObject)
 */
export function useJobActions() {
  const startJob = useCallback(async (type: string, name: string, parameters?: Record<string, unknown>) => {
    const response = await fetch('/api/admin/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        name,
        parameters: parameters || {}
      })
    })

    if (!response.ok) {
      throw new Error('Failed to start job')
    }

    return response.json()
  }, [])

  const cancelJob = useCallback(async (jobId: number) => {
    const response = await fetch(`/api/admin/jobs/${jobId}/cancel`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to cancel job')
    }

    return response.json()
  }, [])

  const retryJob = useCallback(async (job: Job) => {
    const response = await fetch('/api/admin/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: job.type,
        name: job.name,
        parameters: job.parameters || {}
      })
    })

    if (!response.ok) {
      throw new Error('Failed to retry job')
    }

    return response.json()
  }, [])

  return {
    startJob,
    cancelJob,
    retryJob
  }
}