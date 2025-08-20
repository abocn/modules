import useSWR from 'swr'
import { useCallback } from 'react'

interface ReleaseScheduleData {
  id: number
  enabled: boolean
  intervalHours: number
  batchSize: number
  nextRunAt: string
  lastRunAt?: string
}

interface SyncStats {
  totalModules: number
  enabledModules: number
  successfulSyncs: number
  failedSyncs: number
  lastRunTime?: string
  nextRunTime?: string
  averageSyncTime: number
  recentActivity: Array<{
    moduleId: string
    moduleName: string
    status: 'success' | 'error'
    timestamp: string
    error?: string
  }>
}

interface ModuleSync {
  id: number
  moduleId: string
  githubRepo: string
  enabled: boolean
  lastSyncAt?: string
  lastReleaseId?: string
  syncErrors: Array<{
    error: string
    timestamp: string
    retryCount: number
  }>
  module: {
    id: string
    name: string
    author: string
    status: string
  }
}

/**
 * Hook for fetching and managing the release schedule configuration
 *
 * Provides functionality to:
 * - Fetch current release schedule settings
 * - Update schedule configuration (enable/disable, intervals, batch size)
 * - Trigger manual sync runs
 * - Auto-refresh data every 30 seconds
 *
 * @returns {Object} Release schedule management interface
 * @returns {ReleaseScheduleData | undefined} returns.schedule - Current schedule configuration
 * @returns {Error | undefined} returns.error - Any error that occurred during fetch
 * @returns {boolean} returns.isLoading - Whether data is currently being fetched
 * @returns {Function} returns.updateSchedule - Function to update schedule settings
 * @returns {Function} returns.runManualSync - Function to trigger manual sync
 * @returns {Function} returns.refetch - Function to manually refresh data
 *
 * @example
 * const { schedule, isLoading, updateSchedule, runManualSync } = useReleaseSchedule()
 *
 * // Enable the schedule
 * await updateSchedule({ enabled: true })
 *
 * // Start manual sync
 * await runManualSync()
 */
export function useReleaseSchedule() {
  const { data, error, isLoading, mutate } = useSWR<ReleaseScheduleData>(
    '/api/admin/release-schedule',
    {
      refreshInterval: 30000
    }
  )

  const updateSchedule = useCallback(async (updates: Partial<ReleaseScheduleData>) => {
    const response = await fetch('/api/admin/release-schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update schedule')
    }

    const updatedSchedule = await response.json()
    mutate(updatedSchedule, false)
    return updatedSchedule
  }, [mutate])

  const runManualSync = useCallback(async () => {
    const response = await fetch('/api/admin/release-schedule/manual-run', {
      method: 'POST'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to start manual sync')
    }

    const result = await response.json()
    mutate()
    return result
  }, [mutate])

  return {
    schedule: data,
    error,
    isLoading,
    updateSchedule,
    runManualSync,
    refetch: mutate
  }
}

/**
 * Hook for fetching sync statistics with auto-refresh
 *
 * Monitors overall sync performance metrics including:
 * - Total and enabled module counts
 * - Success/failure statistics
 * - Recent activity logs
 * - Average sync times
 *
 * @returns {Object} Sync statistics interface
 * @returns {SyncStats | undefined} returns.stats - Current sync statistics
 * @returns {Error | undefined} returns.error - Any error that occurred
 * @returns {boolean} returns.isLoading - Loading state
 * @returns {Function} returns.refetch - Manual refresh function
 *
 * @example
 * const { stats, isLoading } = useSyncStats()
 * console.log(`Success rate: ${stats?.successfulSyncs}/${stats?.totalModules}`)
 */
export function useSyncStats() {
  const { data, error, isLoading, mutate } = useSWR<SyncStats>(
    '/api/admin/sync-stats',
    {
      refreshInterval: 30000
    }
  )

  return {
    stats: data,
    error,
    isLoading,
    refetch: mutate
  }
}

/**
 * Hook for managing module sync configurations
 *
 * Provides management of individual module GitHub sync settings:
 * - List all modules with sync configurations
 * - Enable/disable sync for specific modules
 * - Trigger manual sync for individual modules
 * - View sync history and error logs
 *
 * @returns {Object} Module sync management interface
 * @returns {ModuleSync[]} returns.modules - Array of module sync configurations
 * @returns {Error | undefined} returns.error - Any error that occurred
 * @returns {boolean} returns.isLoading - Loading state
 * @returns {Function} returns.toggleModuleSync - Function to enable/disable module sync
 * @returns {Function} returns.triggerModuleSync - Function to manually sync a module
 * @returns {Function} returns.refetch - Manual refresh function
 *
 * @example
 * const { modules, toggleModuleSync, triggerModuleSync } = useModuleSyncs()
 *
 * // Disable sync for a module
 * await toggleModuleSync('module-123', false)
 *
 * // Trigger manual sync
 * await triggerModuleSync('module-123')
 */
export function useModuleSyncs() {
  const { data, error, isLoading, mutate } = useSWR<ModuleSync[]>(
    '/api/admin/module-sync',
    {
      refreshInterval: 60000
    }
  )

  const toggleModuleSync = useCallback(async (moduleId: string, enabled: boolean) => {
    const response = await fetch(`/api/admin/module-sync/${moduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })

    if (!response.ok) {
      throw new Error('Failed to update module sync')
    }

    const updatedSync = await response.json()

    mutate(
      current => current?.map(m =>
        m.moduleId === moduleId
          ? { ...m, enabled }
          : m
      ),
      false
    )

    return updatedSync
  }, [mutate])

  const triggerModuleSync = useCallback(async (moduleId: string) => {
    const response = await fetch(`/api/admin/module-sync/${moduleId}/sync`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to trigger module sync')
    }

    const result = await response.json()
    mutate()
    return result
  }, [mutate])

  return {
    modules: data || [],
    error,
    isLoading,
    toggleModuleSync,
    triggerModuleSync,
    refetch: mutate
  }
}