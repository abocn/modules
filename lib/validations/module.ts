import { z } from 'zod'

export const MAX_NAME = 80
export const MAX_SHORT = 140
export const MAX_FEATURE = 150
export const MAX_FEATURES = 25
export const MAX_DESCRIPTION = 8000
export const MAX_IMAGES = 10
export const MAX_AUTHOR = 60
export const MAX_LICENSE = 40
export const MAX_CUSTOM_LICENSE = 100
export const MAX_URL = 300
export const MAX_IMAGE_URL = 500

export const CATEGORIES = [
  'security',
  'performance',
  'ui',
  'system',
  'media',
  'development',
  'gaming',
  'miscellaneous'
] as const

export const LICENSES = [
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "GPL-2.0",
  "LGPL-3.0",
  "LGPL-2.1",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "MPL-2.0",
  "ISC",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "AGPL-3.0",
  "Unlicense",
  "WTFPL",
  "Proprietary",
  "Custom",
  "Other",
] as const

export const ROOT_METHODS = [
  'Magisk',
  'KernelSU',
  'KernelSU-Next'
] as const

export const ANDROID_VERSIONS = [
  '4.1+',
  '5.0+',
  '6.0+',
  '7.0+',
  '8.0+',
  '9.0+',
  '10+',
  '11+',
  '12+',
  '13+',
  '14+',
  '15+',
  '16+'
] as const

export const moduleSubmissionSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(MAX_NAME, `Name must be at most ${MAX_NAME} characters`)
    .regex(/^[a-zA-Z0-9\s\-._()[\]]+$/, 'Name contains invalid characters'),

  shortDescription: z.string()
    .trim()
    .min(10, 'Short description must be at least 10 characters')
    .max(MAX_SHORT, `Short description must be at most ${MAX_SHORT} characters`),

  description: z.string()
    .trim()
    .min(30, 'Description must be at least 30 characters')
    .max(MAX_DESCRIPTION, `Description must be at most ${MAX_DESCRIPTION} characters`),

  author: z.string()
    .trim()
    .min(2, 'Author name must be at least 2 characters')
    .max(MAX_AUTHOR, `Author name must be at most ${MAX_AUTHOR} characters`)
    .regex(/^[a-zA-Z0-9\s\-._@]+$/, 'Author name contains invalid characters'),

  category: z.enum(CATEGORIES, {
    message: 'Please select a valid category'
  }),

  license: z.enum(LICENSES, {
    message: 'Please select a valid license'
  }),

  customLicense: z.string()
    .trim()
    .max(MAX_CUSTOM_LICENSE, `Custom license must be at most ${MAX_CUSTOM_LICENSE} characters`)
    .optional()
    .or(z.literal('').transform(() => undefined)),

  isOpenSource: z.boolean(),

  sourceUrl: z.string()
    .trim()
    .max(MAX_URL, `URL must be at most ${MAX_URL} characters`)
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'Please enter a valid URL'
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),

  communityUrl: z.string()
    .trim()
    .max(MAX_URL, `URL must be at most ${MAX_URL} characters`)
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'Please enter a valid URL'
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),

  githubRepo: z.string()
    .trim()
    .max(MAX_URL, `GitHub repository must be at most ${MAX_URL} characters`)
    .refine((val) => !val || /^https?:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?(?:\/.*)?$/.test(val) || /^[^\/]+\/[^\/]+$/.test(val), {
      message: 'Please enter a valid GitHub repository URL or owner/repo format'
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),

  features: z.array(
    z.string()
      .trim()
      .min(2, 'Feature must be at least 2 characters')
      .max(MAX_FEATURE, `Feature must be at most ${MAX_FEATURE} characters`)
  )
    .min(1, 'At least one feature is required')
    .max(MAX_FEATURES, `Maximum ${MAX_FEATURES} features allowed`),

  compatibility: z.object({
    androidVersions: z.array(z.enum(ANDROID_VERSIONS))
      .min(1, 'At least one Android version must be selected')
      .max(20, 'Maximum 20 Android versions allowed'),

    rootMethods: z.array(z.enum(ROOT_METHODS))
      .min(1, 'At least one root method must be selected')
      .max(5, 'Maximum 5 root methods allowed')
  }),

  icon: z.string()
    .trim()
    .max(MAX_URL, `Icon URL must be at most ${MAX_URL} characters`)
    .refine((val) => !val || /^(\/|https?:\/\/).+/.test(val), {
      message: 'Please enter a valid icon URL or path'
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),


  images: z.array(
    z.string()
      .trim()
      .max(MAX_IMAGE_URL, `Image URL must be at most ${MAX_IMAGE_URL} characters`)
      .refine((val) => /^(\/|https?:\/\/).+/.test(val), {
        message: 'Please enter valid image URLs or paths'
      })
  )
    .max(MAX_IMAGES, `Maximum ${MAX_IMAGES} images allowed`)
    .optional()
})
  .refine(data => {
    if (data.isOpenSource) {
      return data.sourceUrl && data.sourceUrl.length > 0
    }
    return true
  }, {
    message: 'Source URL is required for open source modules',
    path: ['sourceUrl']
  })
  .refine(data => {
    if (data.license === 'Custom') {
      return data.customLicense && data.customLicense.length > 0
    }
    return true
  }, {
    message: 'Custom license name is required when Custom license is selected',
    path: ['customLicense']
  })

export type ModuleSubmission = z.infer<typeof moduleSubmissionSchema>

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, '')
}

export const releaseSchema = z.object({
  version: z.string()
    .trim()
    .transform(normalizeVersion),
  downloadUrl: z.string()
    .trim()
    .max(MAX_URL, `Download URL must be at most ${MAX_URL} characters`)
    .refine((val) => /^https?:\/\/.+/.test(val), {
      message: 'Please enter a valid download URL'
    }),
  changelog: z.string()
    .trim()
    .max(5000, 'Changelog must be at most 5000 characters')
    .optional(),
  size: z.string().optional(),
  githubReleaseId: z.string().optional(),
  githubTagName: z.string().optional(),
  isLatest: z.boolean().default(true),
  assets: z.array(z.object({
    name: z.string(),
    downloadUrl: z.string().refine((val) => /^https?:\/\/.+/.test(val), {
      message: 'Must be a valid URL'
    }),
    size: z.string(),
    contentType: z.string().optional()
  })).optional()
})

export type Release = z.infer<typeof releaseSchema>

export const moduleSubmissionWithReleaseSchema = z.object({
  module: moduleSubmissionSchema,
  release: releaseSchema.optional()
})

export type ModuleSubmissionWithRelease = z.infer<typeof moduleSubmissionWithReleaseSchema>

export const clientModuleSchema = moduleSubmissionSchema.extend({
  captchaToken: z.string().optional()
})

export type ClientModuleSubmission = z.infer<typeof clientModuleSchema>