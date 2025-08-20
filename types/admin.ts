import type { InferSelectModel } from 'drizzle-orm'
import type { user, account, modules } from '@/db/schema'

export type User = InferSelectModel<typeof user>
export type Account = InferSelectModel<typeof account>
export type Module = InferSelectModel<typeof modules>

export interface UserWithStats extends Omit<User, 'role' | 'image'> {
  role: "user" | "admin"
  image?: string | undefined
  provider?: string | undefined
  joinDate: string
  lastActive: string
  modulesSubmitted: number
  reviewsWritten: number
}

export interface UserQueryResult {
  user: User
  provider: string | null
}

export interface UserAdvancedFilters extends FilterValues {
  query?: string
  roleFilter?: string
  providerFilter?: string
  joinDateFrom?: string
  joinDateTo?: string
  lastActiveFrom?: string
  lastActiveTo?: string
  minModules?: number
  minReviews?: number
  emailVerified?: string | boolean
}

export interface ModuleAdvancedFilters extends FilterValues {
  query?: string
  category?: string
  status?: string
  featured?: string
  recommended?: string
  hasWarnings?: string
  isOpenSource?: string
  createdDateRange?: { from?: string; to?: string }
  updatedDateRange?: { from?: string; to?: string }
  minDownloads?: number
  minRating?: number
}

export type FilterFieldType = 'text' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'daterange' | 'number' | 'slider'

export interface FilterField {
  type: FilterFieldType
  key: string
  label: string
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  defaultValue?: string | number | boolean
}

export type FilterValue = string | number | boolean | { from?: string; to?: string } | string[] | undefined

export interface FilterValues {
  [key: string]: FilterValue
}

export interface SubmissionAdvancedFilters extends FilterValues {
  query?: string
  category?: string
  status?: string
  reviewStatus?: string
  isOpenSource?: string
  hasWarnings?: string
  submittedDateRange?: { from?: string; to?: string }
  updatedDateRange?: { from?: string; to?: string }
  hasReviewNotes?: string
}

export interface ApiKeyAdvancedFilters extends FilterValues {
  query?: string
  status?: string
  scope?: string
  userFilter?: string
  createdDateFrom?: string
  createdDateTo?: string
  lastUsedDateFrom?: string
  lastUsedDateTo?: string
  expirationStatus?: string
}