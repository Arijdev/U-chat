"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  Phone,
  Video,
  Search,
  Trash2,
  Ban,
  FileText,
  ImageIcon,
  Download,
  ChevronRight,
  Star,
} from "lucide-react"

interface ContactInfoDrawerProps {
  contact: {
    id: string
    display_name?: string
    email?: string
    status?: string
    avatar_url?: string
  }
  messages: any[]
  onClose: () => void
  onVoiceCall: () => void
  onVideoCall: () => void
  onSearchInChat: () => void
  onOpenStarredMessages?: () => void
  onClearChat?: () => void
}

export function ContactInfoDrawer({
  contact,
  messages,
  onClose,
  onVoiceCall,
  onVideoCall,
  onSearchInChat,
  onOpenStarredMessages,
  onClearChat,
}: ContactInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<"info" | "media">("info")

  // Extract media and documents from messages
  const mediaMessages = messages.filter(
    (m) => m.message_type === "photo" || m.message_type === "video"
  )
  const docMessages = messages.filter((m) => m.message_type === "document")

  return (
    <div className="w-full md:w-80 lg:w-96 bg-card border-l border-border flex flex-col shrink-0 text-card-foreground z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 border-b border-border/60 px-4 flex items-center justify-between bg-white dark:bg-[#202c33] shrink-0">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground">Contact info</h2>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21] space-y-2.5">
        {/* Contact Avatar & Name Card */}
        <div className="bg-white dark:bg-[#202c33] p-6 flex flex-col items-center justify-center text-center shadow-2xs border-b border-border/40">
          <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-4 border-card">
            {contact.avatar_url || contact.id ? (
              <img
                src={contact.avatar_url || `/api/chat/avatar?userId=${contact.id}&v=2`}
                alt={contact.display_name || "Contact"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-5xl font-bold">
                {contact.display_name?.[0]?.toUpperCase() || contact.email?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground truncate max-w-[280px]">
            {contact.display_name || contact.email?.split("@")[0] || "Contact"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-6 mt-5">
            <button
              onClick={onVoiceCall}
              className="flex flex-col items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Audio</span>
            </button>

            <button
              onClick={onVideoCall}
              className="flex flex-col items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Video</span>
            </button>

            <button
              onClick={onSearchInChat}
              className="flex flex-col items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Search</span>
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-[#202c33] p-4 shadow-2xs border-y border-border/40 space-y-1">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">About</p>
          <p className="text-sm text-foreground leading-relaxed">
            {contact.status || "Hey there! I am using Arixo."}
          </p>
        </div>

        {/* Starred Messages Section */}
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
                  <p className="text-xs text-muted-foreground">
                    {messages.filter((m) => m.is_starred || (Array.isArray(m.starred_by) && m.starred_by.length > 0)).length} starred in this chat
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Media, Links & Docs Section */}
        <div className="bg-white dark:bg-[#202c33] p-4 shadow-2xs border-y border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Media, Links and Docs
            </p>
            <span className="text-xs text-muted-foreground">
              {mediaMessages.length + docMessages.length} items
            </span>
          </div>

          {/* Media Preview Grid */}
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
                    download={m.file_name || "media"}
                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">No media shared yet</p>
          )}

          {/* Docs Preview List */}
          {docMessages.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <p className="text-[11px] font-medium text-muted-foreground">Recent Documents</p>
              {docMessages.slice(0, 3).map((doc) => (
                <a
                  key={doc.id}
                  href={doc.media_url}
                  download={doc.file_name || "document"}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left text-xs"
                >
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate flex-1 font-medium text-foreground">{doc.file_name || doc.content}</span>
                  <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Chat Actions */}
        <div className="bg-white dark:bg-[#202c33] p-2 shadow-2xs border-y border-border/40 space-y-1">
          {onClearChat && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all messages in this chat?")) {
                  onClearChat()
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat Messages</span>
            </button>
          )}

          <button
            onClick={() => alert(`Blocked ${contact.display_name || contact.email}.`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            <span>Block {contact.display_name || contact.email}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
