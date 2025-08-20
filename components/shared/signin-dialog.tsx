"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { SiGithub } from "react-icons/si"
import {
  signInGithub,
  signInGoogle,
  signInEmail,
  signUpEmail,
  requestPasswordReset
} from "@/lib/auth-client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"

interface SigninDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>
type ResetFormData = z.infer<typeof resetSchema>

export function SigninDialog({ open, onOpenChange, trigger }: SigninDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  const [showReset, setShowReset] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  })

  const handleGithubSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      setIsLoading('github')
      await signInGithub()
    } catch (error) {
      console.error('[!] GitHub sign in error:', error)
      toast.error('Failed to sign in with GitHub. Please try again.')
      setIsLoading(null)
    }
  }

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      setIsLoading('google')
      await signInGoogle()
    } catch (error) {
      console.error('[!] Google sign in error:', error)
      toast.error('Failed to sign in with Google. Please try again.')
      setIsLoading(null)
    }
  }

  const onSignIn = async (data: SignInFormData) => {
    try {
      setIsLoading('email-signin')
      const result = await signInEmail({
        email: data.email,
        password: data.password,
      })

      if (result.error) {
        const errorMessage = result.error.message || "Invalid email or password"
        signInForm.setError("root", {
          message: errorMessage
        })
        toast.error(errorMessage)
      } else {
        toast.success('Successfully signed in!')
        onOpenChange(false)
        window.location.reload()
      }
    } catch {
      const errorMessage = "An error occurred. Please try again."
      signInForm.setError("root", {
        message: errorMessage
      })
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  const onSignUp = async (data: SignUpFormData) => {
    try {
      setIsLoading('email-signup')
      const result = await signUpEmail({
        name: data.name,
        email: data.email,
        password: data.password,
      })

      if (result.error) {
        const errorMessage = result.error.message || "Failed to create account"
        signUpForm.setError("root", {
          message: errorMessage
        })
        toast.error(errorMessage)
      } else {
        toast.success('Account created successfully!')
        onOpenChange(false)
        window.location.reload()
      }
    } catch {
      const errorMessage = "An error occurred. Please try again."
      signUpForm.setError("root", {
        message: errorMessage
      })
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  const onReset = async (data: ResetFormData) => {
    try {
      setIsLoading('reset')
      const result = await requestPasswordReset({
        email: data.email,
      })

      if (result.error) {
        const errorMessage = result.error.message || "Failed to send reset email"
        resetForm.setError("root", {
          message: errorMessage
        })
        toast.error(errorMessage)
      } else {
        toast.success('Password reset email sent! Check your inbox.')
        setResetSuccess(true)
      }
    } catch {
      const errorMessage = "An error occurred. Please try again."
      resetForm.setError("root", {
        message: errorMessage
      })
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  if (showReset) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a password reset link to your email address. Please check your inbox.
              </p>
              <Button
                onClick={() => {
                  setShowReset(false)
                  setResetSuccess(false)
                  resetForm.reset()
                }}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4 py-4">
                <FormField
                  control={resetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          disabled={isLoading === 'reset'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {resetForm.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.root.message}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowReset(false)
                      resetForm.reset()
                    }}
                    disabled={isLoading === 'reset'}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading === 'reset'}
                    className="flex-1"
                  >
                    {isLoading === 'reset' ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Welcome</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div className="flex gap-2">
              <Button
                className="flex-1 h-9"
                size="sm"
                variant="outline"
                onClick={handleGithubSignIn}
                disabled={isLoading !== null}
                type="button"
              >
                <SiGithub className="size-4" />
                GitHub
              </Button>
              <Button
                className="flex-1 h-9"
                size="sm"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading !== null}
                type="button"
              >
                <svg className="size-4 pointer-events-none" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your password"
                          type="password"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {signInForm.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading !== null}
                >
                  {isLoading === 'email-signin' ? 'Signing in...' : 'Sign In'}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setShowReset(true)}
                >
                  Forgot your password?
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Create a password (min 8 characters)"
                          type="password"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Confirm your password"
                          type="password"
                          disabled={isLoading !== null}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {signUpForm.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading !== null}
                >
                  {isLoading === 'email-signup' ? 'Creating account...' : 'Sign Up'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}