export interface DbModule {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string
  author: string
  category: string
  lastUpdated: Date
  icon?: string | null
  images?: string[] | null
  isOpenSource: boolean
  license: string
  compatibility: {
    androidVersions: string[]
    rootMethods: ("Magisk" | "KernelSU" | "KernelSU-Next")[]
  }
  warnings: {
    type: "malware" | "closed-source" | "stolen-code"
    message: string
  }[]
  reviewNotes: {
    type: "approved" | "rejected" | "changes-requested"
    message: string
    reviewedBy?: string
    reviewedAt?: string
  }[]
  features: string[]
  sourceUrl?: string | null
  communityUrl?: string | null
  isFeatured: boolean
  isRecommended: boolean
  isPublished: boolean
  status: string
  submittedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Module {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string
  version: string // from latest release
  author: string
  category: string
  downloads: number // computed from releases
  rating: number // computed from ratings
  reviewCount: number // computed from ratings count
  lastUpdated: string // formatted date
  size: string // from latest release
  icon?: string
  images?: string[]
  isOpenSource: boolean
  license: string
  compatibility: {
    androidVersions: string[]
    rootMethods: ("Magisk" | "KernelSU" | "KernelSU-Next")[]
  }
  isPublished: boolean
  status: string // "pending" | "approved" | "declined"
  createdAt: string // formatted date
  warnings: {
    type: "malware" | "closed-source" | "stolen-code"
    message: string
  }[]
  features: string[]
  changelog: string // from latest release
  downloadUrl: string // from latest release
  sourceUrl?: string
  communityUrl?: string
  isFeatured: boolean
  isRecentlyUpdated: boolean // computed from lastUpdated
  isRecommended: boolean
  submittedBy?: string | null
  submittedByUsername?: string | null
  hasRejectionAction?: boolean
  latestRelease?: Release | null
  releases?: Release[]
}

export interface AdminModule extends Module {
  reviewNotes: {
    type: "approved" | "rejected" | "changes-requested"
    message: string
    reviewedBy?: string
    reviewedAt?: string
  }[]
}

export interface Rating {
  id: number
  moduleId: string
  userId: string
  rating: number
  comment?: string | null
  helpful: number
  createdAt: Date
  updatedAt: Date
  userName?: string | null
  userImage?: string | null
}

export interface Reply {
  id: number
  ratingId: number
  userId: string
  comment: string
  helpful: number
  createdAt: Date
  updatedAt: Date
  userName?: string | null
  userImage?: string | null
}

export interface ReleaseAsset {
  name: string
  downloadUrl: string
  size: string
  contentType?: string
}

export interface Release {
  id: number
  moduleId: string
  version: string
  downloadUrl: string
  size: string
  changelog?: string | null
  downloads: number
  isLatest: boolean
  githubReleaseId?: string | null
  githubTagName?: string | null
  assets?: ReleaseAsset[] | null
  createdAt: Date
  updatedAt: Date
}
