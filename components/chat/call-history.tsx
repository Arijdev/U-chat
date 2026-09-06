"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Phone, Video, Clock, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLocalCallHistory, deleteLocalCall } from "@/lib/dataset"

interface CallHistoryProps {
  user: User
  onClose: () => void
}

export default function CallHistory({ user, onClose }: CallHistoryProps) {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadCallHistory = async () => {
      try {
        const res = await fetch(`/api/chat/calls?userId=${encodeURIComponent(user.id)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setCalls(data)
            setLoading(false)
            return
          }
        }

        // Fallback to local dataset
        const localCalls = getLocalCallHistory(user.id)
        setCalls(localCalls)
        setLoading(false)
      } catch (err: any) {
        setCalls(getLocalCallHistory(user.id))
        setLoading(false)
      }
    }

    loadCallHistory()
  }, [user.id])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const handleDeleteCall = async (id: string) => {
    const ok = window.confirm("Delete this call history entry? This cannot be undone.")
    if (!ok) return
    try {
      setLoading(true)
      deleteLocalCall(id)
      setCalls((prev) => prev.filter((c) => c.id !== id))
      toast({ title: "Deleted", description: "Call history entry removed", variant: "default" })
      setLoading(false)
    } catch (err) {
      console.error("Unexpected delete error:", err)
      setLoading(false)
    }
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col shrink-0 text-card-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Call History</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-lg cursor-pointer">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No call history</div>
        ) : (
          calls.map((call) => {
            const isOutgoing = call.caller_id === user.id
            const otherUserName = isOutgoing ? call.receiver?.display_name || "Contact" : call.caller?.display_name || "Contact"

            return (
              <div key={call.id} className="p-3.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-xs">
                    {otherUserName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{otherUserName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {call.call_type === "video" ? <Video className="w-3.5 h-3.5 text-blue-500" /> : <Phone className="w-3.5 h-3.5 text-emerald-500" />}
                      <span>{isOutgoing ? "Outgoing" : "Incoming"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(call.duration_seconds)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">{new Date(call.created_at).toLocaleDateString()}</p>
                    <div className="mt-1">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCall(call.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 cursor-pointer" title="Delete record">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
