import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const Spinner = React.forwardRef<
  SVGSVGElement,
  React.ComponentPropsWithoutRef<typeof Loader2>
>(({ className, ...props }, ref) => (
  <Loader2
    ref={ref}
    className={cn("animate-spin", className)}
    {...props}
  />
))
Spinner.displayName = "Spinner"

export { Spinner }