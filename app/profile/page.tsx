import type { Metadata } from "next"
import { ProfilePageClient } from "@/components/pages/profile-page-client"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile information.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProfilePage() {
  return <ProfilePageClient />
}