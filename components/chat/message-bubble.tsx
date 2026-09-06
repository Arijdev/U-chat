"use client"

import { useEffect, useState, memo } from "react"
import { Trash2 } from "lucide-react"

interface MessageBubbleProps {
  msg: any
  isOwn: boolean
  onGetDecrypted: (msg: any) => Promise<string>
  onDelete: (id: string) => void
}

export const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
  onGetDecrypted,
  onDelete,
}: MessageBubbleProps) {
  const [content, setContent] = useState(msg.content)

  useEffect(() => {
    onGetDecrypted(msg).then(setContent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.id, msg.content]) // only re-run when message data changes, not on every parent render

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
      <div
        className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl relative shadow-xs transition-all ${
          isOwn
            ? "bg-blue-600 text-white rounded-br-xs"
            : "bg-muted text-foreground border border-border/50 rounded-bl-xs"
        }`}
      >
        {msg.message_type === "photo" && msg.media_url ? (
          <div className="space-y-2">
            <img
              src={msg.media_url || "/placeholder.svg"}
              alt="Shared photo"
              className="max-w-xs md:max-w-sm rounded-xl object-contain max-h-72"
            />
            {content && content !== "Shared a photo" && <p className="text-sm font-normal">{content}</p>}
          </div>
        ) : (
          <p className="break-words text-sm leading-relaxed">{content}</p>
        )}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${isOwn ? "text-blue-100/75" : "text-muted-foreground"}`}>
          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {isOwn && (
          <button
            onClick={() => onDelete(msg.id)}
            className="absolute -right-2 -top-2 bg-card border border-border text-destructive hover:text-destructive/80 p-1 rounded-full shadow-md transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
})
