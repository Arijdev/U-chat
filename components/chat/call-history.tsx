"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  Video,
  Clock,
  Trash2,
  Search,
  X,
  MoreVertical,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLocalCallHistory, deleteLocalCall, getKnownProfiles } from "@/lib/dataset"

interface CallHistoryProps {
  user: User
  onClose: () => void
  onStartCall?: (type: "voice" | "video", otherUser: any) => void
}

export default function CallHistory({ user, onClose, onStartCall }: CallHistoryProps) {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<"all" | "missed">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showNewCallModal, setShowNewCallModal] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      window.addEventListener("mousedown", handleOutsideClick)
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick)
  }, [showMenu])

  const loadCallHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/chat/calls?userId=${encodeURIComponent(user.id)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
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

  useEffect(() => {
    loadCallHistory()
  }, [user.id])

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return "0s"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }

  const formatCallDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const isYesterday = date.toDateString() === yesterday.toDateString()

      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      if (isToday) return `Today, ${timeStr}`
      if (isYesterday) return `Yesterday, ${timeStr}`
      return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`
    } catch (e) {
      return "Recent"
    }
  }

  const handleDeleteCall = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      deleteLocalCall(id)
      setCalls((prev) => prev.filter((c) => c.id !== id))
      await fetch(`/api/chat/calls?callId=${encodeURIComponent(id)}`, { method: "DELETE" })
      toast({ title: "Deleted", description: "Call log entry removed" })
    } catch (err) {
      console.error("Error deleting call:", err)
    }
  }

  const handleClearAll = async () => {
    setShowMenu(false)
    if (!window.confirm("Clear entire call history?")) return
    try {
      setCalls([])
      await fetch(`/api/chat/calls?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" })
      toast({ title: "Cleared", description: "All call logs cleared" })
    } catch (err) {
      console.error("Error clearing calls:", err)
    }
  }

  // Known contacts for starting a new call
  const contacts = useMemo(() => {
    const list = getKnownProfiles().filter((p) => p.id !== user.id)
    if (!contactSearch.trim()) return list
    const q = contactSearch.toLowerCase()
    return list.filter(
      (p) =>
        p.display_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
    )
  }, [user.id, contactSearch])

  // Filtered calls
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const isOutgoing = call.caller_id === user.id
      const isMissed = !isOutgoing && (call.status === "rejected" || !call.duration_seconds || call.duration_seconds === 0)
      
      if (activeFilter === "missed" && !isMissed) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const otherUserName = isOutgoing
          ? call.receiver?.display_name || call.receiver?.email || ""
          : call.caller?.display_name || call.caller?.email || ""
        if (!otherUserName.toLowerCase().includes(query)) return false
      }

      return true
    })
  }, [calls, activeFilter, searchQuery, user.id])

  return (
    <div className="w-full md:w-96 lg:w-[440px] h-full bg-white dark:bg-[#111b21] md:border-r border-border/60 flex flex-col shrink-0 text-foreground relative overflow-hidden select-none">
      {/* 1. Header (Mobile-first responsive bar) */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-white dark:bg-[#202c33] flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
              Calls
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {calls.length} total • WebRTC Encrypted
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowSearch((prev) => !prev)
              if (showSearch) setSearchQuery("")
            }}
            className={`h-9 w-9 p-0 rounded-full transition-colors cursor-pointer ${
              showSearch ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            title="Search call log"
          >
            <Search className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewCallModal(true)}
            className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="New call"
          >
            <PhoneCall className="w-4 h-4" />
          </Button>

          {/* More Options Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMenu((prev) => !prev)}
              className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-44 bg-card border border-border/80 rounded-xl shadow-xl py-1 z-30 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear call log</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Expandable Search Bar */}
      {showSearch && (
        <div className="px-3.5 py-2 border-b border-border/50 bg-[#f0f2f5] dark:bg-[#111b21] animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
            <Input
              type="text"
              placeholder="Search calls by contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-[#202c33] border-none rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Filter Pills (All vs Missed) */}
      <div className="px-3.5 py-2.5 bg-white dark:bg-[#111b21] border-b border-border/40 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === "all"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-muted/60 dark:bg-[#202c33] text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setActiveFilter("missed")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === "missed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-muted/60 dark:bg-[#202c33] text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Missed</span>
          {calls.some(
            (c) =>
              c.caller_id !== user.id &&
              (c.status === "rejected" || !c.duration_seconds || c.duration_seconds === 0)
          ) && (
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          )}
        </button>
      </div>

      {/* 4. Calls Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30 pb-20 md:pb-6">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading call history...</span>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center mt-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner">
              <Phone className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {searchQuery ? "No matching calls found" : activeFilter === "missed" ? "No missed calls" : "No call history"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                {searchQuery
                  ? "Try searching for a different contact name."
                  : "Call history will automatically show incoming, outgoing, and missed calls."}
              </p>
            </div>
            <Button
              onClick={() => setShowNewCallModal(true)}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start a new call</span>
            </Button>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const isOutgoing = call.caller_id === user.id
            const otherUser = isOutgoing ? call.receiver : call.caller
            const otherUserName =
              otherUser?.display_name || otherUser?.email?.split("@")[0] || "Contact"
            const otherUserId = isOutgoing ? call.receiver_id : call.caller_id

            const isMissed =
              !isOutgoing &&
              (call.status === "rejected" || !call.duration_seconds || call.duration_seconds === 0)

            return (
              <div
                key={call.id}
                className="p-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors flex items-center justify-between gap-3 group"
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {otherUserId ? (
                      <img
                        src={`/api/chat/avatar?userId=${otherUserId}`}
                        alt={otherUserName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide image and fall back to initial letter
                          ;(e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : null}
                    <span>{otherUserName?.[0]?.toUpperCase() || "?"}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold text-sm truncate ${
                        isMissed ? "text-red-500 dark:text-red-400 font-bold" : "text-foreground"
                      }`}
                    >
                      {otherUserName}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      {/* Direction Icon */}
                      {isMissed ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : isOutgoing ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}

                      <span className={isMissed ? "text-red-500 font-medium" : ""}>
                        {isMissed ? "Missed" : isOutgoing ? "Outgoing" : "Incoming"}
                      </span>

                      <span>•</span>

                      <span className="truncate">{formatCallDate(call.created_at)}</span>

                      {call.duration_seconds && call.duration_seconds > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-muted-foreground/80">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Callback button & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onStartCall && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onStartCall(call.call_type || "voice", {
                          id: otherUserId,
                          display_name: otherUserName,
                          email: otherUser?.email,
                        })
                      }
                      className="w-9 h-9 p-0 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/15 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer shrink-0"
                      title={`Call back with ${call.call_type || "voice"}`}
                    >
                      {call.call_type === "video" ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteCall(call.id, e)}
                    className="w-8 h-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                    title="Delete call record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. Mobile Floating Action Button (FAB) to Start Call */}
      <button
        onClick={() => setShowNewCallModal(true)}
        className="md:hidden fixed bottom-20 right-5 z-20 w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl flex items-center justify-center cursor-pointer transition-all duration-200"
        title="Start new call"
      >
        <PhoneCall className="w-5 h-5" />
      </button>

      {/* 6. Start New Call Contact Picker Modal */}
      {showNewCallModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-50"
          onClick={() => setShowNewCallModal(false)}
        >
          <div
            className="bg-card text-card-foreground border border-border/80 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600/15 text-emerald-600 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Select contact to call</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewCallModal(false)}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Contact Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
              <Input
                type="text"
                placeholder="Search contact name or email..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                autoFocus
              />
            </div>

            {/* Contacts Roster */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40 min-h-[220px]">
              {contacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No contacts found
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-muted/40 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {contact.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {contact.display_name || contact.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {contact.email || "Active on Arixo Web"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowNewCallModal(false)
                          onStartCall?.("voice", contact)
                        }}
                        className="w-8 h-8 p-0 rounded-full text-emerald-600 hover:bg-emerald-600/15 cursor-pointer"
                        title="Start voice call"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowNewCallModal(false)
                          onStartCall?.("video", contact)
                        }}
                        className="w-8 h-8 p-0 rounded-full text-blue-600 hover:bg-blue-600/15 cursor-pointer"
                        title="Start video call"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
