"use client"

import { useState, useRef } from "react"
import { Upload, X, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ProfilePictureUploadProps {
  currentImage?: string | null
  userName?: string | null
  onUploadComplete?: () => void
}

export function ProfilePictureUpload({
  currentImage,
  userName,
  onUploadComplete
}: ProfilePictureUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = () => {
    if (!userName) return 'U'
    return userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('avatar', selectedFile)

    try {
      const response = await fetch('/api/settings/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload avatar')
      }

      toast.success("Profile picture updated successfully")
      setIsOpen(false)
      setPreviewUrl(null)
      setSelectedFile(null)

      await authClient.getSession({
        query: {
          disableCookieCache: true
        }
      })

      if (onUploadComplete) {
        onUploadComplete()
      }

      window.location.reload()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error(error instanceof Error ? error.message : "Failed to upload profile picture")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    setIsUploading(true)

    try {
      const response = await fetch('/api/settings/avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove avatar')
      }

      toast.success("Profile picture removed successfully")
      setIsOpen(false)

      await authClient.getSession({
        query: {
          disableCookieCache: true
        }
      })

      if (onUploadComplete) {
        onUploadComplete()
      }

      window.location.reload()
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast.error(error instanceof Error ? error.message : "Failed to remove profile picture")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          <Avatar className="w-16 h-16">
            {currentImage && <AvatarImage src={currentImage} alt={userName || "User"} />}
            <AvatarFallback className="text-lg font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="w-32 h-32">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="Preview" />
              ) : currentImage ? (
                <AvatarImage src={currentImage} alt={userName || "User"} />
              ) : (
                <AvatarFallback className="text-3xl">
                  {getInitials()}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {!previewUrl && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                Choose Image
              </Button>
              {currentImage && (
                <Button
                  onClick={handleRemove}
                  className="w-full"
                  variant="destructive"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                  Remove Current Picture
                </Button>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  className="flex-1"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Image will be resized to 256x256 pixels
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}