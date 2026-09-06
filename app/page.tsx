import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, Users, Share2, Lock, ShieldCheck, Video } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              U-Chat
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20">
              <ShieldCheck className="w-4 h-4" /> End-to-End Encrypted WebRTC
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
              Connect with Anyone,{" "}
              <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                Everywhere
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto md:mx-0">
              U-Chat is an ultra-fast, modern real-time communication platform offering encrypted messaging, stories, and peer-to-peer HD audio and video calling.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-2">
              <Link href="/auth/sign-up">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-md">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-border hover:bg-accent text-foreground rounded-xl px-8"
                >
                  Open Chat
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:border-primary/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">Instant Messaging</h3>
              <p className="text-sm text-muted-foreground">Lightning-fast real-time messaging with live receipts and rich emojis.</p>
            </div>

            <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:border-primary/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 text-indigo-500">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">Video & Audio Calls</h3>
              <p className="text-sm text-muted-foreground">High-definition peer-to-peer WebRTC calls directly from your browser.</p>
            </div>

            <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:border-primary/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-500">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">Stories & Media</h3>
              <p className="text-sm text-muted-foreground">Share high-resolution snapshots that disappear after 24 hours.</p>
            </div>

            <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:border-primary/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 text-emerald-500">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">AES-256 Encryption</h3>
              <p className="text-sm text-muted-foreground">Military-grade AES-GCM encryption safeguarding your private messages.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 pt-10 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              100%
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Open Source & Secure</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              HD
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">WebRTC Audio/Video</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              256-bit
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">AES-GCM Encryption</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              Real-time
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Powered by Supabase</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} U-Chat. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Theme:</span>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}
