"use client"

import type { User } from "@supabase/supabase-js"
import { useState } from "react"
import {
  ArrowLeft,
  X,
  User as UserIcon,
  Lock,
  MessageSquare,
  Bell,
  Keyboard,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Check,
  Palette,
  Shield,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SettingsDrawerProps {
  user: User
  onClose: () => void
  onOpenProfile: () => void
}

type SettingsSection =
  | "root"
  | "privacy"
  | "chats"
  | "wallpaper"
  | "notifications"
  | "shortcuts"
  | "help"

export function SettingsDrawer({ user, onClose, onOpenProfile }: SettingsDrawerProps) {
  const [section, setSection] = useState<SettingsSection>("root")
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Local state for user settings
  const [readReceipts, setReadReceipts] = useState(true)
  const [lastSeen, setLastSeen] = useState<"everyone" | "contacts" | "nobody">("everyone")
  const [disappearingTimer, setDisappearingTimer] = useState<"off" | "24h" | "7d" | "90d">("off")
  const [enterIsSend, setEnterIsSend] = useState(true)
  const [messageSounds, setMessageSounds] = useState(true)
  const [showPreviews, setShowPreviews] = useState(true)
  const [selectedWallpaper, setSelectedWallpaper] = useState("#efeae2")
  const [showDoodle, setShowDoodle] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User"
  const avatarUrl = user.user_metadata?.avatar_url
  const status = user.user_metadata?.status || "Hey there! I am using WhatsApp."

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const WALLPAPER_COLORS = [
    { name: "Default WhatsApp", color: "#efeae2", darkColor: "#0b141a" },
    { name: "Soft Sage", color: "#d9e8df", darkColor: "#172b22" },
    { name: "Sky Blue", color: "#d5e4f3", darkColor: "#172432" },
    { name: "Blush Pink", color: "#f7dede", darkColor: "#321d24" },
    { name: "Golden Sand", color: "#f8eed1", darkColor: "#2c2615" },
    { name: "Cool Slate", color: "#dde1e4", darkColor: "#1c2227" },
    { name: "Deep Teal", color: "#113838", darkColor: "#091f1f" },
    { name: "Midnight Onyx", color: "#181d20", darkColor: "#101416" },
  ]

  const SHORTCUTS = [
    { label: "New chat", keys: ["Ctrl", "N"] },
    { label: "Previous chat", keys: ["Ctrl", "Shift", "["] },
    { label: "Next chat", keys: ["Ctrl", "Shift", "]"] },
    { label: "Archive chat", keys: ["Ctrl", "Shift", "E"] },
    { label: "Mute chat", keys: ["Ctrl", "Shift", "M"] },
    { label: "Delete chat", keys: ["Ctrl", "Backspace"] },
    { label: "Search in chat", keys: ["Ctrl", "Shift", "F"] },
    { label: "Search chats", keys: ["Ctrl", "/"] },
    { label: "Settings", keys: ["Ctrl", ","] },
  ]

  return (
    <div className="w-full md:w-96 bg-[#f0f2f5] dark:bg-[#111b21] border-r border-border flex flex-col h-full z-40 select-none animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-4 px-4 shrink-0 shadow-xs">
        {section !== "root" ? (
          <button
            onClick={() => setSection("root")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold tracking-wide capitalize">
          {section === "root" ? "Settings" : section}
        </h2>
      </div>

      {/* Main Settings List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {section === "root" && (
          <>
            {/* User Profile Card */}
            <div
              onClick={onOpenProfile}
              className="p-4 bg-card dark:bg-[#111b21] hover:bg-muted/50 cursor-pointer flex items-center gap-4 transition-colors"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base text-foreground truncate">{displayName}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{status}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={onOpenProfile}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Profile</p>
                  <p className="text-xs text-muted-foreground">Photo, name and about</p>
                </div>
              </button>

              <button
                onClick={() => setSection("privacy")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Privacy</p>
                  <p className="text-xs text-muted-foreground">Last seen, read receipts, disappearing messages</p>
                </div>
              </button>

              <button
                onClick={() => setSection("chats")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Chats</p>
                  <p className="text-xs text-muted-foreground">Theme, wallpaper, enter is send</p>
                </div>
              </button>

              <button
                onClick={() => setSection("notifications")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">Message tones, call ringtones, previews</p>
                </div>
              </button>

              <button
                onClick={() => setSection("shortcuts")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Keyboard Shortcuts</p>
                  <p className="text-xs text-muted-foreground">Quick actions and navigation</p>
                </div>
              </button>

              <button
                onClick={() => setSection("help")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Help</p>
                  <p className="text-xs text-muted-foreground">Help center, licenses, terms</p>
                </div>
              </button>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full p-3 rounded-xl hover:bg-red-500/10 text-red-600 flex items-center gap-4 text-left cursor-pointer transition-colors mt-4"
              >
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Log out</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* PRIVACY SECTION */}
        {section === "privacy" && (
          <div className="p-4 space-y-6">
            <div>
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                Who can see my personal info
              </label>
              <div className="bg-card rounded-xl p-3 border border-border space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">Last seen and online</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(["everyone", "contacts", "nobody"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setLastSeen(opt)}
                        className={`py-1.5 px-2 text-xs rounded-lg font-medium capitalize border cursor-pointer ${
                          lastSeen === opt
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Read receipts</p>
                    <p className="text-xs text-muted-foreground">If turned off, you won't send or receive read receipts (blue ticks).</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                Disappearing messages
              </label>
              <div className="bg-card rounded-xl p-3 border border-border text-sm">
                <p className="font-semibold text-foreground">Default message timer</p>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(["off", "24h", "7d", "90d"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDisappearingTimer(t)}
                      className={`py-1.5 px-2 text-xs rounded-lg font-medium uppercase border cursor-pointer ${
                        disappearingTimer === t
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-3 border border-border text-xs text-muted-foreground flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>Your messages and calls are end-to-end encrypted. No one outside of your chats can read or listen to them.</span>
            </div>
          </div>
        )}

        {/* CHATS SECTION */}
        {section === "chats" && (
          <div className="p-4 space-y-6">
            <div>
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                Display Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer ${
                    theme === "light"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-xs font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer ${
                    theme === "dark"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-xs font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer ${
                    theme === "system"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Laptop className="w-5 h-5" />
                  <span className="text-xs font-medium">System</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setSection("wallpaper")}
              className="w-full p-3 bg-card border border-border rounded-xl flex items-center justify-between text-left cursor-pointer hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Chat Wallpaper</p>
                  <p className="text-xs text-muted-foreground">Colors and WhatsApp doodle overlay</p>
                </div>
              </div>
              <div
                className="w-6 h-6 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: selectedWallpaper }}
              />
            </button>

            <div className="bg-card rounded-xl p-3 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Enter is send</p>
                  <p className="text-xs text-muted-foreground">Press Enter to send message, Shift+Enter for new line.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enterIsSend}
                  onChange={(e) => setEnterIsSend(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* WALLPAPER CHOOSER */}
        {section === "wallpaper" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Add WhatsApp doodles</p>
                <p className="text-xs text-muted-foreground">Show classic WhatsApp background illustrations</p>
              </div>
              <input
                type="checkbox"
                checked={showDoodle}
                onChange={(e) => setShowDoodle(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Color Palette</p>
              <div className="grid grid-cols-4 gap-3">
                {WALLPAPER_COLORS.map((wp) => (
                  <button
                    key={wp.color}
                    onClick={() => setSelectedWallpaper(wp.color)}
                    className="aspect-square rounded-2xl relative border-2 flex items-center justify-center cursor-pointer shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: wp.color }}
                  >
                    {selectedWallpaper === wp.color && (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS SECTION */}
        {section === "notifications" && (
          <div className="p-4 space-y-4">
            <div className="bg-card rounded-xl divide-y divide-border border border-border">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Message sounds</p>
                  <p className="text-xs text-muted-foreground">Play sounds for incoming and outgoing messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={messageSounds}
                  onChange={(e) => setMessageSounds(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Show previews</p>
                  <p className="text-xs text-muted-foreground">Display message text in notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={showPreviews}
                  onChange={(e) => setShowPreviews(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* KEYBOARD SHORTCUTS */}
        {section === "shortcuts" && (
          <div className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">WhatsApp Web Keyboard Navigation</p>
            {SHORTCUTS.map((sc) => (
              <div key={sc.label} className="flex items-center justify-between p-2.5 bg-card rounded-xl border border-border">
                <span className="text-xs font-medium text-foreground">{sc.label}</span>
                <div className="flex gap-1">
                  {sc.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded-md border border-border shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HELP SECTION */}
        {section === "help" && (
          <div className="p-4 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-md">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">WhatsApp Web</h3>
            <p className="text-xs text-muted-foreground">Version 2.3000.101 • End-to-End Encrypted</p>
            <div className="bg-card rounded-xl p-3 border border-border text-left space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">About U-Chat</p>
              <p>Built with Next.js Turbopack, WebRTC Peer-to-Peer real-time audio & video streaming, and AES-256 GCM encryption.</p>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-84 rounded-2xl p-6 shadow-2xl border border-border space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">Log out?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to log out of WhatsApp Web? You will need to sign in again to receive messages.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
