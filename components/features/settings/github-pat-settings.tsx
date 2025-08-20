"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSession } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Eye, EyeOff, ChevronDown, ChevronRight, Shield, Trash2, Check } from "lucide-react"
import { SiGithub as Github } from "react-icons/si"

const githubPATSchema = z.object({
  token: z.string()
    .min(1, "GitHub PAT is required")
    .regex(/^gh[pso]_[a-zA-Z0-9]{36,251}$/, "Please enter a valid GitHub Personal Access Token")
})

type GitHubPATForm = z.infer<typeof githubPATSchema>

export function GitHubPATSettings() {
  const { data: session } = useSession()
  const [showToken, setShowToken] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GitHubPATForm>({
    resolver: zodResolver(githubPATSchema)
  })

  useEffect(() => {
    const checkExistingToken = async () => {
      try {
        const response = await fetch('/api/settings/github-pat', {
          method: 'GET',
        })
        const data = await response.json()
        setHasToken(data.hasToken)
      } catch (error) {
        console.error('Error checking GitHub PAT:', error)
      }
    }

    if (session?.user) {
      checkExistingToken()
    }
  }, [session])

  const onSubmit = async (data: GitHubPATForm) => {
    setIsLoading(true)
    setIsValidating(true)

    try {
      const validateResponse = await fetch('/api/settings/github-pat/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: data.token }),
      })

      if (!validateResponse.ok) {
        const error = await validateResponse.json()
        throw new Error(error.message || 'Failed to validate GitHub PAT')
      }

      setIsValidating(false)

      const saveResponse = await fetch('/api/settings/github-pat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: data.token }),
      })

      if (!saveResponse.ok) {
        const error = await saveResponse.json()
        throw new Error(error.message || 'Failed to save GitHub PAT')
      }

      setHasToken(true)
      reset()
      toast.success('GitHub PAT saved successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save GitHub PAT')
    } finally {
      setIsLoading(false)
      setIsValidating(false)
    }
  }

  const removeToken = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/settings/github-pat', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove GitHub PAT')
      }

      setHasToken(false)
      toast.success('GitHub PAT removed successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove GitHub PAT')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Personal Access Token
          </CardTitle>
          <CardDescription>
            Set up your GitHub PAT to enable automatic release syncing for your modules.
            This allows us to fetch releases from your GitHub repositories with higher rate limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasToken ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 max-w-md">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    GitHub PAT
                  </span>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Active
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={removeToken}
                  disabled={isLoading}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove PAT
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your GitHub personal access token will be hashed and salted before storage.
                  <span className="font-bold">We recommend creating a PAT with minimal permissions because no scopes are required for public repositories.</span>
                </AlertDescription>
              </Alert>

              <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto font-normal">
                    {showInstructions ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    How to create a GitHub Personal Access Token
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Settings → Developer settings → Personal access tokens</a></li>
                    <li>Click &quot;Generate new token&quot; → &quot;Generate new token (classic)&quot;</li>
                    <li>Give it a descriptive name (e.g., &quot;Modules Release Sync&quot;)</li>
                    <li><strong>Important:</strong> For public repositories, you don&apos;t need to select any scopes/permissions</li>
                    <li>For private repositories, select only the &quot;repo&quot; scope if needed</li>
                    <li>Set an appropriate expiration date</li>
                    <li>Click &quot;Generate token&quot; and copy the token immediately</li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-2">
                <Label htmlFor="token">GitHub Personal Access Token</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? "text" : "password"}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    {...register("token")}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.token && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.token.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isLoading || isValidating}>
                {isValidating ? (
                  "Validating token..."
                ) : isLoading ? (
                  "Saving..."
                ) : (
                  "Save GitHub PAT"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}