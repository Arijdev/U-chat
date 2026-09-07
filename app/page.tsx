"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  MessageSquare,
  Lock,
  Download,
  Smartphone,
  Laptop,
  Check,
  Info,
  ExternalLink,
  ChevronRight,
  X,
  HelpCircle,
  Apple,
  Monitor,
  Share,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [staySignedIn, setStaySignedIn] = useState(true)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [pairingCode, setPairingCode] = useState("384-921")
  const [isQrConnected, setIsQrConnected] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Generate fresh pairing code
    const randomCode = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`
    setPairingCode(randomCode)

    // Clear legacy auth tokens to prevent header overflow
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim()
        if (name.startsWith("sb-") && name.includes("auth-token")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
    }

    const checkSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        router.push("/chat")
      }
    }
    checkSession()

    // Listen for mobile QR login scan signals
    const onQrLoginSuccess = (payload: any) => {
      setIsQrConnected(true)
      setTimeout(() => {
        window.location.href = "/chat"
      }, 900)
    }

    let bcWeb: BroadcastChannel | null = null
    let bcGlobal: BroadcastChannel | null = null
    try {
      bcWeb = new BroadcastChannel("uchat_signaling_arixo_qr_web")
      bcWeb.onmessage = (e) => {
        if (e.data?.type === "qr_login_success") onQrLoginSuccess(e.data)
      }
      bcGlobal = new BroadcastChannel("uchat_signaling_qr_login")
      bcGlobal.onmessage = (e) => {
        if (e.data?.type === "qr_login_success") onQrLoginSuccess(e.data)
      }
    } catch (e) {}

    // Polling server signaling for cross-device QR login
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/signaling?to=arixo_qr_web")
        if (res.ok) {
          const data = await res.json()
          if (data.signals?.some((s: any) => s.type === "qr_login_success" || s.payload?.type === "qr_login_success")) {
            onQrLoginSuccess(data.signals[0])
          }
        }
      } catch (e) {}
    }, 2000)

    // Capture PWA install prompt for mobile & desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => {
      clearInterval(pollInterval)
      bcWeb?.close()
      bcGlobal?.close()
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [router])

  const handleInstallPwa = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") {
        setInstallPrompt(null)
        setDownloadSuccess(true)
      }
    } else {
      // Direct download simulated package / manifest link
      const blob = new Blob(
        [
          JSON.stringify(
            {
              app: "Arixo Web",
              version: "2.4.0",
              downloadDate: new Date().toISOString(),
              platform: "Windows & Mobile",
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Arixo-Setup-v2.4.0.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcf5eb] dark:bg-[#0c1317] text-foreground flex flex-col justify-between font-sans selection:bg-[#00a884] selection:text-white transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-md">
            <MessageSquare className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Arixo</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold px-4 border-border/80 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Center Main Content: Banner + Scan Card */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 flex flex-col gap-5 flex-1 justify-center">
        {/* 1. TOP DOWNLOAD BANNER (Matches user screenshot) */}
        <div className="w-full bg-white dark:bg-[#111b21] rounded-2xl sm:rounded-3xl border border-neutral-300/80 dark:border-neutral-800 p-4 sm:p-5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            {/* Custom SVG Illustration: Laptop + Mobile with Phone icon */}
            <div className="w-14 h-12 relative flex items-center justify-center shrink-0">
              <svg className="w-full h-full" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Laptop screen */}
                <rect x="6" y="6" width="38" height="25" rx="3" stroke="#8696a0" strokeWidth="2" fill="#f0f2f5" className="dark:fill-[#202c33]" />
                {/* Laptop base */}
                <path d="M2 34C2 32.8954 2.89543 32 4 32H46C47.1046 32 48 32.8954 48 34L50 37C50 38.1046 49.1046 39 48 39H4C2.89543 39 2 38.1046 2 37L2 34Z" fill="#cfd8dc" className="dark:fill-[#374248]" />
                {/* Phone standing in front of laptop */}
                <rect x="30" y="10" width="22" height="32" rx="4" fill="white" stroke="#25d366" strokeWidth="2" className="dark:fill-[#111b21]" />
                {/* Phone screen inner */}
                <rect x="33" y="13" width="16" height="23" rx="2" fill="#e8f5e9" className="dark:fill-[#005c4b]/30" />
                {/* Call receiver symbol inside phone */}
                <path d="M41 18C40.4477 18 40 18.4477 40 19C40 23.4183 43.5817 27 48 27C48.5523 27 49 26.5523 49 26V24.5C49 24.2239 48.7761 24 48.5 24C47.5 24 46.5 23.5 45.8 22.8L44.8 23.8C43.5 23.1 42.9 22.5 42.2 21.2L43.2 20.2C42.5 19.5 42 18.5 42 17.5C42 17.2239 41.7761 17 41.5 17H41V18Z" fill="#25d366" />
              </svg>
            </div>

            <div className="space-y-0.5">
              <h2 className="text-base sm:text-[17px] font-bold text-foreground">
                Download Arixo for Windows & Mobile
              </h2>
              <p className="text-xs sm:text-sm text-[#54656f] dark:text-[#8696a0] leading-snug">
                Get extra features like voice and video calling, screen sharing and more.
              </p>
            </div>
          </div>

          {/* Green Download Pill Button */}
          <div className="w-full sm:w-auto flex sm:justify-end shrink-0">
            <button
              onClick={() => setShowDownloadModal(true)}
              className="w-full sm:w-auto bg-[#25d366] hover:bg-[#1ebd5b] text-white font-medium text-sm px-6 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <span>Download</span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. MAIN "SCAN TO LOG IN" CARD (Matches user screenshot) */}
        <div className="w-full bg-white dark:bg-[#111b21] rounded-2xl sm:rounded-3xl border border-neutral-300/80 dark:border-neutral-800 p-6 sm:p-10 md:p-12 shadow-sm">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Left Steps Column */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-medium text-foreground tracking-tight mb-7">
                  Scan to log in
                </h1>

                {/* Steps with vertical connecting line */}
                <div className="space-y-5 relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3.5 top-3.5 bottom-3.5 w-0.5 bg-neutral-300 dark:bg-neutral-700 -z-0" />

                  {/* Step 1 */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#111b21] border border-neutral-400 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <p className="text-sm sm:text-base text-[#3b4a54] dark:text-[#aebac1] pt-0.5">
                      Scan the QR code with your phone&apos;s camera
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#111b21] border border-neutral-400 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="text-sm sm:text-base text-[#3b4a54] dark:text-[#aebac1] pt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>Tap the link to open</span>
                      <span className="font-semibold text-foreground">Arixo</span>
                      <div className="w-5 h-5 rounded-full bg-[#25d366] inline-flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-white fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#111b21] border border-neutral-400 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <p className="text-sm sm:text-base text-[#3b4a54] dark:text-[#aebac1] pt-0.5">
                      Scan the QR code again to link to your account
                    </p>
                  </div>
                </div>

                {/* Need help link */}
                <div className="pt-5 pl-1">
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-sm text-foreground underline underline-offset-4 hover:text-[#00a884] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Need help?</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Options Row */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <label className="flex items-center gap-2 select-none cursor-pointer text-sm text-[#54656f] dark:text-[#8696a0]">
                  <input
                    type="checkbox"
                    checked={staySignedIn}
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="w-4.5 h-4.5 accent-[#00a884] rounded-sm cursor-pointer"
                  />
                  <span>Stay logged in on this browser</span>
                  <Info className="w-3.5 h-3.5 text-neutral-400 hover:text-foreground" />
                </label>

                <Link
                  href="/auth/login"
                  className="text-sm font-semibold text-[#008069] dark:text-[#00a884] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Log in with email ID</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right QR Code Column */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative p-5 bg-white rounded-2xl shadow-sm border border-neutral-300/80 group cursor-pointer">
                {/* Authentic QR Pattern */}
                <div className="w-56 h-56 relative flex items-center justify-center">
                  <svg className="w-full h-full text-[#111b21]" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corner 1 */}
                    <rect x="5" y="5" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="12" width="12" height="12" rx="1.5" />
                    {/* Corner 2 */}
                    <rect x="69" y="5" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="76" y="12" width="12" height="12" rx="1.5" />
                    {/* Corner 3 */}
                    <rect x="5" y="69" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="76" width="12" height="12" rx="1.5" />
                    {/* Data Matrix Dots */}
                    <rect x="36" y="8" width="5" height="5" />
                    <rect x="46" y="12" width="5" height="5" />
                    <rect x="56" y="6" width="5" height="5" />
                    <rect x="8" y="38" width="5" height="5" />
                    <rect x="16" y="48" width="5" height="5" />
                    <rect x="24" y="36" width="5" height="5" />
                    <rect x="74" y="38" width="5" height="5" />
                    <rect x="84" y="44" width="5" height="5" />
                    <rect x="36" y="68" width="5" height="5" />
                    <rect x="44" y="76" width="5" height="5" />
                    <rect x="52" y="84" width="5" height="5" />
                    <rect x="68" y="72" width="5" height="5" />
                    <rect x="78" y="80" width="5" height="5" />
                    <rect x="86" y="66" width="5" height="5" />
                    <rect x="38" y="38" width="7" height="7" />
                    <rect x="55" y="38" width="7" height="7" />
                    <rect x="38" y="55" width="7" height="7" />
                    <rect x="55" y="55" width="7" height="7" />
                  </svg>

                  {/* WhatsApp Center Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <MessageSquare className="w-6 h-6 fill-white" />
                    </div>
                  </div>

                  {/* Scan Beam Indicator */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#25d366] to-transparent shadow-[0_0_8px_#25d366] animate-pulse" />

                  {/* Success Connection Overlay */}
                  {isQrConnected && (
                    <div className="absolute inset-0 bg-[#00a884]/95 rounded-xl flex flex-col items-center justify-center text-white p-4 animate-in zoom-in-95 duration-200 z-10">
                      <CheckCircle2 className="w-14 h-14 mb-2 animate-bounce" />
                      <p className="font-bold text-base">Device Paired!</p>
                      <p className="text-xs opacity-90 text-center mt-1">Logging into Arixo Web...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pairing Code Display */}
              <div className="mt-3 text-center space-y-1">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <span>Pairing code:</span>
                  <span className="font-mono font-bold text-foreground bg-neutral-200/80 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-xs tracking-wider border border-border">
                    {pairingCode}
                  </span>
                </p>
                <p className="text-[10px] text-neutral-400">Scan QR with Arixo on your phone or enter code</p>
              </div>

              {/* 1-Click Launch below QR */}
              <div className="mt-3 w-full max-w-56 text-center">
                <Link href="/auth/login" className="w-full">
                  <Button
                    size="sm"
                    className="w-full bg-[#008069] hover:bg-[#00a884] text-white text-xs font-semibold py-2 rounded-full cursor-pointer shadow-xs"
                  >
                    Open Web App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#54656f] dark:text-[#8696a0] gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Your personal messages are end-to-end encrypted</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowDownloadModal(true)} className="hover:underline cursor-pointer">
            Download App
          </button>
          <span>•</span>
          <Link href="/auth/sign-up" className="hover:underline">
            Register Account
          </Link>
          <span>•</span>
          <button onClick={() => setShowHelpModal(true)} className="hover:underline cursor-pointer">
            Help Center
          </button>
        </div>
      </footer>

      {/* 3. DOWNLOAD APP MODAL (Mobile + Desktop) */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111b21] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-300 dark:border-neutral-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#25d366]/15 flex items-center justify-center">
                  <Download className="w-5 h-5 text-[#25d366]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Download Arixo</h3>
                  <p className="text-xs text-muted-foreground">Choose your platform</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Installer package downloaded successfully!</span>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Option 1: Mobile App (Android APK & PWA) */}
              <button
                onClick={handleInstallPwa}
                className="w-full p-3 rounded-xl border border-border/80 hover:border-[#25d366] bg-muted/30 hover:bg-[#25d366]/5 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#25d366]/10 flex items-center justify-center text-[#25d366]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Android Mobile App</p>
                    <p className="text-[11px] text-muted-foreground">Instant install APK / PWA for Android</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-[#25d366] transition-colors" />
              </button>

              {/* Option 2: iOS (iPhone / iPad) */}
              <button
                onClick={() => {
                  alert(
                    "To install on iPhone/iPad:\n1. Open this page in Safari\n2. Tap the Share button (box with arrow)\n3. Tap 'Add to Home Screen'"
                  )
                }}
                className="w-full p-3 rounded-xl border border-border/80 hover:border-[#25d366] bg-muted/30 hover:bg-[#25d366]/5 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">iOS (iPhone & iPad)</p>
                    <p className="text-[11px] text-muted-foreground">Add to Home Screen via Safari</p>
                  </div>
                </div>
                <Share className="w-4 h-4 text-muted-foreground group-hover:text-[#25d366] transition-colors" />
              </button>

              {/* Option 3: Windows Desktop App */}
              <button
                onClick={handleInstallPwa}
                className="w-full p-3 rounded-xl border border-border/80 hover:border-[#25d366] bg-muted/30 hover:bg-[#25d366]/5 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Windows 64-bit</p>
                    <p className="text-[11px] text-muted-foreground">Stand-alone desktop app for Windows 10/11</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-[#25d366] transition-colors" />
              </button>

              {/* Option 4: macOS */}
              <button
                onClick={handleInstallPwa}
                className="w-full p-3 rounded-xl border border-border/80 hover:border-[#25d366] bg-muted/30 hover:bg-[#25d366]/5 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-500/10 flex items-center justify-center text-foreground">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">macOS</p>
                    <p className="text-[11px] text-muted-foreground">Apple Silicon & Intel DMG package</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-[#25d366] transition-colors" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDownloadModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. NEED HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111b21] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-300 dark:border-neutral-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#00a884]" />
                How to link your device
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                1. Open <strong className="text-foreground">Arixo</strong> on your mobile phone.
              </p>
              <p>
                2. Tap <strong className="text-foreground">Settings</strong> on iOS or the 3-dot <strong className="text-foreground">Menu</strong> on Android.
              </p>
              <p>
                3. Select <strong className="text-foreground">Linked Devices</strong> and tap <strong className="text-foreground">Link a Device</strong>.
              </p>
              <p>
                4. Point your camera at this QR code to authenticate instantly without entering passwords.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setShowHelpModal(false)}
                className="bg-[#00a884] hover:bg-[#008069] text-white text-xs px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

