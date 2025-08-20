"use client"

import { StatCard } from "./stat-card"
import { MessageCircle, Users, ExternalLink } from "lucide-react"
import { RiTelegram2Line } from "react-icons/ri"

export function TelegramCard() {
  const telegramChannel = process.env.TELEGRAM_CHANNEL || "https://t.me/pontushub"
  const telegramChat = process.env.TELEGRAM_CHAT || "https://t.me/pontushubchat"

  return (
    <StatCard className="group">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <RiTelegram2Line className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="sm:text-xl font-bold">Join our Community!</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          <a
            href={telegramChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group/link border border-border/50"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Channel</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Get Updates</p>
              </div>
            </div>
            <ExternalLink className="absolute top-1.5 right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-0 group-hover/link:opacity-100 transition-opacity text-muted-foreground" />
          </a>

          <a
            href={telegramChat}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group/link border border-border/50"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Chat</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Discuss With Us!</p>
              </div>
            </div>
            <ExternalLink className="absolute top-1.5 right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-0 group-hover/link:opacity-100 transition-opacity text-muted-foreground" />
          </a>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex -space-x-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-background"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 border-2 border-background"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-background"></div>
          </div>
          <span>Join 750+ members</span>
        </div>
      </div>
    </StatCard>
  )
}