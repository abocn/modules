import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail, sendVerificationEmail, isEmailConfigured } from "./email";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      if (isEmailConfigured()) {
        try {
          await sendPasswordResetEmail(user.email, url);
        } catch (error) {
          console.error("Failed to send password reset email:", error);
        }
      } else {
        console.warn("Email service not configured - password reset email not sent");
      }
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
    resetPasswordTokenExpiresIn: 3600,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (isEmailConfigured()) {
        try {
          await sendVerificationEmail(user.email, url);
        } catch (error) {
          console.error("Failed to send verification email:", error);
        }
      } else {
        console.warn("Email service not configured - verification email not sent");
      }
    },
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    updateAge: 24 * 60 * 60,
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 * 1000,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
    },
  },
});