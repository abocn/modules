import { useState, useEffect, useCallback } from 'react'
import type { Module, Rating, Release } from '@/types/module'

interface UseModulesOptions {
  category?: string
  search?: string
  filter?: 'featured' | 'recommended' | 'recent'
}

export function useModules(options: UseModulesOptions = {}) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.category) params.append('category', options.category)
      if (options.search) params.append('search', options.search)
      if (options.filter) params.append('filter', options.filter)

      const response = await fetch(`/api/modules?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch modules')
      }

      const data = await response.json()
      setModules(data.modules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.category, options.search, options.filter])

  useEffect(() => {
    fetchModules()
  }, [options.category, options.search, options.filter, refetchTrigger, fetchModules])

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  return { modules, loading, error, refetch }
}

export function useModule(id: string, includeReleases = false) {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModule = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = includeReleases ? '?includeReleases=true' : ''
        const response = await fetch(`/api/modules/${id}${params}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Module not found')
          }
          throw new Error('Failed to fetch module')
        }

        const data = await response.json()
        setModule(data.module)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchModule()
    }
  }, [id, includeReleases])

  return { module, loading, error }
}

export function useModuleRatings(moduleId: string) {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [userRating, setUserRating] = useState<Rating | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/modules/${moduleId}/ratings`)
      if (!response.ok) {
        throw new Error('Failed to fetch ratings')
      }

      const data = await response.json()
      setRatings(data.ratings)
      setUserRating(data.userRating)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    if (moduleId) {
      fetchRatings()
    }
  }, [moduleId, refetchTrigger, fetchRatings])

  const submitRating = async (rating: number, comment?: string, turnstileToken?: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment, turnstileToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit rating')
      }

      const ratingsResponse = await fetch(`/api/modules/${moduleId}/ratings`)
      if (ratingsResponse.ok) {
        const data = await ratingsResponse.json()
        setRatings(data.ratings)
        setUserRating(data.userRating)
      }

      return true
    } catch (err) {
      throw err
    }
  }

  const refreshRatings = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  return { ratings, userRating, loading, error, submitRating, refreshRatings }
}

export function useModuleReleases(moduleId: string) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/modules/${moduleId}/releases`)
        if (!response.ok) {
          throw new Error('Failed to fetch releases')
        }

        const data = await response.json()
        setReleases(data.releases)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (moduleId) {
      fetchReleases()
    }
  }, [moduleId])

  return { releases, loading, error }
}

export function useDownloadTracking() {
  const trackDownload = async (moduleId: string, releaseId?: number) => {
    try {
      await fetch(`/api/modules/${moduleId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ releaseId }),
      })
    } catch (err) {
      console.error('Failed to track download:', err)
    }
  }

  return { trackDownload }
}