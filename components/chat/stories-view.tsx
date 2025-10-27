"use client"

import type React from "react"

import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Trash2 } from "lucide-react"

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
    const { data } = await supabase
      .from("stories")
      .select("*, user:profiles(id, display_name, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    setStories(data || [])
    setLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

    const supabase = createClient()
    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      media_url: previewUrl,
      caption: caption || null,
    })

    if (!error) {
      setCaption("")
      setSelectedFile(null)
      setPreviewUrl(null)
      setShowCreateForm(false)
      loadStories()
    }
  }

  const handleDeleteStory = async (storyId: string) => {
    const supabase = createClient()
    await supabase.from("stories").delete().eq("id", storyId)
    loadStories()
  }

  return (
    <div className="flex-1 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">Stories</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-white hover:bg-gray-800">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Stories Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400">Loading stories...</div>
        ) : stories.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg">No stories yet</p>
            <p className="text-sm">Create one to share with your contacts!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
              >
                <img src={story.media_url || "/placeholder.svg"} alt="Story" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                  <p className="text-white text-sm font-semibold">{story.user?.display_name}</p>
                  <p className="text-gray-300 text-xs">
                    {new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {story.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteStory(story.id)}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Story Form */}
      {showCreateForm && (
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <div className="space-y-3">
            {previewUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <Input
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {previewUrl ? "Change Photo" : "Select Photo"}
              </Button>
              <Button
                onClick={handleCreateStory}
                disabled={!previewUrl}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
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
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Button */}
      {!showCreateForm && (
        <div className="border-t border-gray-800 p-4 bg-gray-900">
          <Button onClick={() => setShowCreateForm(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Create Story
          </Button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
