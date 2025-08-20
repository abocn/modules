"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarIcon, Copy, Plus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: () => void
  users?: { id: string; name: string; email: string }[]
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onKeyCreated,
  users = []
}: CreateApiKeyDialogProps) {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState("")
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<string[]>(["read"])
  const [expiresAt, setExpiresAt] = useState<Date | undefined>()
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleCreate = async () => {
    if (!userId || !name) {
      toast.error("Please select a user and enter a key name")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/api-keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          scopes,
          expiresAt: expiresAt?.toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create API key")
      }

      const data = await response.json()
      setCreatedKey(data.apiKey.key)
      setShowSuccess(true)
      toast.success("API key created successfully")
      onKeyCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      toast.success("API key copied to clipboard")
    } catch {
      toast.error("Failed to copy API key")
    }
  }

  const handleClose = () => {
    setUserId("")
    setName("")
    setScopes(["read"])
    setExpiresAt(undefined)
    setCreatedKey(null)
    setShowSuccess(false)
    onOpenChange(false)
  }

  const handleScopeToggle = (scope: string, checked: boolean) => {
    if (checked) {
      setScopes([...scopes, scope])
    } else {
      setScopes(scopes.filter(s => s !== scope))
    }
  }

  if (showSuccess && createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Save this API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Important: Save this API key
                  </p>
                  <p className="text-green-800 dark:text-green-200">
                    This is the only time you&apos;ll see the full API key. Store it securely.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted p-3 rounded-md text-sm font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for a user. The key will only be shown once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">User *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Key Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Production API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="read"
                  checked={scopes.includes("read")}
                  onCheckedChange={(checked) => handleScopeToggle("read", !!checked)}
                />
                <label
                  htmlFor="read"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Read Access
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="write"
                  checked={scopes.includes("write")}
                  onCheckedChange={(checked) => handleScopeToggle("write", !!checked)}
                />
                <label
                  htmlFor="write"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Write Access
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin"
                  checked={scopes.includes("admin")}
                  onCheckedChange={(checked) => handleScopeToggle("admin", !!checked)}
                />
                <label
                  htmlFor="admin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Admin Access
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP") : "No expiration"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !userId || !name || scopes.length === 0}>
            {loading ? (
              <>
                <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}