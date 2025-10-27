"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, Phone, Video, Clock } from "lucide-react"

interface CallHistoryProps {
  user: User
  onClose: () => void
}

export default function CallHistory({ user, onClose }: CallHistoryProps) {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCallHistory = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("call_history")
        .select(
          `
          *,
          caller:profiles!call_history_caller_id_fkey(id, display_name, email),
          receiver:profiles!call_history_receiver_id_fkey(id, display_name, email)
        `,
        )
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50)

      setCalls(data || [])
      setLoading(false)
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

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Call History</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-600 hover:text-red-600">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No call history</div>
        ) : (
          calls.map((call) => {
            const otherUser = call.caller_id === user.id ? call.receiver : call.caller
            const isOutgoing = call.caller_id === user.id

            return (
              <div key={call.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {otherUser?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{otherUser?.display_name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      {call.call_type === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      <span>{isOutgoing ? "Outgoing" : "Incoming"}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(call.duration_seconds)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(call.created_at).toLocaleDateString()}</p>
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
