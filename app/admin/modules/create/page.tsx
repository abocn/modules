import type { Metadata } from "next"
import { CreateModulePageClient } from "@/components/pages/admin/create-module-page-client"

export const metadata: Metadata = {
  title: "Create Module",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CreateModulePage() {
  return <CreateModulePageClient />
}