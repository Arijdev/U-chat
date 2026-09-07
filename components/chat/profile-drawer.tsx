"use client"

import { useState, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Camera,
  Check,
  Edit2,
  Loader2,
  Trash2,
  Upload,
  Smile,
} from "lucide-react"
import { apiUpdateUserProfile, type ChatUser } from "@/lib/chat-api"
import { registerProfile } from "@/lib/dataset"

interface ProfileDrawerProps {
  user: User
  currentProfile: Partial<ChatUser> | null
  onClose: () => void
  onProfileUpdated: (updated: ChatUser) => void
}

const WHATSAPP_STATUS_PRESETS = [
  "Available",
  "Busy",
  "At work",
  "In a meeting",
  "At school",
  "At the movies",
  "Can't talk, Arixo only",
  "Sleeping",
  "Urgent calls only",
]

export function ProfileDrawer({
  user,
  currentProfile,
  onClose,
  onProfileUpdated,
}: ProfileDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialName =
    currentProfile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User"
  const initialStatus =
    currentProfile?.status ||
    user.user_metadata?.status ||
    "Hey there! I am using Arixo."
  const initialAvatar =
    currentProfile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    `/api/chat/avatar?userId=${user.id}`

  const [displayName, setDisplayName] = useState(initialName)
  const [status, setStatus] = useState(initialStatus)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)

  // Save profile updates to server & Supabase metadata
  const saveUpdates = async (updates: {
    display_name?: string
    status?: string
    avatar_url?: string
  }) => {
    setSaving(true)
    try {
      const trimmedName = updates.display_name !== undefined ? updates.display_name.trim() : displayName.trim()
      const trimmedStatus = updates.status !== undefined ? updates.status.trim() : status.trim()
      const finalAvatar = updates.avatar_url !== undefined ? updates.avatar_url : avatarUrl

      // 1. Update Server Store (persisted to file and broadcasted via SSE)
      const updated = await apiUpdateUserProfile(user.id, {
        display_name: trimmedName,
        status: trimmedStatus,
        avatar_url: finalAvatar,
      })

      // 2. Update local dataset cache
      registerProfile({
        id: user.id,
        email: user.email || "",
        display_name: trimmedName,
      })

      // 3. Update Supabase Auth user metadata (ONLY safe URLs, NEVER base64 data URLs in cookies)
      try {
        const supabase = createClient()
        const safeAvatar = finalAvatar && finalAvatar.startsWith("data:") ? `/api/chat/avatar?userId=${user.id}` : finalAvatar
        await supabase.auth.updateUser({
          data: {
            display_name: trimmedName,
            status: trimmedStatus,
            avatar_url: safeAvatar,
          },
        })
      } catch (e) {}

      const result: ChatUser = updated || {
        id: user.id,
        email: user.email || "",
        display_name: trimmedName,
        status: trimmedStatus,
        avatar_url: finalAvatar,
      }

      onProfileUpdated(result)
    } catch (err) {
      console.error("Failed to update profile:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    await saveUpdates({ display_name: displayName })
    setIsEditingName(false)
  }

  const handleSaveStatus = async (newStatusText?: string) => {
    const textToSave = newStatusText || status
    if (!textToSave.trim()) return
    setStatus(textToSave)
    await saveUpdates({ status: textToSave })
    setIsEditingStatus(false)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setShowPhotoOptions(false)
      setSaving(true)

      try {
        // Upload to server-side avatar storage
        const res = await fetch("/api/chat/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, dataUrl }),
        })
        const data = await res.json()
        const cleanAvatarUrl = data.avatar_url || `/api/chat/avatar?userId=${user.id}&t=${Date.now()}`

        try {
          localStorage.setItem(`u_chat_avatar_${user.id}`, cleanAvatarUrl)
        } catch (e) {}

        setAvatarUrl(cleanAvatarUrl)
        await saveUpdates({ avatar_url: cleanAvatarUrl })
      } catch (err) {
        console.error("Error saving avatar:", err)
        // Fallback save to server store
        setAvatarUrl(dataUrl)
        await saveUpdates({ avatar_url: dataUrl })
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleRemovePhoto = async () => {
    setAvatarUrl("")
    setShowPhotoOptions(false)
    await saveUpdates({ avatar_url: "" })
  }

  return (
    <div className="absolute inset-0 z-40 bg-background flex flex-col animate-in slide-in-from-left duration-200">
      {/* WhatsApp Green Profile Header */}
      <div className="h-28 bg-[#008069] dark:bg-[#202c33] text-white flex items-end p-5 pb-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="hover:bg-black/10 p-1.5 rounded-full transition-colors cursor-pointer"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-medium text-white">Profile</h1>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21]">
        {/* Profile Photo Section */}
        <div className="py-7 flex flex-col items-center justify-center relative">
          <div className="relative group">
            {avatarUrl || user.id ? (
              <img
                src={avatarUrl || `/api/chat/avatar?userId=${user.id}`}
                alt="Profile"
                className="w-48 h-48 rounded-full object-cover shadow-lg border-4 border-white dark:border-[#202c33]"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-6xl font-bold shadow-lg border-4 border-white dark:border-[#202c33]">
                {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
              </div>
            )}

            {/* Hover overlay for Change Photo */}
            <button
              onClick={() => setShowPhotoOptions(!showPhotoOptions)}
              className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
              title="Change profile photo"
            >
              <Camera className="w-7 h-7" />
              <span className="text-[11px] font-medium tracking-wide uppercase">Change Profile Photo</span>
            </button>
          </div>

          {/* Photo Options Dropdown */}
          {showPhotoOptions && (
            <div className="mt-3 bg-card border border-border rounded-xl shadow-xl p-2 w-52 space-y-1 animate-in fade-in z-10">
              <button
                onClick={() => {
                  setShowPhotoOptions(false)
                  fileInputRef.current?.click()
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium hover:bg-muted cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Upload photo</span>
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove photo</span>
                </button>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </div>

        {/* Your Name Section */}
        <div className="bg-white dark:bg-[#111b21] p-4 shadow-2xs border-y border-border/40 space-y-2">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Your name</p>
          <div className="flex items-center justify-between gap-3">
            {isEditingName ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  maxLength={25}
                  className="h-9 text-sm bg-transparent border-b-2 border-emerald-500 rounded-none border-x-0 border-t-0 focus-visible:ring-0 px-0"
                  autoFocus
                />
                <span className="text-[11px] text-muted-foreground">{25 - displayName.length}</span>
                <button
                  onClick={handleSaveName}
                  disabled={saving || !displayName.trim()}
                  className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-normal text-foreground">{displayName}</p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-muted-foreground hover:text-emerald-600 p-1 cursor-pointer"
                  title="Edit name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <p className="px-5 py-3 text-xs text-muted-foreground leading-relaxed">
          This is not your username or pin. This name will be visible to your Arixo contacts.
        </p>

        {/* About Section */}
        <div className="bg-white dark:bg-[#111b21] p-4 shadow-2xs border-y border-border/40 space-y-2">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">About</p>
          <div className="flex items-center justify-between gap-3">
            {isEditingStatus ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveStatus()}
                  maxLength={80}
                  className="h-9 text-sm bg-transparent border-b-2 border-emerald-500 rounded-none border-x-0 border-t-0 focus-visible:ring-0 px-0"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveStatus()}
                  disabled={saving || !status.trim()}
                  className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-normal text-foreground">{status}</p>
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="text-muted-foreground hover:text-emerald-600 p-1 cursor-pointer"
                  title="Edit about"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* WhatsApp Presets */}
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Select About Status</p>
          <div className="bg-white dark:bg-[#111b21] rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden shadow-2xs">
            {WHATSAPP_STATUS_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSaveStatus(preset)}
                className={`w-full text-left p-3 text-xs flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer ${
                  status === preset ? "text-emerald-600 font-semibold" : "text-foreground"
                }`}
              >
                <span>{preset}</span>
                {status === preset && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Email & Account Details */}
        <div className="p-4 pt-0 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Account</p>
          <div className="bg-white dark:bg-[#111b21] p-3.5 rounded-xl border border-border/50 text-xs space-y-1">
            <p className="text-foreground font-medium">{user.email}</p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">ID: {user.id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
