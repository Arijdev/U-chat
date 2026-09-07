"use client"

import type { User } from "@supabase/supabase-js"
import {
  MessageSquare,
  CircleDashed,
  Radio,
  Users2,
  Sparkles,
  Star,
  Archive,
  Settings,
  Phone,
} from "lucide-react"

export type NavTab =
  | "chats"
  | "stories"
  | "channels"
  | "communities"
  | "meta_ai"
  | "starred"
  | "archived"
  | "settings"
  | "calls"

interface NavRailProps {
  user: User
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenProfile: () => void
  unreadCount?: number
  hasStoryUpdates?: boolean
  hideMobileNav?: boolean
  className?: string
}

export function NavRail({
  user,
  activeTab,
  onSelectTab,
  onOpenProfile,
  unreadCount = 0,
  hasStoryUpdates = true,
  hideMobileNav = false,
  className = "",
}: NavRailProps) {
  const avatarUrl = user.user_metadata?.avatar_url || `/api/chat/avatar?userId=${user.id}`
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User"

  return (
    <>
      {/* Desktop Vertical Left Rail */}
      <aside
        className={`hidden md:flex flex-col items-center justify-between w-[64px] bg-[#f0f2f5] dark:bg-[#202c33] border-r border-border/50 py-3 shrink-0 z-30 select-none ${className}`}
      >
        {/* Top Icons */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {/* Chats */}
          <button
            onClick={() => onSelectTab("chats")}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "chats"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Chats"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Status / Stories */}
          <button
            onClick={() => onSelectTab("stories")}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "stories"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Status"
          >
            <CircleDashed className="w-5 h-5" />
            {hasStoryUpdates && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#f0f2f5] dark:ring-[#202c33]" />
            )}
          </button>

          {/* Channels */}
          <button
            onClick={() => onSelectTab("channels")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "channels"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Channels"
          >
            <Radio className="w-5 h-5" />
          </button>

          {/* Communities */}
          <button
            onClick={() => onSelectTab("communities")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "communities"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Communities"
          >
            <Users2 className="w-5 h-5" />
          </button>

          {/* Meta AI */}
          <button
            onClick={() => onSelectTab("meta_ai")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group ${
              activeTab === "meta_ai"
                ? "bg-[#d9dbde] dark:bg-[#374248]"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            title="Meta AI"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 flex items-center justify-center p-0.5 shadow-xs transition-transform group-hover:scale-105">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </button>

          {/* Calls */}
          <button
            onClick={() => onSelectTab("calls")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "calls"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Calls"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {/* Starred Messages */}
          <button
            onClick={() => onSelectTab("starred")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "starred"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-amber-500"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Starred Messages"
          >
            <Star className="w-5 h-5" />
          </button>

          {/* Archived Chats */}
          <button
            onClick={() => onSelectTab("archived")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "archived"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Archived"
          >
            <Archive className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectTab("settings")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#d9dbde] dark:bg-[#374248] text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Profile Avatar with online green dot */}
          <button
            onClick={onOpenProfile}
            className="relative w-9 h-9 rounded-full overflow-hidden mt-1 cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 transition-all"
            title={`${displayName} (Profile)`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#f0f2f5] dark:ring-[#202c33]" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      {!hideMobileNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-[#f0f2f5]/95 dark:bg-[#202c33]/95 backdrop-blur-md border-t border-border/50 flex items-center justify-around z-40 px-2 select-none animate-in fade-in-50 duration-200">
          <button
            onClick={() => onSelectTab("chats")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl cursor-pointer ${
              activeTab === "chats" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Chats</span>
          </button>

          <button
            onClick={() => onSelectTab("stories")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl cursor-pointer ${
              activeTab === "stories" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <CircleDashed className="w-5 h-5" />
              {hasStoryUpdates && <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full" />}
            </div>
            <span className="text-[10px]">Updates</span>
          </button>

          <button
            onClick={() => onSelectTab("communities")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl cursor-pointer ${
              activeTab === "communities" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
            }`}
          >
            <Users2 className="w-5 h-5" />
            <span className="text-[10px]">Communities</span>
          </button>

          <button
            onClick={() => onSelectTab("calls")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl cursor-pointer ${
              activeTab === "calls" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px]">Calls</span>
          </button>

          <button
            onClick={() => onSelectTab("settings")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl cursor-pointer ${
              activeTab === "settings" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">Settings</span>
          </button>
        </nav>
      )}
    </>
  )
}
