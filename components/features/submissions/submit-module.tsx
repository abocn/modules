"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LicenseCombobox } from "@/components/ui/license-combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Turnstile, TurnstileRef } from "@/components/shared/turnstile"
import { Info, Plus, X, AlertTriangle, Check, ExternalLink, Settings } from "lucide-react"
import { normalizeVersion, CATEGORIES } from "@/lib/validations/module"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { LoadingState } from "@/components/shared/loading-state"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(3, "Module name must be at least 3 characters").max(100, "Module name must be less than 100 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters").max(200, "Short description must be less than 200 characters"),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000, "Description must be less than 5000 characters"),
  author: z.string().min(2, "Author name must be at least 2 characters").max(50, "Author name must be less than 50 characters"),
  category: z.enum(CATEGORIES),
  iconUrl: z.string()
    .max(300, "Icon URL must be at most 300 characters")
    .refine(
      (val) => !val || /^(\/|https?:\/\/).+/.test(val),
      { message: "Please enter a valid icon URL or path" }
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  license: z.string().optional(),
  customLicense: z.string().optional(),
  isOpenSource: z.boolean().default(false),
  sourceUrl: z.string().optional(),
  communityUrl: z.string()
    .max(300, "URL must be at most 300 characters")
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      { message: "Please enter a valid URL" }
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  githubRepo: z.string()
    .max(300, "GitHub repository must be at most 300 characters")
    .refine(
      (val) => !val || /^https?:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?(?:\/.*)?$/.test(val) || /^[^\/]+\/[^\/]+$/.test(val),
      { message: "Please enter a valid GitHub repository URL or owner/repo format" }
    )
    .optional()
    .or(z.literal('').transform(() => undefined)),
  features: z.array(z.string().min(1, "Feature cannot be empty").max(150, "Feature must be at most 150 characters")).min(1, "Add at least one feature").max(25, "Maximum 25 features allowed"),
  androidVersions: z.array(z.string()).min(1, "Select at least one Android version"),
  rootMethods: z.array(z.enum(["Magisk", "KernelSU", "KernelSU-Next"])).min(1, "Select at least one root method"),
  images: z.array(z.string().refine(
    (val) => /^https?:\/\/.+/.test(val),
    { message: "Must be a valid URL" }
  )).max(10, "Maximum 10 images allowed").optional(),
  manualReleaseVersion: z.string()
    .transform(val => val?.trim())
    .refine(
      (val) => !val || /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(val),
      { message: "Version must follow semantic versioning (e.g., 1.0.0, v2.1.3, 2.0.0-beta, v3.1.0+build.123)" }
    )
    .optional(),
  manualReleaseUrl: z.string()
    .max(300, "Download URL must be at most 300 characters")
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      { message: "Please enter a valid download URL" }
    )
    .optional(),
  manualReleaseChangelog: z.string()
    .max(5000, "Changelog must be at most 5000 characters")
    .optional(),
}).refine(
  (data) => {
    if (data.isOpenSource) {
      return data.license && data.license.length > 0
    }
    return true
  },
  {
    message: "License is required for open source modules",
    path: ["license"],
  }
).refine(
  (data) => {
    if (data.isOpenSource) {
      return data.sourceUrl && data.sourceUrl.length > 0
    }
    return true
  },
  {
    message: "Source URL is required for open source modules",
    path: ["sourceUrl"],
  }
).refine(
  (data) => {
    if (!data.isOpenSource) {
      return data.manualReleaseVersion && data.manualReleaseVersion.length > 0
    }
    return true
  },
  {
    message: "Version is required for non-open source modules",
    path: ["manualReleaseVersion"],
  }
).refine(
  (data) => {
    if (!data.isOpenSource) {
      return data.manualReleaseUrl && data.manualReleaseUrl.length > 0
    }
    return true
  },
  {
    message: "Download URL is required for non-open source modules",
    path: ["manualReleaseUrl"],
  }
).refine(
  (data) => {
    if (data.isOpenSource && data.sourceUrl) {
      return /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(data.sourceUrl)
    }
    return true
  },
  {
    message: "Source URL must be a valid GitHub repository URL",
    path: ["sourceUrl"],
  }
).refine(
  (data) => {
    if (data.license === "Custom") {
      return data.customLicense && data.customLicense.trim().length > 0
    }
    return true
  },
  {
    message: "Custom license name is required when Custom license is selected",
    path: ["customLicense"],
  }
).refine(
  (data) => {
    if (!data.isOpenSource && data.manualReleaseUrl) {
      try {
        new URL(data.manualReleaseUrl)
        return true
      } catch {
        return false
      }
    }
    return true
  },
  {
    message: "Download URL must be a valid URL",
    path: ["manualReleaseUrl"],
  }
)

