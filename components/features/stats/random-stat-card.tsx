"use client"

import { useEffect, useState } from "react"
import { StatCard } from "./stat-card"
import { Star, Download, Package, Shield, Zap, Award, TrendingUp } from "lucide-react"

type Stats = {
  totalModules: number
  modulesUpdatedThisWeek: number
  featuredCount?: number
  recommendedCount?: number
  totalDownloads?: number
  securityModules?: number
  performanceModules?: number
  newThisMonth?: number
}

interface RandomStatCardProps {
  stats?: Stats | null
  loading?: boolean
}

const statOptions = [
  {
    key: "updated",
    getValue: (stats: Stats | null | undefined) => stats?.modulesUpdatedThisWeek || 0,
    subtitle: "updated this week",
    icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "featured",
    getValue: (stats: Stats | null | undefined) => stats?.featuredCount || 0,
    subtitle: "featured modules",
    icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "recommended",
    getValue: (stats: Stats | null | undefined) => stats?.recommendedCount || 0,
    subtitle: "recommended",
    icon: <Star className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "downloads",
    getValue: (stats: Stats | null | undefined) => {
      const downloads = stats?.totalDownloads || 0
      if (downloads >= 1000000) {
        return `${(downloads / 1000000).toFixed(1)}M`
      }
      if (downloads >= 1000) {
        return `${(downloads / 1000).toFixed(1)}K`
      }
      return downloads
    },
    subtitle: "total downloads",
    icon: <Download className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "security",
    getValue: (stats: Stats | null | undefined) => stats?.securityModules || 0,
    subtitle: "security modules",
    icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "performance",
    getValue: (stats: Stats | null | undefined) => stats?.performanceModules || 0,
    subtitle: "performance modules",
    icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "new",
    getValue: (stats: Stats | null | undefined) => stats?.newThisMonth || 0,
    subtitle: "new this month",
    icon: <Package className="w-5 h-5 sm:w-6 sm:h-6" />
  },
  {
    key: "total",
    title: "",
    getValue: (stats: Stats | null | undefined) => stats?.totalModules || 0,
    subtitle: "total modules",
    icon: <Package className="w-5 h-5 sm:w-6 sm:h-6" />
  }
]

export function RandomStatCard({ stats, loading }: RandomStatCardProps) {
  const [selectedStat, setSelectedStat] = useState(statOptions[0])

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * statOptions.length)
    setSelectedStat(statOptions[randomIndex])
  }, [])

  return (
    <StatCard
      value={loading ? "..." : selectedStat.getValue(stats)}
      subtitle={selectedStat.subtitle}
      icon={selectedStat.icon}
      center
      responsiveLayout
    />
  )
}