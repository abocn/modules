import type { Metadata } from "next"
import { SettingsPageClient } from "@/components/pages/settings-page-client"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SettingsPage() {
  return <SettingsPageClient />
}