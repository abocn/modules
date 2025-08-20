import { z } from 'zod'

export const ModulesQueryParamsSchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  search: z.string().optional().describe('Search query for module names and descriptions'),
  filter: z.enum(['featured', 'recommended', 'recent']).optional().describe('Pre-defined filter type')
})

export type ModulesQueryParams = z.infer<typeof ModulesQueryParamsSchema>

export const ModulesListResponseSchema = z.object({
  modules: z.array(z.any()).describe('Array of module objects')
})

export type ModulesListResponse = z.infer<typeof ModulesListResponseSchema>

export const ModuleParamsSchema = z.object({
  id: z.string().describe('Module ID')
})

export type ModuleParams = z.infer<typeof ModuleParamsSchema>

export const ModuleQueryParamsSchema = z.object({
  includeReleases: z.enum(['true', 'false']).optional().describe('Include release information')
})

export type ModuleQueryParams = z.infer<typeof ModuleQueryParamsSchema>

export const ModuleDetailResponseSchema = z.object({
  module: z.any().describe('Module object with full details')
})

export type ModuleDetailResponse = z.infer<typeof ModuleDetailResponseSchema>

export const ErrorResponseSchema = z.object({
  error: z.string().describe('Error message'),
  code: z.string().optional().describe('Error code'),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string()
  })).optional().describe('Field-specific validation errors'),
  captchaError: z.boolean().optional().describe('Indicates captcha verification failure'),
  resetTime: z.number().optional().describe('Unix timestamp for rate limit reset'),
  existingId: z.string().optional().describe('ID of existing duplicate resource')
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const SubmitModuleResponseSchema = z.object({
  id: z.string().describe('Unique module ID'),
  message: z.string().describe('Success message'),
  pending: z.boolean().describe('Indicates module is pending review')
})

export type SubmitModuleResponse = z.infer<typeof SubmitModuleResponseSchema>

export const ModuleResponseSchema = z.object({
  id: z.string().describe('Unique module ID'),
  name: z.string().describe('Module name'),
  shortDescription: z.string().describe('Brief module description'),
  description: z.string().describe('Full module description'),
  author: z.string().describe('Module author'),
  category: z.string().describe('Module category'),
  lastUpdated: z.date().describe('Last update timestamp'),
  icon: z.string().nullable().describe('Module icon URL'),
  images: z.array(z.string()).nullable().describe('Screenshot URLs'),
  isOpenSource: z.boolean().describe('Open source status'),
  license: z.string().describe('License type'),
  compatibility: z.object({
    androidVersions: z.array(z.string()),
    rootMethods: z.array(z.string())
  }).describe('Compatibility information'),
  features: z.array(z.string()).describe('Feature list'),
  sourceUrl: z.string().nullable().describe('Source code repository URL'),
  communityUrl: z.string().nullable().describe('Community/support URL'),
  isFeatured: z.boolean().describe('Featured status'),
  isRecommended: z.boolean().describe('Recommended status'),
  downloads: z.number().optional().describe('Total download count'),
  rating: z.number().optional().describe('Average rating (1-5)'),
  ratingCount: z.number().optional().describe('Number of ratings')
})

export type ModuleResponse = z.infer<typeof ModuleResponseSchema>

export const PaginatedResponseSchema = z.object({
  data: z.array(ModuleResponseSchema).describe('Module list'),
  total: z.number().describe('Total number of modules'),
  page: z.number().describe('Current page number'),
  pageSize: z.number().describe('Items per page'),
  totalPages: z.number().describe('Total number of pages')
})

export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>

export const RatingResponseSchema = z.object({
  id: z.string().describe('Rating ID'),
  moduleId: z.string().describe('Module ID'),
  userId: z.string().describe('User ID'),
  rating: z.number().min(1).max(5).describe('Rating value (1-5)'),
  comment: z.string().nullable().describe('Review comment'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
  helpful: z.number().describe('Helpful vote count'),
  user: z.object({
    name: z.string().nullable(),
    image: z.string().nullable()
  }).optional().describe('User information')
})

export type RatingResponse = z.infer<typeof RatingResponseSchema>

export const AdminActionResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().describe('Result message'),
  moduleId: z.string().optional().describe('Affected module ID')
})

export type AdminActionResponse = z.infer<typeof AdminActionResponseSchema>

export const StatsResponseSchema = z.object({
  totalModules: z.number().describe('Total number of modules'),
  totalDownloads: z.number().describe('Total download count'),
  totalUsers: z.number().describe('Total user count'),
  pendingModules: z.number().describe('Modules pending review'),
  categories: z.array(z.object({
    name: z.string(),
    count: z.number()
  })).describe('Module count by category')
})

