"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useRef, useEffect } from "react"
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
  QrCode,
  Camera,
  Flashlight,
  Smartphone,
  Monitor,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
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
  | "linked_devices"
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
  const avatarUrl = user.user_metadata?.avatar_url || `/api/chat/avatar?userId=${user.id}&v=2`
  const status = user.user_metadata?.status || "Hey there! I am using Arixo."

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const WALLPAPER_COLORS = [
    { name: "Default Arixo", color: "#efeae2", darkColor: "#0b141a" },
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
        <h2 className="text-lg font-semibold tracking-wide">
          {section === "root"
            ? "Settings"
            : section === "linked_devices"
            ? "Linked devices"
            : section.charAt(0).toUpperCase() + section.slice(1)}
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

              {/* Linked Devices & QR Code Scanner */}
              <button
                onClick={() => setSection("linked_devices")}
                className="w-full p-3 rounded-xl hover:bg-muted/50 flex items-center gap-4 text-left cursor-pointer transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center transition-transform group-hover:scale-105">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">Linked Devices</p>
                    <span className="text-[10px] bg-[#00a884]/15 text-[#00a884] font-bold px-1.5 py-0.2 rounded-full">
                      Scan QR
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Scan QR code to log in to Web Chat</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
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

        {/* LINKED DEVICES SECTION (Scan QR & Web Login) */}
        {section === "linked_devices" && (
          <LinkedDevicesSection
            user={user}
            displayName={displayName}
            avatarUrl={avatarUrl}
            onBack={() => setSection("root")}
          />
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
                  <p className="text-xs text-muted-foreground">Colors and Arixo doodle overlay</p>
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
                <p className="text-sm font-semibold text-foreground">Add Arixo doodles</p>
                <p className="text-xs text-muted-foreground">Show classic Arixo background illustrations</p>
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
            <p className="text-xs text-muted-foreground mb-3">Arixo Web Keyboard Navigation</p>
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
            <h3 className="text-base font-bold text-foreground">Arixo Web</h3>
            <p className="text-xs text-muted-foreground">Version 2.3000.101 • End-to-End Encrypted</p>
            <div className="bg-card rounded-xl p-3 border border-border text-left space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">About Arixo Web</p>
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
              Are you sure you want to log out of Arixo Web? You will need to sign in again to receive messages.
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

interface LinkedDeviceItem {
  id: string
  browser: string
  os: string
  lastActive: string
  location?: string
}

function LinkedDevicesSection({
  user,
  displayName,
  avatarUrl,
  onBack,
}: {
  user: User
  displayName: string
  avatarUrl?: string
  onBack: () => void
}) {
  const [devices, setDevices] = useState<LinkedDeviceItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("u_chat_linked_devices")
        if (saved) return JSON.parse(saved)
      } catch (e) {}
    }
    return [
      {
        id: "dev_default_chrome",
        browser: "Google Chrome",
        os: "Windows 11",
        lastActive: "Active now",
        location: "Arixo Web",
      },
    ]
  })

  const [isScanning, setIsScanning] = useState(false)
  const [pairingCodeInput, setPairingCodeInput] = useState("")
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [torch, setTorch] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<LinkedDeviceItem | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const saveDevices = (newList: LinkedDeviceItem[]) => {
    setDevices(newList)
    try {
      localStorage.setItem("u_chat_linked_devices", JSON.stringify(newList))
    } catch (e) {}
  }

  // Camera start & stop
  useEffect(() => {
    if (!isScanning) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      return
    }

    let isMounted = true
    const startCamera = async () => {
      setCameraError(null)
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera access not supported on this browser. Use simulated scan or code below.")
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraError("Camera permission unavailable. Tap 'Simulate Scan & Connect' or enter code.")
        }
      }
    }

    startCamera()

    return () => {
      isMounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [isScanning, facingMode])

  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const nextTorch = !torch
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      })
      setTorch(nextTorch)
    } catch (e) {
      console.warn("Torch not supported on this device/browser", e)
    }
  }

  const handleLinkWebSession = async (targetIdOrCode?: string) => {
    const code = (targetIdOrCode || pairingCodeInput).trim()
    const targetSession = code || "arixo_qr_web"

    const payload = {
      type: "qr_login_success",
      to: targetSession,
      pairingCode: code,
      user: {
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: avatarUrl || "",
      },
      timestamp: new Date().toISOString(),
    }

    // 1. BroadcastChannel for same origin
    try {
      const bc = new BroadcastChannel(`uchat_signaling_${targetSession}`)
      bc.postMessage(payload)
      bc.close()

      const bcGlobal = new BroadcastChannel("uchat_signaling_qr_login")
      bcGlobal.postMessage(payload)
      bcGlobal.close()
    } catch (e) {}

    // 2. Server signaling POST
    try {
      await fetch("/api/chat/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch (e) {}

    // Haptic vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 150])
    }

    // Register newly linked device
    const newDevice: LinkedDeviceItem = {
      id: `dev_${Date.now()}`,
      browser: "Google Chrome",
      os: "Windows 11",
      lastActive: "Active now",
      location: "Arixo Web",
    }
    const updated = [newDevice, ...devices.filter((d) => d.id !== newDevice.id)]
    saveDevices(updated)

    setScanSuccess(true)
    setTimeout(() => {
      setScanSuccess(false)
      setIsScanning(false)
      setShowCodeInput(false)
      setPairingCodeInput("")
    }, 2000)
  }

  const handleUnlinkDevice = (devId: string) => {
    const updated = devices.filter((d) => d.id !== devId)
    saveDevices(updated)
    setSelectedDevice(null)

    // Notify web session to log out
    try {
      const bc = new BroadcastChannel("uchat_signaling_qr_login")
      bc.postMessage({ type: "qr_logout", deviceId: devId })
      bc.close()
    } catch (e) {}
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-y-auto">
      {/* 1. TOP ILLUSTRATION & LINK BUTTON */}
      <div className="p-6 text-center space-y-4 bg-white dark:bg-[#111b21] border-b border-border/60">
        {/* Device Sync Illustration */}
        <div className="w-24 h-20 mx-auto relative flex items-center justify-center">
          <svg className="w-full h-full text-foreground" viewBox="0 0 96 64" fill="none">
            {/* Monitor / Laptop */}
            <rect x="8" y="10" width="54" height="34" rx="3" stroke="#8696a0" strokeWidth="2.5" fill="#f0f2f5" className="dark:fill-[#202c33]" />
            <path d="M4 48H66C68 48 70 50 68 53L66 56H4L2 53C0 50 2 48 4 48Z" fill="#cfd8dc" className="dark:fill-[#374248]" />
            {/* Mobile standing next to monitor */}
            <rect x="48" y="16" width="30" height="42" rx="5" fill="white" stroke="#00a884" strokeWidth="2.5" className="dark:fill-[#111b21]" />
            <rect x="52" y="21" width="22" height="30" rx="2" fill="#e8f5e9" className="dark:fill-[#005c4b]/30" />
            {/* QR Scan icon on mobile */}
            <rect x="57" y="26" width="12" height="12" rx="1.5" stroke="#00a884" strokeWidth="1.5" fill="none" />
            <rect x="61" y="30" width="4" height="4" fill="#00a884" />
          </svg>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Use Arixo on other devices</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Link up to 4 devices to your account. Your chats and calls remain end-to-end encrypted.
          </p>
        </div>

        {/* Big Green "Link a Device" Button */}
        <div className="pt-2">
          <Button
            onClick={() => setIsScanning(true)}
            className="w-full max-w-xs mx-auto bg-[#008069] hover:bg-[#00a884] text-white font-semibold py-2.5 rounded-full shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Link a device</span>
          </Button>
        </div>
      </div>

      {/* 2. DEVICE STATUS / CONNECTED SESSIONS */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Device Status
          </label>
          <span className="text-[11px] text-muted-foreground">Tap a device to log out</span>
        </div>

        <div className="bg-white dark:bg-[#111b21] rounded-2xl border border-border/80 divide-y divide-border/40 overflow-hidden shadow-xs">
          {devices.map((dev) => (
            <button
              key={dev.id}
              onClick={() => setSelectedDevice(dev)}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-foreground shrink-0">
                  <Monitor className="w-5 h-5 text-[#00a884]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{dev.browser}</p>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-full">
                      {dev.lastActive}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{dev.os} • {dev.location || "Arixo Web"}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        <div className="p-3 bg-muted/40 rounded-xl text-[11px] text-muted-foreground flex items-center gap-2 leading-relaxed">
          <Shield className="w-4 h-4 text-[#00a884] shrink-0" />
          <span>Your personal messages are end-to-end encrypted on all devices.</span>
        </div>
      </div>

      {/* 3. FULL QR SCANNER VIEWFINDER MODAL */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-in fade-in duration-200">
          {/* Scanner Header */}
          <div className="p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setIsScanning(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title="Close scanner"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="font-bold text-sm">Scan QR Code</h3>
              <p className="text-[11px] text-neutral-300">Point phone at computer screen</p>
            </div>
            <button
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                torch ? "bg-[#00a884] text-white" : "bg-white/10 text-white"
              }`}
              title="Toggle flashlight"
            >
              <Flashlight className="w-5 h-5" />
            </button>
          </div>

          {/* Camera Viewfinder & Reticle Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* Real Camera Video Feed */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark Mask with Centered Square Cutout */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Viewfinder Target Frame */}
              <div className="w-68 h-68 relative rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
                {/* 4 Green Corner Markers */}
                <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#00a884] rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#00a884] rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#00a884] rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#00a884] rounded-br-xl" />

                {/* Animated Pulsing Laser Beam */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#25d366] to-transparent shadow-[0_0_12px_#25d366] animate-bounce" />

                {/* Success Indicator Overlay */}
                {scanSuccess && (
                  <div className="absolute inset-0 bg-[#00a884]/95 flex flex-col items-center justify-center text-white p-4 animate-in zoom-in duration-200">
                    <CheckCircle2 className="w-14 h-14 mb-2 animate-bounce" />
                    <p className="font-bold text-base">Device Linked!</p>
                    <p className="text-xs opacity-90 text-center mt-1">Logging into Arixo Web on your computer...</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 max-w-xs mx-auto p-2.5 bg-black/80 backdrop-blur-md rounded-xl text-white text-xs flex items-center gap-2 border border-white/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Scanner Bottom Controls */}
          <div className="p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 space-y-3">
            {/* Quick Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setFacingMode(facingMode === "environment" ? "user" : "environment")}
                className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Flip camera</span>
              </button>

              <button
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Link with code</span>
              </button>
            </div>

            {/* Instant Simulate Scan Button (1-Click Test) */}
            <button
              onClick={() => handleLinkWebSession("arixo_qr_web")}
              className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Simulate Scan & Connect Web Chat</span>
            </button>

            {/* Manual Code Input Dropdown */}
            {showCodeInput && (
              <div className="p-4 bg-white dark:bg-[#111b21] rounded-2xl border border-border shadow-2xl space-y-3 animate-in slide-in-from-bottom-3 duration-200">
                <p className="text-xs font-semibold text-foreground">Enter 6-digit code shown on your computer:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 384-921"
                    value={pairingCodeInput}
                    onChange={(e) => setPairingCodeInput(e.target.value)}
                    className="flex-1 h-10 px-3.5 text-sm bg-muted rounded-xl border border-border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 uppercase tracking-widest font-mono text-foreground"
                  />
                  <Button
                    onClick={() => handleLinkWebSession(pairingCodeInput)}
                    disabled={!pairingCodeInput.trim()}
                    className="bg-[#008069] hover:bg-[#00a884] text-white rounded-xl text-xs px-4 cursor-pointer"
                  >
                    Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. DEVICE DETAILS & LOGOUT MODAL */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111b21] rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-border space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Device Details</h3>
              <button
                onClick={() => setSelectedDevice(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
              <p className="font-bold text-foreground text-sm">{selectedDevice.browser}</p>
              <p className="text-muted-foreground">{selectedDevice.os} • {selectedDevice.location || "Arixo Web"}</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedDevice.lastActive}</p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="destructive"
                onClick={() => handleUnlinkDevice(selectedDevice.id)}
                className="w-full rounded-xl text-xs font-semibold py-2 cursor-pointer"
              >
                Log out from this device
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDevice(null)}
                className="w-full rounded-xl text-xs text-muted-foreground cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

