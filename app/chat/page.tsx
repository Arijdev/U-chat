"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import ChatLayout from "@/components/chat/chat-layout"
import type { User } from "@supabase/supabase-js"

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return

        if (user) {
          setUser(user)
          setLoading(false)
          return
        }

        // Fallback check session
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          setLoading(false)
        } else {
          router.push("/auth/login")
        }
      } catch (err) {
        console.warn("Auth check error in ChatPage, redirecting to login:", err)
        if (mounted) router.push("/auth/login")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        router.push("/auth/login")
      }
    })

    return () => {
      mounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">Loading Arixo Web...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <ChatLayout user={user} />
}