export type StatsResponse = z.infer<typeof StatsResponseSchema>

export const UserRoleResponseSchema = z.object({
  isAdmin: z.boolean().describe('Admin role status'),
  userId: z.string().describe('User ID'),
  email: z.string().nullable().describe('User email')
})

export type UserRoleResponse = z.infer<typeof UserRoleResponseSchema>

export const CreateRatingBodySchema = z.object({
  rating: z.number().min(1).max(5).describe('Rating value between 1 and 5'),
  comment: z.string().max(1000).optional().describe('Optional review comment (max 1000 characters)'),
  turnstileToken: z.string().describe('Turnstile captcha token for verification')
})

export type CreateRatingBody = z.infer<typeof CreateRatingBodySchema>

export const RatingsListResponseSchema = z.object({
  ratings: z.array(RatingResponseSchema).describe('List of all ratings for the module'),
  userRating: RatingResponseSchema.nullable().describe('Current user rating if exists')
})

export type RatingsListResponse = z.infer<typeof RatingsListResponseSchema>

export const CreateRatingResponseSchema = z.object({
  rating: RatingResponseSchema.describe('Newly created rating')
})

export type CreateRatingResponse = z.infer<typeof CreateRatingResponseSchema>

// Search schemas
export const SearchQueryParamsSchema = z.object({
  q: z.string().min(1).max(100).describe('Search query'),
  category: z.string().optional().describe('Filter by category'),
  sort: z.enum(['relevance', 'downloads', 'rating', 'updated', 'name']).default('relevance').describe('Sort order'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  limit: z.number().int().min(1).max(100).default(20).describe('Items per page'),
  minRating: z.number().min(1).max(5).optional().describe('Minimum rating filter'),
  isOpenSource: z.boolean().optional().describe('Filter by open source status'),
  rootMethod: z.string().optional().describe('Filter by root method'),
  androidVersion: z.string().optional().describe('Filter by Android version compatibility')
})

export type SearchQueryParams = z.infer<typeof SearchQueryParamsSchema>

export const SearchSuggestionsBodySchema = z.object({
  query: z.string().min(1).max(50).describe('Partial query for suggestions'),
  limit: z.number().int().min(1).max(20).default(10).describe('Maximum suggestions to return')
})

export type SearchSuggestionsBody = z.infer<typeof SearchSuggestionsBodySchema>

export const SearchSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.object({
    type: z.enum(['module', 'author', 'category']),
    value: z.string(),
    label: z.string(),
    count: z.number().optional()
  })).describe('Search suggestions')
})

export type SearchSuggestionsResponse = z.infer<typeof SearchSuggestionsResponseSchema>

// Image download schemas
export const ImageDownloadBodySchema = z.object({
  url: z.string().url().describe('Image URL to download'),
  type: z.enum(['icon', 'screenshot']).describe('Image type'),
  maxSize: z.number().int().min(1).max(10485760).default(5242880).describe('Maximum file size in bytes (default 5MB)')
})

export type ImageDownloadBody = z.infer<typeof ImageDownloadBodySchema>

export const ImageDownloadResponseSchema = z.object({
  url: z.string().describe('Local URL of downloaded image'),
  originalUrl: z.string().describe('Original image URL'),
  size: z.number().describe('File size in bytes'),
  contentType: z.string().describe('MIME type'),
  width: z.number().optional().describe('Image width in pixels'),
  height: z.number().optional().describe('Image height in pixels')
})

export type ImageDownloadResponse = z.infer<typeof ImageDownloadResponseSchema>

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).describe('Display name')
})

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>

export const UpdateProfileResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable()
  }).describe('Updated user information')
})

export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>

// API key schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).describe('API key name'),
  expiresIn: z.enum(['30days', '90days', '1year', 'never']).default('90days').describe('Expiration period'),
  scopes: z.array(z.enum(['read', 'write'])).default(['read']).describe('API key permissions')
})

export type CreateApiKeyBody = z.infer<typeof createApiKeySchema>

export const CreateApiKeyResponseSchema = z.object({
  id: z.string().describe('API key ID'),
  name: z.string().describe('API key name'),
  key: z.string().describe('API key value (only shown once)'),
  scopes: z.array(z.string()).describe('Granted scopes'),
  expiresAt: z.date().nullable().describe('Expiration date'),
  createdAt: z.date().describe('Creation date')
})

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>

export const ApiKeysListResponseSchema = z.object({
  apiKeys: z.array(z.object({
    id: z.string(),
    name: z.string(),
    scopes: z.array(z.string()),
    expiresAt: z.date().nullable(),
    createdAt: z.date(),
    lastUsed: z.date().nullable()
  })).describe('List of user API keys (without key values)')
})

