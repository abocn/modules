"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search, ArrowLeft } from "lucide-react"

export function NotFoundClient() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 text-center">
          <p className="text-muted-foreground">
            The page you&apos;re looking for could not be found. It might have been moved, deleted, or you entered the wrong URL.
          </p>

          <div className="space-y-4">
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4" />
                  Back to Home
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/search">
                  <Search className="w-4 h-4" />
                  Search Modules
                </Link>
              </Button>
            </div>

            <Button variant="ghost" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}