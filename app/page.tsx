"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MessageSquare, Lock, QrCode, ArrowRight, ShieldCheck, Check, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [staySignedIn, setStaySignedIn] = useState(true)
  const [loadingUser, setLoadingUser] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        router.push("/chat")
      } else {
        setLoadingUser(false)
      }
    }
    checkSession()
  }, [router])

  return (
    <div className="min-h-screen bg-[#d1d7db] dark:bg-[#0c1317] flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top WhatsApp Emerald Banner */}
      <div className="h-56 bg-[#00a884] dark:bg-[#00a884] w-full relative shrink-0">
        <div className="max-w-5xl mx-auto px-6 pt-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-6 h-6 text-[#00a884] fill-[#00a884]" />
            </div>
            <span className="text-white font-bold tracking-wide text-base">Arixo Web</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-xs border border-white/20">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Arixo Web Card (Overlapping Top Banner) */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 -mt-36 mb-8 z-10">
        <div className="bg-white dark:bg-[#111b21] rounded-xs md:rounded-sm shadow-xl border border-black/5 dark:border-white/5 p-6 md:p-12">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Left Instructions */}
            <div className="md:col-span-7 space-y-6">
              <h1 className="text-2xl md:text-3xl font-light text-[#41525d] dark:text-[#e9edef] tracking-tight">
                Use Arixo on your computer
              </h1>

              <ol className="space-y-4 text-sm md:text-base text-[#3b4a54] dark:text-[#aebac1] list-decimal list-inside leading-relaxed">
                <li className="pl-1">
                  Open <span className="font-semibold text-foreground">Arixo</span> on your phone
                </li>
                <li className="pl-1">
                  Tap <span className="font-semibold text-foreground">Menu</span> on Android, or{" "}
                  <span className="font-semibold text-foreground">Settings</span> on iPhone
                </li>
                <li className="pl-1">
                  Tap <span className="font-semibold text-foreground">Linked Devices</span> and then{" "}
                  <span className="font-semibold text-foreground">Link a Device</span>
                </li>
                <li className="pl-1">
                  Point your phone to this screen to capture the QR code
                </li>
              </ol>

              <div className="pt-2 flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="stay-signed-in"
                  checked={staySignedIn}
                  onChange={(e) => setStaySignedIn(e.target.checked)}
                  className="w-4 h-4 accent-[#00a884] cursor-pointer rounded"
                />
                <label htmlFor="stay-signed-in" className="text-xs md:text-sm text-muted-foreground cursor-pointer">
                  Stay signed in on this computer
                </label>
              </div>

              <div className="pt-4 border-t border-border/50 flex flex-wrap items-center gap-3">
                <Link href="/auth/login">
                  <Button className="bg-[#008069] hover:bg-[#00a884] text-white rounded-lg px-5 py-2 text-xs md:text-sm font-semibold cursor-pointer shadow-xs">
                    Sign in with Email <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button variant="outline" className="border-border text-foreground hover:bg-muted rounded-lg px-4 py-2 text-xs md:text-sm font-semibold cursor-pointer">
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right QR Code & 1-Click Demo */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl border border-border/40 text-center relative overflow-hidden">
              {/* Simulated WhatsApp QR Code */}
              <div className="relative p-4 bg-white rounded-xl shadow-sm border border-border">
                {/* SVG QR Code Pattern */}
                <div className="w-52 h-52 relative flex items-center justify-center">
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
                    {/* Simulated Data Matrix Dots */}
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
                    <rect x="38" y="38" width="8" height="8" />
                    <rect x="54" y="38" width="8" height="8" />
                    <rect x="38" y="54" width="8" height="8" />
                    <rect x="54" y="54" width="8" height="8" />
                  </svg>

                  {/* Center WhatsApp Logo Badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <MessageSquare className="w-6 h-6 fill-white" />
                    </div>
                  </div>

                  {/* Laser Scan Animation Line */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#00a884] to-transparent shadow-[0_0_8px_#00a884] animate-bounce" />
                </div>
              </div>

              {/* Instant Link / Demo Entry */}
              <div className="mt-4 w-full space-y-2">
                <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#00a884]" /> Instant 1-Click Launch:
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  <Link href="/auth/login" className="w-full">
                    <Button
                      size="sm"
                      className="w-full bg-[#00a884] hover:bg-[#008069] text-white text-xs font-semibold py-2 rounded-lg cursor-pointer shadow-xs"
                    >
                      Continue to Arixo Web
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Features Banner */}
      <div className="max-w-5xl mx-auto w-full px-6 py-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#00a884]" />
          <span>Your personal messages are end-to-end encrypted</span>
        </div>
        <p>© 2026 Arixo Web • Built with Next.js Turbopack & WebRTC</p>
      </div>
    </div>
  )
}
