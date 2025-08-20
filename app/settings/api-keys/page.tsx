import type { Metadata } from "next"
import { ApiKeysSettings } from "@/components/features/settings/api-keys-settings"

export const metadata: Metadata = {
  title: "API Keys - Settings",
  description: "Manage your API keys for programmatic access",
}

export default function ApiKeysPage() {
  return <ApiKeysSettings />
}