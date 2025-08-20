import { useState, useEffect } from 'react'

interface Stats {
  totalModules: number
  modulesUpdatedThisWeek: number
  featuredCount: number
  recommendedCount: number
  totalDownloads: number
  securityModules: number
  performanceModules: number
  newThisMonth: number
  currentTime: string
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats', {
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    const interval = setInterval(() => {
      if (stats) {
        setStats(prev => prev ? { ...prev, currentTime: new Date().toLocaleString() } : prev)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return { stats, loading, error }
}