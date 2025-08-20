import { CATEGORIES } from "@/lib/validations/module"

export const MODULE_CATEGORIES = [
  { id: "security", label: "Security & Privacy", shortLabel: "Security" },
  { id: "performance", label: "Performance", shortLabel: "Performance" },
  { id: "ui", label: "UI & Theming", shortLabel: "UI/UX" },
  { id: "system", label: "System Tweaks", shortLabel: "System" },
  { id: "media", label: "Media & Audio", shortLabel: "Media" },
  { id: "development", label: "Development", shortLabel: "Development" },
  { id: "gaming", label: "Gaming", shortLabel: "Gaming" },
  { id: "miscellaneous", label: "Miscellaneous", shortLabel: "Misc" },
] as const

export type ModuleCategoryId = typeof MODULE_CATEGORIES[number]["id"]

export const CATEGORY_IDS = CATEGORIES
export const CATEGORY_LABELS = MODULE_CATEGORIES.map(cat => cat.label)
export const CATEGORY_SHORT_LABELS = MODULE_CATEGORIES.map(cat => cat.shortLabel)