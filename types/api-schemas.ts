import { Module, Release, Rating, Reply } from './module'

export interface ErrorResponse {
  error: string
  message?: string
  details?: Record<string, unknown>
}

export interface ValidationErrorResponse extends ErrorResponse {
  errors?: Array<{
    field: string
    message: string
  }>
}

export interface RateLimitErrorResponse extends ErrorResponse {
  resetTime?: number
  remaining?: number
  limit?: number
}

export interface SuccessResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface ApiKeyScope {
  read: boolean
  write: boolean
  admin: boolean
}

export interface ModulesQueryParams {
  category?: string
  search?: string
  filter?: 'featured' | 'recommended' | 'recent'
  limit?: number
  offset?: number
  sort?: 'name' | 'downloads' | 'rating' | 'updated'
  order?: 'asc' | 'desc'
}

export interface ModulesListResponse {
  modules: Module[]
  total?: number
  offset?: number
  limit?: number
  hasMore?: boolean
}

export interface ModuleParams {
  id: string
}

export interface ModuleQueryParams {
  includeReleases?: boolean
}

export interface ModuleDetailResponse {
  module: Module
}

export interface SubmitModuleRequest {
  module: {
    name: string
    shortDescription: string
    description: string
    author: string
    category: 'security' | 'performance' | 'ui' | 'system' | 'media' | 'development' | 'gaming' | 'miscellaneous'
    license: string
    isOpenSource: boolean
    sourceUrl?: string
    communityUrl?: string
    githubRepo?: string
    features: string[]
    compatibility: {
      androidVersions: string[]
      rootMethods: ('Magisk' | 'KernelSU' | 'KernelSU-Next')[]
    }
    icon?: string
    images?: string[]
  }
  release?: {
    version: string
    downloadUrl: string
    changelog?: string
    size?: string
    githubReleaseId?: string
    githubTagName?: string
    assets?: Array<{
      name: string
      downloadUrl: string
      size: string
      contentType?: string
    }>
  }
  turnstileToken: string
}

export interface SubmitModuleResponse {
  id: string
  message: string
  pending: boolean
}

export interface MySubmissionsResponse {
  submissions: Array<Module & {
    status: 'pending' | 'approved' | 'declined'
    warnings: Array<{
      type: 'malware' | 'closed-source' | 'stolen-code'
      message: string
    }>
  }>
}

export interface SearchQueryParams {
  q: string
  category?: string
  author?: string
  license?: string
  sort?: 'relevance' | 'name' | 'downloads' | 'rating' | 'updated'
  order?: 'asc' | 'desc'
  minRating?: number
  isOpenSource?: boolean
  rootMethod?: string
  androidVersion?: string
  limit?: number
  offset?: number
}

export interface SearchResponse {
  query: string
  results: Module[]
  totalCount: number
  offset: number
  limit: number
  hasMore: boolean
  searchOptions: SearchQueryParams
}

export interface SearchSuggestionsRequest {
  query: string
  type?: 'all' | 'modules' | 'authors' | 'categories'
}

export interface SearchSuggestionsResponse {
  query: string
  modules: string[]
  authors: string[]
  categories: string[]
}

export interface CategoriesQueryParams {
  includeEmpty?: boolean
  sort?: 'name' | 'count'
  order?: 'asc' | 'desc'
}

export interface CategoryInfo {
  name: string
  count: number
  featuredCount: number
  recommendedCount: number
  recentCount: number
  avgRating: number
  percentage: number
  slug: string
  description: string
  icon: string
}

export interface CategoriesResponse {
  categories: CategoryInfo[]
  totalStats: {
    totalCategories: number
    totalModules: number
    avgModulesPerCategory: number
    mostPopularCategory: string | null
  }
  meta: {
    sort: string
    order: string
    includeEmpty: boolean
    generatedAt: string
  }
}

export interface RatingsListResponse {
  ratings: Rating[]
  userRating: Rating | null
}

export interface CreateRatingBody {
  rating: number
  comment?: string
  turnstileToken: string
}

export interface CreateRatingResponse {
  rating: Rating
}

export interface ModuleReleasesQueryParams {
  latest?: boolean
}

export interface ReleasesListResponse {
  releases: Release[]
}

export interface LatestReleaseResponse {
  release: Release
}

export interface DownloadTrackingBody {
  releaseId?: number
  assetName?: string
}

export interface HelpfulVotesResponse {
  ratings: number[]
  replies: number[]
}

export interface HelpfulVoteBody {
  helpful: boolean
  turnstileToken: string
}

export interface HelpfulVoteResponse {
  success: boolean
  helpful: boolean
  helpfulCount: number
}

export interface TrendingQueryParams {
  timeframe?: '1d' | '7d' | '30d'
  category?: string
  algorithm?: 'downloads' | 'ratings' | 'balanced' | 'new'
  limit?: number
}

export interface TrendingModule extends Module {
  trendScore: number
  trendData: {
    recentDownloads: number
    recentRatings: number
    avgRecentRating: number
    totalDownloads: number
    daysSinceCreated: number
    wasRecentlyUpdated: boolean
  }
}

export interface TrendingResponse {
  trending: TrendingModule[]
  meta: {
    algorithm: string
    timeframe: string
    category: string
    limit: number
    generatedAt: string
    explanation: string
  }
}

export interface StatsResponse {
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

export interface UserProfileParams {
  /** User ID */
  id: string
}

export interface UserProfileQueryParams {
  includeModules?: boolean
  includeActivity?: boolean
  limit?: number
}

export interface UserProfileResponse {
  user: {
    id: string
    name: string | null
    image: string | null
    role: 'user' | 'admin'
    joinedAt: Date
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
    lastUpdated: Date
    createdAt: Date
    totalDownloads: number
    avgRating: number
    reviewCount: number
  }> | null
  recentActivity: Array<{
    type: 'rating' | 'module_update'
    moduleId: string
    moduleName: string
    createdAt: Date
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

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset'?: string
  'Retry-After'?: string
}