export type ApiKeysListResponse = z.infer<typeof ApiKeysListResponseSchema>

export const RevokeApiKeyResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().describe('Result message')
})

export type RevokeApiKeyResponse = z.infer<typeof RevokeApiKeyResponseSchema>

// GitHub PAT schemas
export const GitHubPATBodySchema = z.object({
  token: z.string().min(1).describe('GitHub Personal Access Token')
})

export type GitHubPATBody = z.infer<typeof GitHubPATBodySchema>

export const ValidateGitHubPATBodySchema = z.object({
  token: z.string().min(1).describe('GitHub Personal Access Token to validate')
})

export type ValidateGitHubPATBody = z.infer<typeof ValidateGitHubPATBodySchema>

export const ValidateGitHubPATResponseSchema = z.object({
  valid: z.boolean().describe('Token validity status'),
  username: z.string().optional().describe('GitHub username'),
  scopes: z.array(z.string()).optional().describe('Token scopes'),
  error: z.string().optional().describe('Validation error message')
})

export type ValidateGitHubPATResponse = z.infer<typeof ValidateGitHubPATResponseSchema>

export const GitHubPATStatusResponseSchema = z.object({
  hasToken: z.boolean().describe('Whether user has configured a PAT'),
  username: z.string().optional().describe('Associated GitHub username')
})

export type GitHubPATStatusResponse = z.infer<typeof GitHubPATStatusResponseSchema>

export const SaveGitHubPATResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().describe('Result message')
})

export type SaveGitHubPATResponse = z.infer<typeof SaveGitHubPATResponseSchema>

export const DeleteGitHubPATResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().describe('Result message')
})

export type DeleteGitHubPATResponse = z.infer<typeof DeleteGitHubPATResponseSchema>

// Avatar upload schemas
export const UploadAvatarResponseSchema = z.object({
  success: z.boolean().describe('Upload success status'),
  url: z.string().describe('Avatar URL'),
  message: z.string().describe('Result message')
})

export type UploadAvatarResponse = z.infer<typeof UploadAvatarResponseSchema>

export const DeleteAvatarResponseSchema = z.object({
  success: z.boolean().describe('Delete success status'),
  message: z.string().describe('Result message')
})

export type DeleteAvatarResponse = z.infer<typeof DeleteAvatarResponseSchema>

// Helpful votes schemas
export const HelpfulVoteResponseSchema = z.object({
  success: z.boolean().describe('Vote operation success'),
  helpful: z.number().describe('Updated helpful vote count'),
  userVoted: z.boolean().describe('Whether current user has voted')
})

export type HelpfulVoteResponse = z.infer<typeof HelpfulVoteResponseSchema>

export const HelpfulVotesResponseSchema = z.object({
  ratingVotes: z.array(z.string()).describe('Rating IDs the user has marked helpful'),
  replyVotes: z.array(z.string()).describe('Reply IDs the user has marked helpful')
})

export type HelpfulVotesResponse = z.infer<typeof HelpfulVotesResponseSchema>

// Replies schemas
export const CreateReplyBodySchema = z.object({
  content: z.string().min(1).max(2000).describe('Reply content'),
  turnstileToken: z.string().describe('Turnstile captcha token for verification')
})

export type CreateReplyBody = z.infer<typeof CreateReplyBodySchema>

export const ReplyResponseSchema = z.object({
  id: z.string().describe('Reply ID'),
  ratingId: z.string().describe('Parent rating ID'),
  userId: z.string().describe('Author user ID'),
  content: z.string().describe('Reply content'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
  helpful: z.number().describe('Helpful vote count'),
  user: z.object({
    name: z.string().nullable(),
    image: z.string().nullable()
  }).optional().describe('Author information')
})

export type ReplyResponse = z.infer<typeof ReplyResponseSchema>

export const CreateReplyResponseSchema = z.object({
  reply: ReplyResponseSchema.describe('Newly created reply')
})

export type CreateReplyResponse = z.infer<typeof CreateReplyResponseSchema>

export const RepliesListResponseSchema = z.object({
  replies: z.array(ReplyResponseSchema).describe('List of replies for the rating')
})

export type RepliesListResponse = z.infer<typeof RepliesListResponseSchema>

// Module releases schemas
export const ModuleReleasesQueryParamsSchema = z.object({
  latest: z.enum(['true', 'false']).optional().describe('Return only latest release'),
  includeAssets: z.enum(['true', 'false']).default('false').describe('Include release assets')
})

export type ModuleReleasesQueryParams = z.infer<typeof ModuleReleasesQueryParamsSchema>

export const ReleaseResponseSchema = z.object({
  id: z.string().describe('Release ID'),
  moduleId: z.string().describe('Module ID'),
  version: z.string().describe('Release version'),
  downloadUrl: z.string().describe('Download URL'),
  changelog: z.string().nullable().describe('Release notes'),
  size: z.string().nullable().describe('File size'),
  downloads: z.number().describe('Download count'),
  isLatest: z.boolean().describe('Latest release flag'),
  createdAt: z.date().describe('Release date'),
  assets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    downloadUrl: z.string(),
    size: z.string(),
    contentType: z.string().nullable(),
    downloads: z.number()
  })).optional().describe('Release assets')
})

