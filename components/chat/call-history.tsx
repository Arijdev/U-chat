"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, Phone, Video, Clock, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
        const supabase = createClient()
        
        // First verify the query works
        console.log('Fetching call history for user:', user.id)
        
        // First fetch call history
        const { data: calls, error: callsError } = await supabase
          .from('call_history')
          .select('*')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (callsError) {
          console.warn('Call history not available or error fetching calls:', callsError.message)
          setCalls([])
          setLoading(false)
          return
        }

        if (!calls?.length) {
          setCalls([])
          setLoading(false)
          return
        }

        // Then fetch all related profiles in one go
        const userIds = new Set<string>()
        calls.forEach(call => {
          userIds.add(call.caller_id)
          userIds.add(call.receiver_id)
        })

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', Array.from(userIds))

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError.message)
          setCalls(calls)
          setLoading(false)
          return
        }

        // Map profiles to calls
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const callsWithProfiles = calls.map(call => ({
          ...call,
          caller: profileMap.get(call.caller_id) || null,
          receiver: profileMap.get(call.receiver_id) || null
        }))

        // Errors for the two queries were handled above.
        console.log('Call history data (enriched):', callsWithProfiles)
        setCalls(callsWithProfiles || [])
        setLoading(false)
      } catch (err: any) {
        console.warn('Unexpected error loading call history:', err?.message || err)
        setCalls([])
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
      const supabase = createClient()
      const { error } = await supabase.from('call_history').delete().eq('id', id)
      if (error) {
        console.error('Error deleting call history:', error)
        toast({ title: 'Delete failed', description: error.message || 'Could not delete entry', variant: 'destructive' })
        setLoading(false)
        return
      }
      // remove from UI
      setCalls((prev) => prev.filter((c) => c.id !== id))
  toast({ title: 'Deleted', description: 'Call history entry removed', variant: 'default' })
      setLoading(false)
    } catch (err) {
      console.error('Unexpected delete error:', err)
      toast({ title: 'Delete failed', description: 'An unexpected error occurred', variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col shrink-0 text-card-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Call History</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-lg">
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
            const otherUser = call.caller_id === user.id ? call.receiver : call.caller
            const isOutgoing = call.caller_id === user.id

            return (
              <div key={call.id} className="p-3.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-xs">
                    {otherUser?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{otherUser?.display_name || "User"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {call.call_type === "video" ? <Video className="w-3.5 h-3.5 text-blue-500" /> : <Phone className="w-3.5 h-3.5 text-green-500" />}
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
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCall(call.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0" title="Delete record">
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