/**
 * @typedef {z.infer<typeof formSchema>} FormData
 * @description Type definition for the module submission form data
 */
type FormData = z.infer<typeof formSchema>

/**
 * @interface SubmitModuleProps
 * @description Props for the SubmitModule component
 * @property {string} [userId] - Optional user ID for authenticated submissions
 */
interface SubmitModuleProps {
  userId?: string
}

/**
 * @component SubmitModule
 * @description A form component for submitting new modules with custom license support and GitHub integration
 * @param {SubmitModuleProps} props - The component props
 * @returns {JSX.Element} The rendered module submission form
 *
 * @example
 * ```tsx
 * <SubmitModule userId="user123" />
 * ```
 *
 * @features
 * - User module submission with GitHub PAT verification
 * - Dual GitHub repository inputs for source code and release syncing
 * - Automatic GitHub release fetching and selection
 * - Turnstile captcha integration for security
 * - Image management and preview functionality
 * - Form validation with Zod schema
 *
 * @githubInputs
 * - sourceUrl: GitHub repository URL for open source modules (required when isOpenSource is true)
 * - githubRepo: Optional GitHub repository for automatic release syncing (supports owner/repo or full URL format)
 */
export function SubmitModule({ userId }: SubmitModuleProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileRef>(null)
  const [newFeature, setNewFeature] = useState("")
  const [newImage, setNewImage] = useState("")
  const [downloadingImages, setDownloadingImages] = useState(false)
  const [imageDownloadProgress, setImageDownloadProgress] = useState<string | null>(null)
  const [fetchingReleases, setFetchingReleases] = useState(false)
  const [hasGitHubPAT, setHasGitHubPAT] = useState<boolean | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<string>("Loading...")
  const [isInitializing, setIsInitializing] = useState(true)
  const [githubReleases, setGithubReleases] = useState<{
    id: number
    tag: string
    name: string
    body: string
    downloadUrl: string
    size: string
    assets: {
      name: string
      downloadUrl: string
      size: string
      contentType?: string
    }[]
    createdAt: string
    isLatest: boolean
  }[]>([])
  const [selectedRelease, setSelectedRelease] = useState<{
    id: number
    tag: string
    name: string
    body: string
    downloadUrl: string
    size: string
    assets: {
      name: string
      downloadUrl: string
      size: string
      contentType?: string
    }[]
    createdAt: string
    isLatest: boolean
  } | null>(null)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortDescription: "",
      description: "",
      author: "",
      category: "system" as const,
      iconUrl: "",
      license: "",
      customLicense: "",
      isOpenSource: false,
      sourceUrl: "",
      communityUrl: "",
      githubRepo: "",
      features: [],
      androidVersions: [],
      rootMethods: [],
      images: [],
      manualReleaseVersion: "",
      manualReleaseUrl: "",
      manualReleaseChangelog: "",
    },
  })

  const androidVersionOptions = [
    "4.1+", "5.0+", "6.0+", "7.0+", "8.0+", "9.0+", "10+", "11+", "12+", "13+", "14+", "15+", "16+"
  ]

  const rootMethodOptions = [
    { value: "Magisk", label: "Magisk" },
    { value: "KernelSU", label: "KernelSU" },
    { value: "KernelSU-Next", label: "KernelSU-Next" },
  ]

  const categoryOptions = MODULE_CATEGORIES.map(cat => ({
    value: cat.id,
    label: cat.shortLabel,
  }))


  useEffect(() => {
    const initialize = async () => {
      setIsClient(true)

      await new Promise(resolve => setTimeout(resolve, 200))

      setIsInitializing(false)
    }

    initialize()
  }, [])

  useEffect(() => {
    const checkGitHubPAT = async () => {
      if (!userId || !isClient || isInitializing) return

      setLoadingStatus("Checking authentication...")
      await new Promise(resolve => setTimeout(resolve, 300))

      setLoadingStatus("Verifying GitHub access token...")

      try {
        const response = await fetch('/api/settings/github-pat', {
          method: 'GET',
        })
        const data = await response.json()
        setHasGitHubPAT(data.hasToken)

        if (!data.hasToken) {
          setLoadingStatus("GitHub PAT setup required")
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error('Error checking GitHub PAT:', error)
        setHasGitHubPAT(false)
        setLoadingStatus("Error checking GitHub access")
      }
    }

    checkGitHubPAT()
  }, [userId, isClient, isInitializing])

  const fetchGithubReleases = async () => {
    const sourceUrl = form.getValues("sourceUrl")
    if (!sourceUrl) {
      setSubmitError("Please enter a GitHub repository URL")
      return
    }

    const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/
    const match = sourceUrl.match(githubRegex)

    if (!match) {
      setSubmitError("Please enter a valid GitHub repository URL")
      return
    }

    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, "")

    setFetchingReleases(true)
    setSubmitError(null)

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/releases`)

      if (!response.ok) {
        throw new Error("Failed to fetch releases from GitHub")
      }

      const releases = await response.json()

      if (!Array.isArray(releases) || releases.length === 0) {
        throw new Error("No releases found for this repository")
      }

      interface GitHubAsset {
        name: string
        browser_download_url: string
        size: number
        content_type: string
      }

      interface GitHubRelease {
        id: number
        tag_name: string
        name: string | null
        body: string
        assets: GitHubAsset[]
        created_at: string
        zipball_url: string
      }

      const processedReleases = releases.slice(0, 5).map((release: GitHubRelease) => {
        const assets = release.assets?.map((asset) => ({
          name: asset.name,
          downloadUrl: asset.browser_download_url,
          size: `${(asset.size / 1024 / 1024).toFixed(2)} MB`,
          contentType: asset.content_type
        })) || []
        const totalSize = release.assets?.reduce((sum, asset) => sum + asset.size, 0) || 0
        const primaryDownloadUrl = assets[0]?.downloadUrl || release.zipball_url

        return {
          id: release.id,
          tag: release.tag_name,
          name: release.name || release.tag_name,
          body: release.body,
          downloadUrl: primaryDownloadUrl,
          size: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB` : "Unknown",
          assets: assets,
          createdAt: new Date(release.created_at).toLocaleDateString(),
          isLatest: release.tag_name === releases[0].tag_name,
        }
      })

      setGithubReleases(processedReleases)
      if (processedReleases.length > 0) {
        setSelectedRelease(processedReleases[0])
      }
    } catch (error) {
      console.error("Error fetching releases:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to fetch GitHub releases")
      setGithubReleases([])
    } finally {
      setFetchingReleases(false)
    }
  }


  const onSubmit = async (data: FormData) => {
    if (!userId) {
      setSubmitError("You must be logged in to submit a module")
      return
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError("Please complete the captcha verification")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const moduleData = {
        ...data,
        submittedBy: userId,
        icon: data.iconUrl && data.iconUrl.trim() ? data.iconUrl : undefined,
        images: data.images && data.images.length > 0 ? data.images : undefined,
        compatibility: {
          androidVersions: data.androidVersions,
          rootMethods: data.rootMethods,
        },
        license: data.isOpenSource ? data.license : "Proprietary",
      }

      let releaseData = null
      if (data.isOpenSource && selectedRelease) {
        releaseData = {
          version: normalizeVersion(selectedRelease.tag),
          downloadUrl: selectedRelease.downloadUrl,
          size: selectedRelease.size,
          changelog: selectedRelease.body || "",
          githubReleaseId: selectedRelease.id.toString(),
          githubTagName: selectedRelease.tag,
          isLatest: selectedRelease.isLatest,
          assets: selectedRelease.assets,
        }
      } else if (!data.isOpenSource && data.manualReleaseVersion && data.manualReleaseUrl) {
        releaseData = {
          version: normalizeVersion(data.manualReleaseVersion),
          downloadUrl: data.manualReleaseUrl,
          changelog: data.manualReleaseChangelog || "",
          isLatest: true,
        }
      }

      console.log('[Submit] Sending turnstile token:', turnstileToken ? `${turnstileToken.substring(0, 20)}...` : 'none')

      const response = await fetch("/api/modules/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module: moduleData,
          release: releaseData,
          turnstileToken,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Submission error details:", error)
        if (error.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map((e: { field: string; message: string }) => {
            const fieldName = e.field
              .replace('module.', '')
              .replace('release.', '')
              .replace(/\.\d+$/, '')
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace('Icon', 'Icon URL')
              .replace('Images', 'Screenshot URLs')
              .trim()

            let message = e.message
            if (message.includes('select a valid')) {
              if (e.field.includes('license')) {
                message = 'Please select a license from the dropdown. Open source modules require a valid license.'
              } else if (e.field.includes('category')) {
                message = 'Please select a valid category from the dropdown.'
              }
            }

            return `${fieldName}: ${message}`
          }).join('\n')
          throw new Error(errorMessages || error.message || "Failed to submit module")
        }
        throw new Error(error.message || error.error || "Failed to submit module")
      }

      toast.success("Module submitted successfully!", {
        description: `Your module has been submitted for review!`,
        duration: 5000,
      })

      form.reset()
      setTurnstileToken(null)
      turnstileRef.current?.reset()

      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error) {
      console.error("Submit error:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to submit module")
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } finally {
      setIsSubmitting(false)
      setDownloadingImages(false)
      setImageDownloadProgress(null)
    }
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = form.getValues("features")
      form.setValue("features", [...currentFeatures, newFeature.trim()])
      setNewFeature("")
    }
  }

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features")
    form.setValue("features", currentFeatures.filter((_, i) => i !== index))
  }

  const addImage = () => {
    const trimmedImage = newImage.trim()
    if (trimmedImage) {
      if (!/^https?:\/\/.+/.test(trimmedImage)) {
        form.setError("images", { message: "Please enter a valid URL" })
        return
      }
      const currentImages = form.getValues("images") || []
      if (currentImages.length >= 10) {
        form.setError("images", { message: "Maximum 10 screenshots allowed" })
        return
      }
      form.setValue("images", [...currentImages, trimmedImage])
      setNewImage("")
      form.clearErrors("images")
    }
  }

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || []
    form.setValue("images", currentImages.filter((_, i) => i !== index))
  }

  if (!userId) {
    router.push("/")
    return <LoadingState status="Redirecting to sign in..." />
  }

  if (isInitializing || !isClient || hasGitHubPAT === null) {
    return (
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Submit New Module</h1>
        </div>
        <LoadingState status={loadingStatus} />
      </div>
    )
  }

  if (hasGitHubPAT === false) {
    return (
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Submit New Module</h1>
        </div>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-500" />
              GitHub Personal Access Token Required
            </CardTitle>
            <CardDescription>Set up automatic release syncing for your modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To submit modules with automatic GitHub release syncing, you&apos;ll need to set up a GitHub Personal Access Token (PAT) in your settings.
                <br /><br />This allows the system to automatically fetch new releases they are published on GitHub.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What you unlock:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Automatic release detection when published on GitHub</li>
                <li>Higher API rate limits for faster syncing</li>
                <li>No manual release uploads required</li>
              </ul>
            </div>

            <p className="text-sm text-primary">
              You can set up your personal access token in <strong>Settings</strong>.
            </p>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => router.push("/settings")} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Go to Settings
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Submit New Module</h1>
      </div>
      <Card>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <Separator />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Module" {...field} value={field.value as string} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <CharacterCounter maxLength={200} value={field.value as string}>
                          <Textarea
                            placeholder="A brief description of what your module does"
                            className="min-h-[60px]"
                            {...field}
                            value={field.value as string}
                          />
                        </CharacterCounter>
                      </FormControl>
                      <FormDescription>This will be shown in module cards</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <MarkdownEditor
                            value={field.value as string}
                            onChange={(value) => field.onChange(value || "")}
                            placeholder="Detailed description of your module, features, installation instructions, etc."
                            height={400}
                          />
                          <div className="text-sm text-muted-foreground text-right">
                            {(field.value as string)?.length || 0} / 5000 characters
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Use the editor to format your description with Markdown. You can switch between write and preview modes.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name or username" {...field} value={field.value as string} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Required for open source modules</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Visual & Branding</h3>
                <Separator />

                <FormField
                  control={form.control}
                  name="iconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/icon.png" {...field} value={field.value as string} />
                      </FormControl>
                      <FormDescription>
                        Provide a URL to your module&apos;s icon image.
                      </FormDescription>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2">
                          <div className="text-sm text-muted-foreground mb-1">Preview:</div>
                          <div className="flex items-center gap-2 p-2 border rounded-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={field.value}
                              alt="Icon preview"
                              className="w-30 h-30 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling!.textContent = 'Failed to load image';
                              }}
                            />
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto text-primary hover:text-primary/80 mr-4"
                            >
                              <ExternalLink className="h-6 w-6" />
                            </a>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Screenshots (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/screenshot.png"
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addImage()
                        }
                      }}
                    />
                    <Button type="button" onClick={addImage} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {form.watch("images")?.map((image, index) => (
                      <div key={index} className="relative group border rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLDivElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="hidden w-full h-32 items-center justify-center bg-muted text-muted-foreground text-sm">
                          Failed to load image
                        </div>
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a
                            href={image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-background/90 hover:bg-background rounded-full text-foreground border shadow-sm transition-colors"
                            title="View full size"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="p-2 bg-background/90 hover:bg-background rounded-full text-destructive border shadow-sm transition-colors"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {form.watch("images")?.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Add up to 10 screenshots.
                    </div>
                  )}
                  {form.formState.errors.images && (
                    <p className="text-sm text-red-500">{form.formState.errors.images.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Technical Details</h3>
                <Separator />

                <FormField
                  control={form.control}
                  name="isOpenSource"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Open Source
                        </FormLabel>
                        <FormDescription>
                          Is your module open source?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("isOpenSource") && (
                  <>
                    <FormField
                      control={form.control}
                      name="license"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License *</FormLabel>
                          <FormControl>
                            <LicenseCombobox
                              value={field.value as string}
                              onValueChange={(license) => field.onChange(license)}
                              customValue={form.watch("customLicense")}
                              onCustomValueChange={(value) => form.setValue("customLicense", value)}
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customLicense"
                      render={() => (
                        <FormItem className="hidden">
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("isOpenSource") && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="sourceUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub Repository URL</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="https://github.com/user/module" {...field} value={field.value as string} />
                            </FormControl>
                            <Button
                              type="button"
                              onClick={fetchGithubReleases}
                              disabled={fetchingReleases || !field.value}
                            >
                              {fetchingReleases ? "Fetching..." : "Fetch Releases"}
                            </Button>
                          </div>
                          <FormDescription>We&apos;ll automatically fetch releases from your GitHub repository</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {githubReleases.length > 0 && (
                      <div className="space-y-2">
                        <FormLabel>Available Releases</FormLabel>
                        <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                          {githubReleases.map((release) => (
                            <div
                              key={release.id}
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                selectedRelease?.id === release.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                              }`}
                              onClick={() => setSelectedRelease(release)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{release.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {release.tag} • {release.size} • {release.createdAt}
                                  </div>
                                  {release.assets.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {release.assets.length} file{release.assets.length > 1 ? 's' : ''}: {release.assets.map(a => a.name).join(', ')}
                                    </div>
                                  )}
                                </div>
                                {release.isLatest && (
                                  <Badge variant="secondary">Latest</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedRelease && (
                          <Alert>
                            <Check className="h-4 w-4" />
                            <AlertDescription>
                              <div>Selected release: <strong>{selectedRelease.name}</strong> ({selectedRelease.tag})</div>
                              {selectedRelease.assets.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm font-medium">Files included:</div>
                                  <ul className="text-sm mt-1 space-y-1">
                                    {selectedRelease.assets.map((asset, idx) => (
                                      <li key={idx} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{asset.name}</span>
                                        <span className="text-muted-foreground">({asset.size})</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="communityUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Community URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://t.me/modulegroup" {...field} value={field.value as string} />
                      </FormControl>
                      <FormDescription>Telegram, Discord, Reddit, XDA forum, etc.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="githubRepo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub Repository (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="owner/repo or https://github.com/owner/repo" {...field} value={field.value as string} />
                      </FormControl>
                      <FormDescription>
                        Enable automatic release syncing by providing your GitHub repository. 
                        We&apos;ll automatically fetch new releases when you publish them on GitHub.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Compatibility</h3>
                <Separator />

                <FormField
                  control={form.control}
                  name="androidVersions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Android Versions</FormLabel>
                      <div className="grid grid-cols-4 gap-3">
                        {androidVersionOptions.map((version) => (
                          <div key={version} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(field.value as string[])?.includes(version)}
                              onCheckedChange={(checked) => {
                                const updatedVersions = checked
                                  ? [...((field.value as string[]) || []), version]
                                  : (field.value as string[])?.filter((v: string) => v !== version) || []
                                field.onChange(updatedVersions)
                              }}
                            />
                            <label className="text-sm">{version}</label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rootMethods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Root Methods</FormLabel>
                      <div className="flex gap-4">
                        {rootMethodOptions.map((method) => (
                          <div key={method.value} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(field.value as ("Magisk" | "KernelSU" | "KernelSU-Next")[])?.includes(method.value as "Magisk" | "KernelSU" | "KernelSU-Next")}
                              onCheckedChange={(checked) => {
                                const updatedMethods = checked
                                  ? [...((field.value as ("Magisk" | "KernelSU" | "KernelSU-Next")[]) || []), method.value as "Magisk" | "KernelSU" | "KernelSU-Next"]
                                  : (field.value as ("Magisk" | "KernelSU" | "KernelSU-Next")[])?.filter((m: string) => m !== method.value) || []
                                field.onChange(updatedMethods)
                              }}
                            />
                            <label className="text-sm">{method.label}</label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Features</h3>
                <Separator />

                <div className="space-y-2">
                  <FormLabel>Module Features</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a feature (e.g., 'Battery optimization')"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addFeature()
                        }
                      }}
                    />
                    <Button type="button" onClick={addFeature} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch("features").map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0"
                          onClick={() => removeFeature(index)}
                        >
                          <X />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  {form.formState.errors.features && (
                    <p className="text-sm text-red-500">{form.formState.errors.features.message}</p>
                  )}
                </div>
              </div>

              {!form.watch("isOpenSource") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Release Information</h3>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="manualReleaseVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version *</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0.0" {...field} value={field.value as string} />
                        </FormControl>
                        <FormDescription>Semantic version (e.g., 1.0.0, 2.1.3-beta)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manualReleaseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Download URL *</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/module.zip" {...field} value={field.value as string} />
                        </FormControl>
                        <FormDescription>Direct download link to your module file (max 100MB)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manualReleaseChangelog"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Changelog (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What's new in this version..."
                            className="min-h-[100px]"
                            {...field}
                            value={field.value as string}
                          />
                        </FormControl>
                        <FormDescription>Describe what&apos;s new in this release</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      File size will be automatically determined from your download URL. Maximum file size is 100MB.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {imageDownloadProgress && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{imageDownloadProgress}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Security Verification</h3>
                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Complete the verification below</label>
                  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => {
                        setTurnstileToken(token)
                        setSubmitError(null)
                      }}
                      onError={(error) => {
                        console.error("Turnstile error:", error)
                        setTurnstileToken(null)
                        setSubmitError("Captcha verification failed. Please try again.")
                      }}
                      onExpire={() => {
                        setTurnstileToken(null)
                        setSubmitError("Captcha has expired. Please verify again.")
                      }}
                      theme="auto"
                      size="normal"
                    />
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Captcha verification is not configured. Please contact the administrator.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="whitespace-pre-line">{submitError}</AlertDescription>
                </Alert>
              )}

              {Object.keys(form.formState.errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please fix the following errors before submitting:
                    <ul className="list-disc list-inside mt-2">
                      {Object.entries(form.formState.errors).map(([field, error]) => (
                        <li key={field}>{error?.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Your module will be reviewed before being published</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || downloadingImages || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}>
                    {downloadingImages ? "Downloading images..." : isSubmitting ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}