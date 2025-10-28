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
          console.error('Error fetching calls:', callsError)
          throw callsError
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
          console.error('Error fetching profiles:', profilesError)
          throw profilesError
        }

        // Map profiles to calls
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const callsWithProfiles = calls.map(call => ({
          ...call,
          caller: profileMap.get(call.caller_id) || null,
          receiver: profileMap.get(call.receiver_id) || null
        }))

        // Errors for the two queries were handled above (callsError / profilesError).
        // Use the enriched call entries we just built.
        console.log('Call history data (enriched):', callsWithProfiles)
        setCalls(callsWithProfiles || [])
        setLoading(false)
      } catch (err) {
        console.error('Unexpected error:', err)
        toast({
          title: "Error loading call history",
          description: "An unexpected error occurred",
          variant: "destructive"
        })
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
                  <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                    {otherUser?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{otherUser?.display_name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      {call.call_type === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      <span>{isOutgoing ? "Outgoing" : "Incoming"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(call.duration_seconds)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(call.created_at).toLocaleDateString()}</p>
                    <div className="mt-2">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCall(call.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
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
