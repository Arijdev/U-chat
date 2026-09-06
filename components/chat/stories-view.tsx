"use client"

import type React from "react"

import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Trash2 } from "lucide-react"

import { getLocalStories, saveLocalStory, deleteLocalStory } from "@/lib/dataset"

interface StoriesViewProps {
  user: User
  onClose: () => void
}

export default function StoriesView({ user, onClose }: StoriesViewProps) {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [caption, setCaption] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    const supabase = createClient()
    let remoteStories: any[] = []
    try {
      const { data } = await supabase
        .from("stories")
        .select("*, user:profiles(id, display_name, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
      if (data) remoteStories = data
    } catch (e) {}

    const localStories = getLocalStories()
    const map = new Map<string, any>()
    localStories.forEach((s) => map.set(s.id, s))
    remoteStories.forEach((s) => map.set(s.id, s))

    setStories(Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Guard against huge base64 blobs in DB (base64 is ~33% larger than raw)
      if (file.size > 750_000) {
        alert("Image too large. Please select an image under 750KB.")
        e.target.value = ""
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateStory = async () => {
    if (!previewUrl || !selectedFile) return

    const newStory = {
      id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: user.id,
      media_url: previewUrl,
      caption: caption || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    saveLocalStory(newStory)

    setCaption("")
    setSelectedFile(null)
    setPreviewUrl(null)
    setShowCreateForm(false)
    loadStories()

    const supabase = createClient()
    try {
      await supabase.from("stories").insert({
        user_id: user.id,
        media_url: previewUrl,
        caption: caption || null,
      })
    } catch (e) {}
  }

  const handleDeleteStory = async (storyId: string) => {
    deleteLocalStory(storyId)
    setStories((prev) => prev.filter((s) => s.id !== storyId))

    const supabase = createClient()
    try {
      await supabase.from("stories").delete().eq("id", storyId)
    } catch (e) {}
  }

  return (
    <div className="flex-1 bg-background flex flex-col text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-foreground text-lg font-bold">Stories</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-lg">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Stories Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground pt-6">Loading stories...</div>
        ) : stories.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8 space-y-1">
            <p className="text-base font-semibold text-foreground">No stories yet</p>
            <p className="text-xs">Create one to share with your contacts!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="relative aspect-square bg-muted rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group border border-border/50 shadow-xs"
              >
                <img src={story.media_url || "/placeholder.svg"} alt="Story" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                  <p className="text-white text-xs font-semibold truncate">{story.user?.display_name || "User"}</p>
                  <p className="text-white/70 text-[10px]">
                    {new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {story.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteStory(story.id)}
                    className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Delete story"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Story Form */}
      {showCreateForm && (
        <div className="border-t border-border bg-card p-4">
          <div className="space-y-3">
            {previewUrl && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20">
                <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
            <Input
              placeholder="Add a caption (optional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground text-sm rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
              >
                {previewUrl ? "Change Photo" : "Select Photo"}
              </Button>
              <Button
                onClick={handleCreateStory}
                disabled={!previewUrl}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 rounded-xl text-xs"
              >
                Post Story
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  setPreviewUrl(null)
                  setCaption("")
                }}
                variant="outline"
                className="border-border text-foreground rounded-xl text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Button */}
      {!showCreateForm && (
        <div className="border-t border-border p-4 bg-card">
          <Button onClick={() => setShowCreateForm(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Create Story
          </Button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
