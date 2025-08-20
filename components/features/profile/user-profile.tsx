"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "@/lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  Mail,
  Shield,
  Calendar,
  FileText,
  Star,
  Key,
  GitBranch,
  Activity,
  Clock,
  Trophy,
  Download,
  MessageCircle,
  Package
} from "lucide-react"
import { format } from "date-fns"

interface UserProfileData {
  user: {
    id: string
    name: string | null
    image: string | null
    role: string
    joinedAt: string
    isOwnProfile: boolean
  }
  stats: {
    totalModules: number
    publishedModules: number
    featuredModules: number
    totalDownloads: number
    totalRatings: number
    avgRatingGiven: number
  }
  modules: Array<{
    id: string
    name: string
    shortDescription: string
    category: string
    icon: string | null
    isFeatured: boolean
    isRecommended: boolean
    lastUpdated: string
    createdAt: string
    totalDownloads: number
    avgRating: number
    reviewCount: number
  }> | null
  recentActivity: Array<{
    type: string
    moduleId: string
    moduleName: string
    createdAt: string
    rating?: number
    comment?: string
    action?: string
  }> | null
  achievements: Array<{
    id: string
    name: string
    description: string
    unlockedAt: string | null
  }>
  meta: {
    generatedAt: string
    includeModules: boolean
    includeActivity: boolean
    limit: number
  }
}

interface ApiKeysInfo {
  hasApiKeys: boolean
  count: number
  isLoading: boolean
}

interface GitHubInfo {
  hasGitHubPAT: boolean
  isLoading: boolean
}

export function UserProfile() {
  const { data: session } = useSession()
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [apiKeysInfo, setApiKeysInfo] = useState<ApiKeysInfo>({
    hasApiKeys: false,
    count: 0,
    isLoading: true
  })
  const [gitHubInfo, setGitHubInfo] = useState<GitHubInfo>({
    hasGitHubPAT: false,
    isLoading: true
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [session])

  useEffect(() => {
    if (session?.user?.id) {
      setIsLoading(true)
      fetch(`/api/user/profile/${session.user.id}`, {
        credentials: 'include'
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then(data => {
          console.log('Profile data received:', data)
          setProfileData(data.data || data)
          setIsLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch profile data:', err)
          setIsLoading(false)
        })
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      setApiKeysInfo(prev => ({ ...prev, isLoading: true }))
      fetch('/api/user/api-keys', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          setApiKeysInfo({
            hasApiKeys: data.apiKeys?.length > 0,
            count: data.apiKeys?.length || 0,
            isLoading: false
          })
        })
        .catch(err => {
          console.error('Failed to fetch API keys:', err)
          setApiKeysInfo(prev => ({ ...prev, isLoading: false }))
        })
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      setGitHubInfo(prev => ({ ...prev, isLoading: true }))
      fetch('/api/settings/github-pat', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          setGitHubInfo({
            hasGitHubPAT: data.hasToken || false,
            isLoading: false
          })
        })
        .catch(err => {
          console.error('Failed to fetch GitHub info:', err)
          setGitHubInfo(prev => ({ ...prev, isLoading: false }))
        })
    }
  }, [session?.user?.id])

  const getRoleColor = useMemo(() => {
    if (profileData?.user.role === 'admin') return 'destructive'
    return 'secondary'
  }, [profileData?.user.role])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading || !profileData) {
    return (
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Skeleton className="w-8 h-8" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="w-16 h-16 flex-shrink-0">
              <AvatarImage src={profileData.user.image || ""} alt={profileData.user.name || "User"} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(profileData.user.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left min-w-0 flex-1">
              <h3 className="text-lg font-semibold truncate">{profileData.user.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{session?.user.email}</p>
              {session?.user.emailVerified && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
              </div>
              <span className="truncate">{session?.user.email}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
              </div>
              <span>
                {format(new Date(profileData.user.joinedAt), 'MMMM dd, yyyy')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
              </div>
              <Badge variant={getRoleColor} className="capitalize w-fit">
                {profileData.user.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Account Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Total Modules</span>
              </div>
              <span className="text-lg font-bold">{profileData.stats.totalModules}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                <FileText className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Published</span>
              </div>
              <span className="text-lg font-bold">{profileData.stats.publishedModules}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                <Download className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Downloads</span>
              </div>
              <span className="text-lg font-bold">{profileData.stats.totalDownloads.toLocaleString()}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Ratings</span>
              </div>
              <span className="text-lg font-bold">{profileData.stats.totalRatings}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {profileData.achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No achievements yet. Keep contributing to unlock achievements!
            </p>
          ) : (
            profileData.achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium truncate">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg gap-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">API Keys</span>
            </div>
            {apiKeysInfo.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <Badge variant={apiKeysInfo.hasApiKeys ? "default" : "secondary"} className="w-fit">
                {apiKeysInfo.hasApiKeys ? `${apiKeysInfo.count} Active` : 'None'}
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">GitHub Integration</span>
            </div>
            {gitHubInfo.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <Badge variant={gitHubInfo.hasGitHubPAT ? "default" : "secondary"} className="w-fit">
                {gitHubInfo.hasGitHubPAT ? 'Connected' : 'Not Connected'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {profileData.recentActivity && profileData.recentActivity.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {profileData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {activity.type === 'rating' ? (
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Package className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm font-medium truncate">{activity.moduleName}</span>
                    {activity.type === 'rating' && activity.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs">{activity.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.type === 'rating' ? 'Left a review' : `Module ${activity.action}`} • {format(new Date(activity.createdAt), 'MMM dd, yyyy')}
                  </p>
                  {activity.comment && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {activity.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}