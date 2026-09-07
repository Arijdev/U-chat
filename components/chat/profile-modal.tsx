"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Check, Edit2, Loader2, User as UserIcon, Info, Mail } from "lucide-react"
import { apiUpdateUserProfile, type ChatUser } from "@/lib/chat-api"
import { registerProfile } from "@/lib/dataset"

interface ProfileModalProps {
  user: User
  currentProfile: Partial<ChatUser> | null
  onClose: () => void
  onProfileUpdated: (updated: ChatUser) => void
}

export function ProfileModal({
  user,
  currentProfile,
  onClose,
  onProfileUpdated,
}: ProfileModalProps) {
  const initialName =
    currentProfile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User"
  const initialStatus = currentProfile?.status || "Hey there! I am using Arixo."

  const [displayName, setDisplayName] = useState(initialName)
  const [status, setStatus] = useState(initialStatus)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    setSavedSuccess(false)

    try {
      const trimmedName = displayName.trim()
      const trimmedStatus = status.trim()

      // 1. Update server store
      const updated = await apiUpdateUserProfile(user.id, {
        display_name: trimmedName,
        status: trimmedStatus,
      })

      // 2. Update local dataset cache
      registerProfile({
        id: user.id,
        email: user.email || "",
        display_name: trimmedName,
      })

      // 3. Update Supabase Auth user metadata
      try {
        const supabase = createClient()
        await supabase.auth.updateUser({
          data: {
            display_name: trimmedName,
            status: trimmedStatus,
          },
        })
      } catch (e) {}

      setIsEditingName(false)
      setIsEditingStatus(false)
      setSavedSuccess(true)

      if (updated) {
        onProfileUpdated(updated)
      } else {
        onProfileUpdated({
          id: user.id,
          email: user.email || "",
          display_name: trimmedName,
          status: trimmedStatus,
        })
      }

      setTimeout(() => {
        setSavedSuccess(false)
      }, 2500)
    } catch (err) {
      console.error("Failed to update profile:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden text-card-foreground">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            <h2 className="text-base font-semibold">Profile Settings</h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-emerald-700/60 h-8 w-8 p-0 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-card">
              {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Arixo Profile</p>
          </div>

          {/* Display Name Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Your Name
            </label>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    maxLength={35}
                    className="h-10 text-sm bg-muted/40 border-border rounded-xl"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !displayName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-3 rounded-xl cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between p-2.5 bg-muted/30 rounded-xl border border-border/50">
                  <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(true)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 rounded-lg cursor-pointer"
                    title="Edit name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              This is not your username or pin. This name will be visible to your Arixo contacts.
            </p>
          </div>

          {/* About / Status Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> About / Status
            </label>
            <div className="flex items-center gap-2">
              {isEditingStatus ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    maxLength={80}
                    className="h-10 text-sm bg-muted/40 border-border rounded-xl"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-3 rounded-xl cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between p-2.5 bg-muted/30 rounded-xl border border-border/50">
                  <span className="text-sm text-foreground truncate">{status}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingStatus(true)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 rounded-lg cursor-pointer"
                    title="Edit about"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Email (Read Only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <div className="p-2.5 bg-muted/20 rounded-xl border border-border/40 text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>

          {/* Success Message */}
          {savedSuccess && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center animate-in fade-in">
              Profile updated successfully!
            </div>
          )}

          {/* Save All Button if editing */}
          {(isEditingName || isEditingStatus) && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingName(false)
                  setIsEditingStatus(false)
                  setDisplayName(initialName)
                  setStatus(initialStatus)
                }}
                className="h-9 px-4 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs rounded-xl cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
