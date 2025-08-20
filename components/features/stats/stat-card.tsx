import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title?: string
  value?: string | number | React.ReactNode
  subtitle?: string
  icon?: React.ReactNode
  className?: string
  children?: React.ReactNode
  gradient?: boolean
  center?: boolean
  responsiveLayout?: boolean
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
  children,
  gradient = false,
  center = false,
  responsiveLayout = false
}: StatCardProps) {
  return (
    <Card className={cn(
      `relative overflow-hidden transition-all duration-300 hover:shadow-lg py-0 ${center && !responsiveLayout ? "flex justify-center items-center" : ""} ${responsiveLayout ? "h-full" : ""}`,
      gradient && "bg-gradient-to-br from-background to-muted/20",
      className
    )}>
      <CardContent className={cn("p-4 sm:p-6 w-full", responsiveLayout && "h-full relative")}>
        {children ? (
          children
        ) : responsiveLayout ? (
          <>
            <div className="flex md:hidden items-center justify-between w-full h-full">
              {icon && (
                <div className="text-primary flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="text-right flex-shrink-0">
                {title && (
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    {title}
                  </p>
                )}
                <div className="flex flex-col">
                  {typeof value === 'string' || typeof value === 'number' ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                      {subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
                      )}
                    </>
                  ) : (
                    value
                  )}
                </div>
              </div>
            </div>

            <div className="hidden md:block md:h-full md:min-h-[120px]">
              {icon && (
                <div className="absolute top-6 left-6 text-primary">
                  {icon}
                </div>
              )}
              <div className="absolute bottom-6 right-6 text-right">
                {title && (
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    {title}
                  </p>
                )}
                <div className="flex flex-col">
                  {typeof value === 'string' || typeof value === 'number' ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                      {subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
                      )}
                    </>
                  ) : (
                    value
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            {icon && (
              <div className="text-primary flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="text-right flex-shrink-0">
              {title && (
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                  {title}
                </p>
              )}
              <div className="flex flex-col">
                {typeof value === 'string' || typeof value === 'number' ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                    {subtitle && (
                      <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
                    )}
                  </>
                ) : (
                  value
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}