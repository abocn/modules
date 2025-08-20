import { useState, useEffect, useCallback } from 'react'
import type { AdminModule } from '@/types/module'

interface UseAdminModulesReturn {
  deleteModule: (moduleId: string) => Promise<boolean>
  updateFeaturedStatus: (moduleId: string, isFeatured: boolean) => Promise<boolean>
  updateRecommendedStatus: (moduleId: string, isRecommended: boolean) => Promise<boolean>
  updateModuleStatus: (moduleId: string, isPublished: boolean, notes?: string) => Promise<boolean>
  updateModuleWarnings: (moduleId: string, warnings: {type: "malware" | "closed-source" | "stolen-code", message: string}[]) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

interface AdminStats {
  totalModules: number
  totalUsers: number
  totalDownloads: number
  pendingModules: number
  declinedModules: number
}

interface PendingModule {
  id: string
  name: string
  author: string
  category: string
  createdAt: string
  description: string
}

interface UseAdminStatsReturn {
  stats: AdminStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UsePendingModulesReturn {
  pendingModules: PendingModule[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface RecentAction {
  id: string
  action: string
  details: string
  targetType: string
  targetId: string
  createdAt: string
  adminName: string
}

interface UseRecentActionsReturn {
  recentActions: RecentAction[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseAdminModulesListReturn {
  modules: AdminModule[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAdminModules(): UseAdminModulesReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteModule = async (moduleId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete module')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete module'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateFeaturedStatus = async (moduleId: string, isFeatured: boolean): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFeatured }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update featured status')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update featured status'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateRecommendedStatus = async (moduleId: string, isRecommended: boolean): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRecommended }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update recommended status')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recommended status'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateModuleStatus = async (moduleId: string, isPublished: boolean, notes?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished, notes }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update module status')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update module status'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateModuleWarnings = async (moduleId: string, warnings: {type: "malware" | "closed-source" | "stolen-code", message: string}[]): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warnings }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update module warnings')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update module warnings'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteModule,
    updateFeaturedStatus,
    updateRecommendedStatus,
    updateModuleStatus,
    updateModuleWarnings,
    isLoading,
    error
  }
}

export function useAdminStats(): UseAdminStatsReturn {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}

export function usePendingModules(limit: number = 4): UsePendingModulesReturn {
  const [pendingModules, setPendingModules] = useState<PendingModule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingModules = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/modules/pending?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pending modules')
      }

      const data = await response.json()
      setPendingModules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchPendingModules()
  }, [limit, fetchPendingModules])

  return {
    pendingModules,
    isLoading,
    error,
    refetch: fetchPendingModules
  }
}

export function useRecentActions(limit: number = 5): UseRecentActionsReturn {
  const [recentActions, setRecentActions] = useState<RecentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentActions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/recent-actions?limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch recent actions')
      }

      const data = await response.json()
      setRecentActions(data.actions || [])
    } catch (err) {
      console.error('[! use-admin.ts] Error fetching recent actions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch recent actions')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchRecentActions()
  }, [limit, fetchRecentActions])

  return {
    recentActions,
    isLoading,
    error,
    refetch: fetchRecentActions,
  }
}

export function useAdminModulesList(search?: string, limit: number = 20, offset: number = 0): UseAdminModulesListReturn {
  const [modules, setModules] = useState<AdminModule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModules = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/admin/modules?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch modules')
      }

      const data = await response.json()
      setModules(data.modules || [])
    } catch (err) {
      console.error('[use-admin.ts] Error fetching modules:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch modules')
    } finally {
      setIsLoading(false)
    }
  }, [search, limit, offset])

  useEffect(() => {
    fetchModules()
  }, [search, limit, offset, fetchModules])

  return {
    modules,
    isLoading,
    error,
    refetch: fetchModules,
  }
}