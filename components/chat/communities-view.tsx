"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { Users2, Plus, MessageSquare, ChevronRight, X, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CommunitiesViewProps {
  user: User
  onClose?: () => void
  onOpenGroupChat?: (groupName: string) => void
}

export function CommunitiesView({ user, onClose, onOpenGroupChat }: CommunitiesViewProps) {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCommunityModal, setShowNewCommunityModal] = useState(false)
  const [commName, setCommName] = useState("")
  const [commDesc, setCommDesc] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/communities")
        if (res.ok) {
          const data = await res.json()
          setCommunities(data)
        }
      } catch (e) {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateCommunity = () => {
    if (!commName.trim()) return
    const newComm = {
      id: `comm_${Date.now()}`,
      name: commName.trim(),
      description: commDesc.trim() || "Community group",
      avatar_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
      members_count: 1,
      announcement_group: "Announcements",
      groups: [{ id: `grp_${Date.now()}`, name: "General Discussion", member_count: 1 }],
    }
    setCommunities((prev) => [newComm, ...prev])
    setShowNewCommunityModal(false)
    setCommName("")
    setCommDesc("")
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden select-none">
      {/* Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between px-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Users2 className="w-5 h-5 text-emerald-300" />
          <h2 className="text-lg font-semibold tracking-wide">Communities</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full">
        {/* New Community Hero Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 border border-border shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base text-foreground">Stay connected with a community</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                Bring members together in topic-based groups and easily send admin announcements.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewCommunityModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" /> New Community
          </Button>
        </div>

        {/* Communities List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Your Communities</h3>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading communities...
            </div>
          ) : (
            communities.map((comm) => (
              <div
                key={comm.id}
                className="bg-card text-card-foreground rounded-2xl border border-border shadow-xs overflow-hidden"
              >
                {/* Community Title Banner */}
                <div className="p-4 bg-muted/30 flex items-center gap-3.5 border-b border-border/50">
                  <img
                    src={comm.avatar_url}
                    alt={comm.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border shadow-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{comm.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{comm.description}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {comm.members_count.toLocaleString()} members
                    </p>
                  </div>
                </div>

                {/* Sub-groups */}
                <div className="divide-y divide-border/30">
                  {/* Announcement Channel */}
                  <div className="p-3 hover:bg-muted/40 transition-colors flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center text-xs font-bold">
                        📢
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{comm.announcement_group || "Announcements"}</p>
                        <p className="text-[10px] text-muted-foreground">Admin announcements</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Discussion Groups */}
                  {comm.groups?.map((grp: any) => (
                    <div
                      key={grp.id}
                      onClick={() => onOpenGroupChat?.(grp.name)}
                      className="p-3 hover:bg-muted/40 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{grp.name}</p>
                          <p className="text-[10px] text-muted-foreground">{grp.member_count?.toLocaleString()} members</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Community Modal */}
      {showNewCommunityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create Community</h3>
              <button
                onClick={() => setShowNewCommunityModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. University Club or Office Team"
                  value={commName}
                  onChange={(e) => setCommName(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <textarea
                  placeholder="Describe the purpose of this community..."
                  value={commDesc}
                  onChange={(e) => setCommDesc(e.target.value)}
                  className="w-full h-20 p-3 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewCommunityModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCommunity}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer"
              >
                Create Community
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
