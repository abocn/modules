"use client"

import { useState, useEffect } from "react"
import { StatCard } from "./stat-card"
import { Clock } from "lucide-react"

export function ClockCard() {
  const [time, setTime] = useState<Date | null>(null)
  const [is24Hour, setIs24Hour] = useState(false)

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find(row => row.startsWith('clockFormat='))
      ?.split('=')[1]

    setIs24Hour(saved === '24h')
    setTime(new Date())

    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const toggleFormat = () => {
    const newFormat = !is24Hour
    setIs24Hour(newFormat)
    document.cookie = `clockFormat=${newFormat ? '24h' : '12h'}; path=/; max-age=31536000; SameSite=Lax`
  }

  if (!time) {
    return (
      <StatCard icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="text-primary shrink-0 mt-1">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="animate-pulse text-2xl sm:text-3xl">--:--:--</span>
          </div>
        </div>
      </StatCard>
    )
  }

  const hours = time.getHours()
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = is24Hour
    ? hours.toString().padStart(2, '0')
    : (hours % 12 || 12).toString().padStart(2, '0')

  const dayName = time.toLocaleDateString('en-US', { weekday: 'short' })
  const monthName = time.toLocaleDateString('en-US', { month: 'short' })
  const day = time.getDate()

  return (
    <StatCard>
      <button
        onClick={toggleFormat}
        className="absolute bottom-3 right-3 text-[10px] px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
        aria-label="Toggle time format"
      >
        {is24Hour ? '24h' : '12h'}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-bold tabular-nums">
              {displayHours}:{minutes}
            </span>
            <span className="text-lg sm:text-xl font-semibold text-muted-foreground tabular-nums">
              :{seconds}
            </span>
            {!is24Hour && (
              <span className="text-sm sm:text-base font-medium text-muted-foreground ml-1">
                {period}
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
            {dayName}, {monthName} {day}
          </div>
        </div>
      </div>
    </StatCard>
  )
}