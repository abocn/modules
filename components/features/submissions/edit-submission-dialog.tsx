"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LicenseCombobox } from "@/components/ui/license-combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Plus, X, AlertTriangle } from "lucide-react"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"

/**
 * @interface Submission
 * @description Represents a module submission with all its properties
 * @property {string} id - Unique identifier for the submission
 * @property {string} name - Name of the module
 * @property {string} shortDescription - Brief description of the module
 * @property {string} description - Detailed description of the module
 * @property {string} author - Author of the module
 * @property {string} category - Category of the module
 * @property {string} [icon] - Optional icon URL
 * @property {boolean} isPublished - Whether the module is published
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 * @property {"pending" | "approved" | "rejected" | "changes_requested"} [reviewStatus] - Review status
 * @property {Array} [reviewNotes] - Array of review notes
 * @property {string} [reviewedAt] - Review timestamp
 * @property {string} [reviewedBy] - Reviewer identifier
 * @property {Object} compatibility - Android and root method compatibility
 * @property {string[]} features - Array of module features
 * @property {boolean} isOpenSource - Whether the module is open source
 * @property {string} [sourceUrl] - Source code URL
 * @property {string} [communityUrl] - Community/support URL
 * @property {string[]} [images] - Array of screenshot URLs
 */
interface Submission {
  id: string
  name: string
  shortDescription: string
  description: string
  author: string
  category: string
  icon?: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
  reviewStatus?: "pending" | "approved" | "rejected" | "changes_requested"
  reviewNotes?: {
    type: "approved" | "rejected" | "changes-requested"
    message: string
    reviewedBy?: string
    reviewedAt?: string
  }[]
  reviewedAt?: string
  reviewedBy?: string
  compatibility: {
    androidVersions: string[]
    rootMethods: ("Magisk" | "KernelSU" | "KernelSU-Next")[]
  }
  features: string[]
  isOpenSource: boolean
  sourceUrl?: string
  communityUrl?: string
  images?: string[]
  license: string
}

/**
 * @interface EditSubmissionDialogProps
 * @description Props for the EditSubmissionDialog component
 * @property {Submission} submission - The submission data to edit
 * @property {boolean} open - Whether the dialog is open
 * @property {() => void} onClose - Callback to close the dialog
 * @property {(data: Partial<Submission>) => Promise<void>} onSave - Callback to save changes
 */
interface EditSubmissionDialogProps {
  submission: Submission
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Submission>) => Promise<void>
}

/**
 * @component EditSubmissionDialog
 * @description A dialog component for editing module submissions with custom license support
 * @param {EditSubmissionDialogProps} props - The component props
 * @returns {JSX.Element} The rendered edit submission dialog
 *
 * @example
 * ```tsx
 * <EditSubmissionDialog
 *   submission={submissionData}
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSave={handleSave}
 * />
 * ```
 */
