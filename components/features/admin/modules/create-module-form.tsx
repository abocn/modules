"use client"

import { useState } from "react"
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
import { Info, Plus, X, AlertTriangle, ExternalLink, Check } from "lucide-react"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { CATEGORIES, ANDROID_VERSIONS } from "@/lib/validations/module"
import { toast } from "sonner"

/**
 * @constant formSchema
 * @description Zod schema for module creation form validation
 * @type {z.ZodObject}
 */
const formSchema = z.object({
  name: z.string().min(3, "Module name must be at least 3 characters").max(80, "Module name must be less than 80 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters").max(140, "Short description must be less than 140 characters"),
  description: z.string().min(30, "Description must be at least 30 characters").max(8000, "Description must be less than 8000 characters"),
  author: z.string().min(2, "Author name must be at least 2 characters").max(60, "Author name must be less than 60 characters"),
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
  isFeatured: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
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
 * @description Type definition for the module creation form data
 */
type FormData = z.infer<typeof formSchema>

/**
 * @component CreateModuleForm
 * @description A form component for creating new modules with support for custom licenses and GitHub integration
 * @returns {JSX.Element} The rendered module creation form
 *
 * @example
 * ```tsx
 * <CreateModuleForm />
 * ```
 *
 * @features
 * - Basic module information input
 * - Category and licensing selection with custom license support
 * - Open source integration with GitHub releases
 * - Dual GitHub repository inputs for source code and release syncing
 * - Android compatibility and root method selection
 * - Feature and image management
 * - Release information for non-open source modules
 * - Validation with Zod schema
 *
 * @githubInputs
 * - sourceUrl: GitHub repository URL for open source modules (required when isOpenSource is true)
 * - githubRepo: Optional GitHub repository for automatic release syncing (supports owner/repo or full URL format)
 */
export function CreateModuleForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newFeature, setNewFeature] = useState("")
  const [newImage, setNewImage] = useState("")
  const [fetchingReleases, setFetchingReleases] = useState(false)
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
      license: "GPL-3.0",
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

  const androidVersionOptions = ANDROID_VERSIONS

  const rootMethodOptions = [
    { value: "Magisk", label: "Magisk" },
    { value: "KernelSU", label: "KernelSU" },
    { value: "KernelSU-Next", label: "KernelSU-Next" },
  ]

  const categoryOptions = MODULE_CATEGORIES.map(cat => ({
    value: cat.id,
    label: cat.shortLabel,
  }))


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

  /**
   * @function onSubmit
   * @description Handles form submission for module creation
   * @param {FormData} data - The validated form data
   * @returns {Promise<void>}
   */
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { androidVersions, rootMethods, iconUrl, customLicense, ...restData } = data

      const processedLicense = data.license === "Custom" && customLicense 
        ? `Custom: ${customLicense.trim()}`
        : data.license

      const moduleData = {
        ...restData,
        license: processedLicense,
        icon: iconUrl || undefined,
        compatibility: {
          androidVersions,
          rootMethods,
        },
        isPublished: false,
        status: "pending",
        isFeatured: data.isFeatured || false,
        isRecommended: data.isRecommended || false,
      }

      const response = await fetch("/api/admin/modules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moduleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create module")
      }

      await response.json()
      toast.success(`Module "${data.name}" created successfully`)
      router.push("/admin/modules")
    } catch (error) {
      console.error("Create error:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to create module")
    } finally {
      setIsSubmitting(false)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Details</CardTitle>
        <CardDescription>Fill out the form below to create a new module</CardDescription>
      </CardHeader>
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
                      <Input placeholder="My Awesome Module" {...field} />
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
                      <CharacterCounter maxLength={140} value={field.value}>
                        <Textarea
                          placeholder="A brief description of what your module does"
                          className="min-h-[60px]"
                          {...field}
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
                          value={field.value}
                          onChange={(value) => field.onChange(value || "")}
                          placeholder="Detailed description of your module, features, installation instructions, etc."
                          height={400}
                        />
                        <div className="text-sm text-muted-foreground text-right">
                          {field.value?.length || 0} / 8000 characters
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
                        <Input placeholder="Your name or username" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Icon URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/icon.png" {...field} />
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
                            className="w-8 h-8 object-cover rounded"
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
                            className="ml-auto text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-4 w-4" />
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
                        checked={field.value}
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
                            value={field.value}
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
                        <FormLabel>GitHub Repository URL *</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="https://github.com/user/module" {...field} />
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
                      <Input placeholder="https://t.me/modulegroup" {...field} />
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
                      <Input placeholder="owner/repo or https://github.com/owner/repo" {...field} />
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
                            checked={field.value?.includes(version)}
                            onCheckedChange={(checked) => {
                              const updatedVersions = checked
                                ? [...(field.value || []), version]
                                : field.value?.filter((v: string) => v !== version) || []
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
                            checked={field.value?.includes(method.value as "Magisk" | "KernelSU" | "KernelSU-Next")}
                            onCheckedChange={(checked) => {
                              const updatedMethods = checked
                                ? [...(field.value || []), method.value as "Magisk" | "KernelSU" | "KernelSU-Next"]
                                : field.value?.filter((m: string) => m !== method.value) || []
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
                        <Input placeholder="1.0.0" {...field} />
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
                        <Input placeholder="https://example.com/module.zip" {...field} />
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
                        <div className="space-y-2">
                          <MarkdownEditor
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value || "")}
                            placeholder="What's new in this version..."
                            height={200}
                          />
                          <div className="text-sm text-muted-foreground text-right">
                            {field.value?.length || 0} / 2000 characters
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Describe what&apos;s new in this release using Markdown formatting</FormDescription>
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Admin Settings</h3>
              <Separator />

              <div className="flex items-center space-x-6">
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Featured</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRecommended"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Recommended</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Module will be created in pending status</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/modules")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Module"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}