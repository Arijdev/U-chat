"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { Radio, CheckCircle2, Plus, Check, Loader2, ArrowLeft, X, Heart, Flame, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChannelsViewProps {
  user: User
  onClose?: () => void
}

export function ChannelsView({ user, onClose }: ChannelsViewProps) {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<any>(null)

  const loadChannels = async () => {
    try {
      const res = await fetch(`/api/chat/channels?userId=${encodeURIComponent(user.id)}`)
      if (res.ok) {
        const data = await res.json()
        setChannels(data)
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0])
        }
      }
    } catch (e) {
      console.warn("Failed to load channels:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [user.id])

  const handleToggleFollow = async (channelId: string) => {
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "follow",
          channelId,
          userId: user.id,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setChannels((prev) => prev.map((c) => (c.id === channelId ? updated : c)))
        if (selectedChannel?.id === channelId) {
          setSelectedChannel(updated)
        }
      }
    } catch (e) {}
  }

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
    return `${count}`
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background text-foreground">
      {/* Channels List (Left Column) */}
      <div className={`w-full md:w-88 bg-card border-r border-border flex flex-col shrink-0 h-full ${selectedChannel ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-emerald-300" />
            <h2 className="text-lg font-semibold tracking-wide">Channels</h2>
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

        {/* Directory Description */}
        <div className="p-3 bg-muted/40 border-b border-border text-xs text-muted-foreground leading-relaxed">
          Stay updated on topics you care about. Find channels to follow below.
        </div>

        {/* Channel Cards */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading channels...
            </div>
          ) : (
            channels.map((ch) => {
              const isFollowing = ch.followers?.includes(user.id)
              const isSelected = selectedChannel?.id === ch.id

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`p-3.5 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3.5 ${
                    isSelected ? "bg-muted/70" : ""
                  }`}
                >
                  <img
                    src={ch.avatar_url}
                    alt={ch.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-border shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm text-foreground truncate">{ch.name}</h4>
                      {ch.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 text-white shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ch.description}</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {formatFollowers(ch.followers_count)} followers
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isFollowing ? "secondary" : "default"}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleFollow(ch.id)
                    }}
                    className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
                      isFollowing
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Following
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Follow
                      </>
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Channel Post Feed (Right View) */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden">
          {/* Channel Header */}
          <div className="h-16 bg-white dark:bg-[#202c33] border-b border-border px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedChannel(null)}
                className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img
                src={selectedChannel.avatar_url}
                alt={selectedChannel.name}
                className="w-10 h-10 rounded-full object-cover border border-border shadow-xs"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground">{selectedChannel.name}</h3>
                  {selectedChannel.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 text-white" />}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {formatFollowers(selectedChannel.followers_count)} followers • Channel
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleToggleFollow(selectedChannel.id)}
              className={`rounded-full text-xs font-semibold cursor-pointer ${
                selectedChannel.followers?.includes(user.id)
                  ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {selectedChannel.followers?.includes(user.id) ? "Following" : "Follow"}
            </Button>
          </div>

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full">
            {selectedChannel.updates?.map((post: any) => (
              <div
                key={post.id}
                className="bg-white dark:bg-[#202c33] text-foreground rounded-2xl p-4 md:p-5 shadow-sm border border-border/60 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedChannel.name}</span>
                  <span>{post.time}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>

                {post.reactions && (
                  <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                    {Object.entries(post.reactions).map(([emoji, count]: any) => (
                      <span
                        key={emoji}
                        className="inline-flex items-center gap-1 bg-muted/60 text-xs px-2.5 py-1 rounded-full border border-border/50 select-none"
                      >
                        <span>{emoji}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{count.toLocaleString()}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/10 text-muted-foreground">
          <div className="text-center p-8">
            <Radio className="w-12 h-12 mx-auto mb-3 text-emerald-600 opacity-60" />
            <h3 className="font-bold text-foreground mb-1">Select a channel</h3>
            <p className="text-xs">Follow channels to receive news, announcements and updates directly in WhatsApp.</p>
          </div>
        </div>
      )}
    </div>
  )
}