export function EditSubmissionDialog({ submission, open, onClose, onSave }: EditSubmissionDialogProps) {
  const parseLicense = (license: string) => {
    if (license?.startsWith("Custom: ")) {
      return {
        license: "Custom",
        customLicense: license.replace("Custom: ", "")
      }
    }
    return {
      license: license || "",
      customLicense: ""
    }
  }

  const { license: parsedLicense, customLicense: parsedCustomLicense } = parseLicense(submission.license)

  const [formData, setFormData] = useState({
    name: submission.name,
    shortDescription: submission.shortDescription,
    description: submission.description,
    author: submission.author,
    category: submission.category,
    iconUrl: submission.icon || "",
    license: parsedLicense,
    customLicense: parsedCustomLicense,
    isOpenSource: submission.isOpenSource,
    sourceUrl: submission.sourceUrl || "",
    communityUrl: submission.communityUrl || "",
    features: submission.features || [],
    androidVersions: submission.compatibility?.androidVersions || [],
    rootMethods: submission.compatibility?.rootMethods || [],
    images: submission.images || [],
  })

  const [newFeature, setNewFeature] = useState("")
  const [newImage, setNewImage] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    label: cat.label,
  }))

  const addFeature = () => {
    if (newFeature.trim() && formData.features.length < 20) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] })
      setNewFeature("")
    }
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    })
  }

  const addImage = () => {
    if (newImage.trim() && /^https?:\/\/.+/.test(newImage.trim()) && formData.images.length < 10) {
      setFormData({ ...formData, images: [...formData.images, newImage.trim()] })
      setNewImage("")
    }
  }

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    })
  }

  /**
   * @function handleSave
   * @description Handles saving the edited submission with custom license processing
   * @returns {Promise<void>}
   */
  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const processedLicense = formData.license === "Custom" && formData.customLicense 
        ? `Custom: ${formData.customLicense.trim()}`
        : formData.license

      await onSave({
        ...formData,
        license: processedLicense,
        icon: formData.iconUrl,
        compatibility: {
          androidVersions: formData.androidVersions,
          rootMethods: formData.rootMethods,
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Module Submission</DialogTitle>
          <DialogDescription>
            Update your module details. Changes will be reviewed before being published.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="name">Module Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Module"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <CharacterCounter maxLength={200} value={formData.shortDescription}>
                  <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="A brief description of your module"
                    className="min-h-[60px]"
                  />
                </CharacterCounter>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <MarkdownEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value || "" })}
                  placeholder="Detailed description of your module"
                  height={300}
                />
                <div className="text-sm text-muted-foreground text-right">
                  {formData.description.length} / 5000 characters
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Your name or username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Visual & Branding</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  value={formData.iconUrl}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <div className="space-y-2">
                <Label>Screenshots</Label>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.images.map((image, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      <span className="max-w-[200px] truncate">{image}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-4 w-4 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Technical Details</h3>
              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOpenSource"
                  checked={formData.isOpenSource}
                  onCheckedChange={(checked) => setFormData({ ...formData, isOpenSource: checked as boolean })}
                />
                <Label htmlFor="isOpenSource">Open Source</Label>
              </div>

              {formData.isOpenSource && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="license">License</Label>
                    <LicenseCombobox
                      value={formData.license}
                      onValueChange={(license) => setFormData({ ...formData, license })}
                      customValue={formData.customLicense}
                      onCustomValueChange={(value) => setFormData({ ...formData, customLicense: value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceUrl">Source URL</Label>
                    <Input
                      id="sourceUrl"
                      value={formData.sourceUrl}
                      onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                      placeholder="https://github.com/user/module"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="communityUrl">Community URL (Optional)</Label>
                <Input
                  id="communityUrl"
                  value={formData.communityUrl}
                  onChange={(e) => setFormData({ ...formData, communityUrl: e.target.value })}
                  placeholder="https://t.me/modulegroup"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Compatibility</h3>
              <Separator />

              <div className="space-y-2">
                <Label>Android Versions</Label>
                <div className="grid grid-cols-4 gap-3">
                  {androidVersionOptions.map((version) => (
                    <div key={version} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.androidVersions.includes(version)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              androidVersions: [...formData.androidVersions, version]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              androidVersions: formData.androidVersions.filter(v => v !== version)
                            })
                          }
                        }}
                      />
                      <label className="text-sm">{version}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Root Methods</Label>
                <div className="flex gap-4">
                  {rootMethodOptions.map((method) => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.rootMethods.includes(method.value as "Magisk" | "KernelSU" | "KernelSU-Next")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              rootMethods: [...formData.rootMethods, method.value as "Magisk" | "KernelSU" | "KernelSU-Next"]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              rootMethods: formData.rootMethods.filter(m => m !== method.value)
                            })
                          }
                        }}
                      />
                      <label className="text-sm">{method.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <Separator />

              <div className="space-y-2">
                <Label>Module Features</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a feature"
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
                  {formData.features.map((feature, index) => (
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
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}