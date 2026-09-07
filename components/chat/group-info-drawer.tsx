"use client"

import { useState, useEffect } from "react"
import {
  X,
  Users,
  UserPlus,
  Star,
  Search,
  Trash2,
  LogOut,
  Check,
  Shield,
  Pencil,
  FileText,
  Download,
  ChevronRight,
  Loader2,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getKnownProfiles } from "@/lib/dataset"
import type { User } from "@supabase/supabase-js"

interface GroupInfoDrawerProps {
  user: User
  group: {
    id: string
    group_name?: string
    display_name?: string
    group_avatar?: string
    avatar_url?: string
    creator_id?: string
    participant_1_id?: string
    group_members?: string[]
    members?: any[]
  }
  messages: any[]
  onClose: () => void
  onOpenStarredMessages?: () => void
  onGroupUpdated?: (updated: any) => void
  onLeaveGroup?: () => void
}

export function GroupInfoDrawer({
  user,
  group,
  messages,
  onClose,
  onOpenStarredMessages,
  onGroupUpdated,
  onLeaveGroup,
}: GroupInfoDrawerProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [groupName, setGroupName] = useState(group.group_name || group.display_name || "Group")
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<any[]>([])
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")

  const memberIds = group.group_members || []
  const adminId = group.creator_id || group.participant_1_id
  const isCurrentUserAdmin = adminId === user.id

  // Load known contacts not yet in this group
  useEffect(() => {
    const all = getKnownProfiles()
    const notInGroup = all.filter((p) => p.id !== user.id && !memberIds.includes(p.id))
    setAvailableContacts(notInGroup)
  }, [memberIds, user.id])

  const handleSaveName = async () => {
    if (!groupName.trim()) return
    try {
      setSaving(true)
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_group",
          groupId: group.id,
          name: groupName.trim(),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onGroupUpdated?.(updated)
        setIsEditingName(false)
      }
    } catch (e) {
      console.warn("Failed to update group name:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return
    try {
      setSaving(true)
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_members",
          groupId: group.id,
          newMemberIds: selectedNewMembers,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onGroupUpdated?.(updated)
        setSelectedNewMembers([])
        setIsAddingMembers(false)
      }
    } catch (e) {
      console.warn("Failed to add members:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this member from the group?")) return
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_member",
          groupId: group.id,
          memberIdToRemove: memberId,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onGroupUpdated?.(updated)
      }
    } catch (e) {
      console.warn("Failed to remove member:", e)
    }
  }

  const handleExitGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_member",
          groupId: group.id,
          memberIdToRemove: user.id,
        }),
      })
      if (res.ok) {
        onLeaveGroup?.()
      }
    } catch (e) {
      console.warn("Failed to exit group:", e)
    }
  }

  // Get full member profiles
  const knownProfiles = getKnownProfiles()
  const memberProfiles = memberIds.map((mId) => {
    if (mId === user.id) {
      return {
        id: user.id,
        display_name: user.user_metadata?.display_name || "You",
        email: user.email || "",
        avatar_url: user.user_metadata?.avatar_url,
        isSelf: true,
      }
    }
    const found = knownProfiles.find((p) => p.id === mId)
    return {
      id: mId,
      display_name: found?.display_name || found?.email?.split("@")[0] || "Member",
      email: found?.email || "",
      avatar_url: found?.avatar_url,
      isSelf: false,
    }
  })

  const filteredMembers = memberSearchQuery.trim()
    ? memberProfiles.filter((m) =>
        m.display_name.toLowerCase().includes(memberSearchQuery.toLowerCase())
      )
    : memberProfiles

  const mediaMessages = messages.filter((m) => m.message_type === "photo" || m.message_type === "video")
  const docMessages = messages.filter((m) => m.message_type === "document")
  const starredCount = messages.filter(
    (m) => m.is_starred || (Array.isArray(m.starred_by) && m.starred_by.length > 0)
  ).length

  return (
    <div className="w-full md:w-80 lg:w-96 bg-[#f0f2f5] dark:bg-[#111b21] border-l border-border flex flex-col shrink-0 text-foreground z-20 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 border-b border-border/60 px-4 flex items-center justify-between bg-[#008069] dark:bg-[#202c33] text-white shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-emerald-300" />
          <h2 className="text-base font-semibold tracking-wide">Group Info</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
          title="Close group info"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
        {/* Group Hero (Avatar & Name) */}
        <div className="bg-white dark:bg-[#202c33] p-6 shadow-2xs border-b border-border/40 flex flex-col items-center text-center space-y-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md relative group">
            {group.group_avatar || group.avatar_url ? (
              <img
                src={group.group_avatar || group.avatar_url}
                alt="Group icon"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <Users className="w-12 h-12 text-white" />
            )}
          </div>

          <div className="w-full space-y-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500 bg-background text-foreground text-sm font-semibold text-center focus:outline-none"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={saving || !groupName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-2.5 text-xs font-semibold"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setGroupName(group.group_name || group.display_name || "Group")
                    setIsEditingName(false)
                  }}
                  className="rounded-xl h-8 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-bold text-foreground truncate">{groupName}</h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-muted-foreground hover:text-emerald-600 p-1 cursor-pointer transition-colors"
                  title="Edit group name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Group · {memberIds.length} participant{memberIds.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Starred Messages Row */}
        {onOpenStarredMessages && (
          <div className="bg-white dark:bg-[#202c33] shadow-2xs border-y border-border/40">
            <button
              onClick={onOpenStarredMessages}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Starred Messages</p>
                  <p className="text-xs text-muted-foreground">{starredCount} starred in this group</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Media, Links and Docs Section */}
        <div className="bg-white dark:bg-[#202c33] p-4 shadow-2xs border-y border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Media, Links and Docs
            </p>
            <span className="text-xs text-muted-foreground">
              {mediaMessages.length + docMessages.length} items
            </span>
          </div>

          {mediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaMessages.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/30 relative group"
                >
                  {m.message_type === "video" ? (
                    <video src={m.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.media_url} alt="Media" className="w-full h-full object-cover" />
                  )}
                  <a
                    href={m.media_url}
                    download="media"
                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">No media shared in this group</p>
          )}
        </div>

        {/* Group Participants Section */}
        <div className="bg-white dark:bg-[#202c33] p-4 shadow-2xs border-y border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {memberIds.length} Participants
            </p>
            <button
              onClick={() => setIsAddingMembers(!isAddingMembers)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          {/* Add Member Dropdown Panel */}
          {isAddingMembers && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2.5 animate-in fade-in-50">
              <p className="text-xs font-semibold text-foreground">Select Contacts to Add</p>
              {availableContacts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  All known contacts are already members of this group.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableContacts.map((contact) => {
                    const isSelected = selectedNewMembers.includes(contact.id)
                    return (
                      <div
                        key={contact.id}
                        onClick={() =>
                          setSelectedNewMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== contact.id) : [...prev, contact.id]
                          )
                        }
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-emerald-500/10 border border-emerald-500/40" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {contact.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium truncate">{contact.display_name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {availableContacts.length > 0 && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingMembers(false)}
                    className="h-7 text-xs px-2 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddMembers}
                    disabled={saving || selectedNewMembers.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3 rounded-lg font-semibold"
                  >
                    Add ({selectedNewMembers.length})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Member Search Bar if > 4 members */}
          {memberProfiles.length > 4 && (
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50 text-xs">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search participants..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 focus:outline-none text-foreground text-xs"
              />
            </div>
          )}

          {/* Members List */}
          <div className="space-y-1">
            {filteredMembers.map((member) => {
              const isAdmin = member.id === adminId

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.display_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        member.display_name[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {member.isSelf ? "You" : member.display_name}
                        </p>
                        {isAdmin && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-500/20">
                            Group Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions (if admin and not self) */}
                  {isCurrentUserAdmin && !member.isSelf && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 cursor-pointer transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Exit Group Button */}
        <div className="bg-white dark:bg-[#202c33] p-2 shadow-2xs border-y border-border/40">
          <button
            onClick={handleExitGroup}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Group</span>
          </button>
        </div>
      </div>
    </div>
  )
}
