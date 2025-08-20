import type { Metadata, Viewport } from "next"
import { NotFoundClient } from "@/components/pages/not-found-client"

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for could not be found. Browse our modules or return to the homepage.",
  robots: {
    index: false,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function NotFound() {
  return <NotFoundClient />
}