export type ReleaseResponse = z.infer<typeof ReleaseResponseSchema>

export const ReleasesListResponseSchema = z.object({
  releases: z.array(ReleaseResponseSchema).describe('List of module releases')
})

export type ReleasesListResponse = z.infer<typeof ReleasesListResponseSchema>

// Trending and categories
export const TrendingResponseSchema = z.object({
  modules: z.array(ModuleResponseSchema).describe('Trending modules')
})

export type TrendingResponse = z.infer<typeof TrendingResponseSchema>

export const CategoriesResponseSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    displayName: z.string(),
    description: z.string(),
    count: z.number(),
    icon: z.string().optional()
  })).describe('Available module categories')
})

export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>

// User submissions
export const MySubmissionsResponseSchema = z.object({
  modules: z.array(ModuleResponseSchema.extend({
    status: z.enum(['pending', 'approved', 'rejected']).describe('Module status'),
    submittedAt: z.date().describe('Submission date'),
    reviewedAt: z.date().nullable().describe('Review date'),
    reviewNote: z.string().nullable().describe('Review feedback')
  })).describe('User submitted modules')
})

export type MySubmissionsResponse = z.infer<typeof MySubmissionsResponseSchema>

// Module stats
export const ModuleStatsResponseSchema = z.object({
  downloads: z.object({
    total: z.number(),
    daily: z.array(z.object({
      date: z.string(),
      count: z.number()
    })),
    weekly: z.array(z.object({
      week: z.string(),
      count: z.number()
    })),
    monthly: z.array(z.object({
      month: z.string(),
      count: z.number()
    }))
  }).describe('Download statistics'),
  ratings: z.object({
    average: z.number(),
    distribution: z.object({
      "1": z.number(),
      "2": z.number(),
      "3": z.number(),
      "4": z.number(),
      "5": z.number()
    }),
    recent: z.array(RatingResponseSchema.pick({
      rating: true,
      createdAt: true
    }))
  }).describe('Rating statistics'),
  releases: z.object({
    total: z.number(),
    latest: ReleaseResponseSchema.pick({
      version: true,
      createdAt: true,
      downloads: true
    }).nullable()
  }).describe('Release statistics')
})

export type ModuleStatsResponse = z.infer<typeof ModuleStatsResponseSchema>

// Download tracking
export const DownloadTrackingBodySchema = z.object({
  referrer: z.string().optional().describe('Download referrer'),
  userAgent: z.string().optional().describe('User agent string')
})

export type DownloadTrackingBody = z.infer<typeof DownloadTrackingBodySchema>

export const SuccessResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().describe('Success message')
})

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>

// Update module schemas
export const UpdateModuleBodySchema = z.object({
  module: moduleSubmissionSchema.partial().describe('Updated module fields'),
  release: z.object({
    version: z.string(),
    downloadUrl: z.string().url(),
    changelog: z.string().optional(),
    size: z.string().optional()
  }).optional().describe('New release information')
})

export type UpdateModuleBody = z.infer<typeof UpdateModuleBodySchema>

export const UpdateModuleResponseSchema = z.object({
  success: z.boolean().describe('Update success status'),
  module: ModuleResponseSchema.describe('Updated module'),
  message: z.string().describe('Result message')
})

export type UpdateModuleResponse = z.infer<typeof UpdateModuleResponseSchema>

// User profile by ID
export const UserProfileParamsSchema = z.object({
  id: z.string().describe('User ID')
})

export type UserProfileParams = z.infer<typeof UserProfileParamsSchema>

export const UserProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    joinedAt: z.date(),
    modulesCount: z.number(),
    totalDownloads: z.number(),
    averageRating: z.number().nullable()
  }).describe('Public user profile'),
  modules: z.array(ModuleResponseSchema).describe('User published modules'),
  recentActivity: z.array(z.object({
    type: z.enum(['module_published', 'module_updated', 'rating_posted']),
    timestamp: z.date(),
    moduleId: z.string().optional(),
    moduleName: z.string().optional()
  })).describe('Recent user activity')
})

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>

// Import moduleSubmissionSchema for UpdateModuleBodySchema
import { moduleSubmissionSchema } from './module'