import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendTestEmail, isEmailConfigured } from "@/lib/email";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * @openapi
 * POST /api/admin/jobs/test-email
 * @description Send a test email to verify email configuration (Admin only)
 * @security BearerAuth
 * @requestBody
 * {
 *   "email": "string - Email address to send test email to"
 * }
 * @responses
 * 200:
 *   description: Test email sent successfully
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           success:
 *             type: boolean
 *           message:
 *             type: string
 *           messageId:
 *             type: string
 * 400:
 *   description: Invalid request or email not configured
 * 401:
 *   description: Unauthorized - Not authenticated
 * 403:
 *   description: Forbidden - Not an admin
 * 500:
 *   description: Failed to send email
 */

const testEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Email service not configured",
          details: "Missing MAILGUN_API_KEY or MAILGUN_DOMAIN environment variables"
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = testEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    const result = await sendTestEmail(email);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      messageId: result.id,
    });

  } catch (error) {
    console.error("Failed to send test email:", error);

    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}