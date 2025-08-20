import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (process.env.NODE_ENV === 'test') {
    return "http://localhost:3000"
  }
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: getBaseURL()
})

export const { useSession, signIn, signUp } = authClient

/**
 * Sign in with GitHub OAuth provider
 * @openapi
 * POST /api/auth/sign-in/social
 * @description Sign in using GitHub OAuth
 * @param {"github"} provider - OAuth provider
 * @param {string} callbackURL - URL to redirect after authentication
 */
export const signInGithub = async () => {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/"
  })
}

/**
 * Sign in with Google OAuth provider
 * @openapi
 * POST /api/auth/sign-in/social
 * @description Sign in using Google OAuth
 * @param {"google"} provider - OAuth provider
 * @param {string} callbackURL - URL to redirect after authentication
 */
export const signInGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/"
  })
}

/**
 * Sign up with email and password
 * @openapi
 * POST /api/auth/sign-up/email
 * @description Create a new user account with email and password
 * @param {string} email - User email address
 * @param {string} password - User password (min 8 chars, max 128 chars)
 * @param {string} name - User display name
 * @param {string} [image] - Optional profile image URL
 * @param {string} [callbackURL] - Optional redirect URL after signup
 * @returns {Promise<{data: any, error: any}>} User data or error
 */
export const signUpEmail = async ({
  email,
  password,
  name,
  image,
  callbackURL = "/"
}: {
  email: string
  password: string
  name: string
  image?: string
  callbackURL?: string
}) => {
  return await authClient.signUp.email({
    email,
    password,
    name,
    image,
    callbackURL
  })
}

/**
 * Sign in with email and password
 * @openapi
 * POST /api/auth/sign-in/email
 * @description Authenticate user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @param {boolean} [rememberMe=true] - Keep user signed in when browser closes
 * @param {string} [callbackURL] - Optional redirect URL after signin
 * @returns {Promise<{data: any, error: any}>} Session data or error
 */
export const signInEmail = async ({
  email,
  password,
  rememberMe = true,
  callbackURL = "/"
}: {
  email: string
  password: string
  rememberMe?: boolean
  callbackURL?: string
}) => {
  return await authClient.signIn.email({
    email,
    password,
    rememberMe,
    callbackURL
  })
}

/**
 * Request password reset
 * @openapi
 * POST /api/auth/request-password-reset
 * @description Send password reset email to user
 * @param {string} email - Email address to send reset link
 * @param {string} [redirectTo] - URL to redirect with reset token
 * @returns {Promise<{data: any, error: any}>} Success or error
 */
export const requestPasswordReset = async ({
  email,
  redirectTo = "/reset-password"
}: {
  email: string
  redirectTo?: string
}) => {
  return await authClient.forgetPassword({
    email,
    redirectTo
  })
}

/**
 * Reset password with token
 * @openapi
 * POST /api/auth/reset-password
 * @description Reset user password using valid token
 * @param {string} newPassword - New password to set
 * @param {string} token - Valid reset token from email
 * @returns {Promise<{data: any, error: any}>} Success or error
 */
export const resetPassword = async ({
  newPassword,
  token
}: {
  newPassword: string
  token: string
}) => {
  return await authClient.resetPassword({
    newPassword,
    token
  })
}

/**
 * Sign out current user
 * @openapi
 * POST /api/auth/sign-out
 * @description End current user session
 * @returns {Promise<void>}
 */
export const signOut = async (options?: { fetchOptions?: { onSuccess?: () => void; onError?: (error: unknown) => void } }) => {
  return await authClient.signOut(options)
}

/**
 * Get current session
 * @openapi
 * GET /api/auth/session
 * @description Retrieve current user session
 * @returns {Promise<any>} Session data
 */
export const getSession = async () => {
  const data = await authClient.getSession()
  return data
}