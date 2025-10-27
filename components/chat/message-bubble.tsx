"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

interface MessageBubbleProps {
  msg: any
  isOwn: boolean
  onGetDecrypted: (msg: any) => Promise<string>
  onDelete: (id: string) => void
}

export function MessageBubble({ msg, isOwn, onGetDecrypted, onDelete }: MessageBubbleProps) {
  const [content, setContent] = useState(msg.content)

  useEffect(() => {
    onGetDecrypted(msg).then(setContent)
  }, [msg, onGetDecrypted])

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-lg relative ${
          isOwn ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-200 text-gray-900 rounded-bl-none"
        }`}
      >
        {msg.message_type === "photo" && msg.media_url ? (
          <div className="space-y-2">
            <img src={msg.media_url || "/placeholder.svg"} alt="Shared photo" className="max-w-xs rounded" />
            <p className="text-sm">{content}</p>
          </div>
        ) : (
          <p className="break-words">{content}</p>
        )}
        <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>

        {isOwn && (
          <button
            onClick={() => onDelete(msg.id)}
            className="absolute right-2 top-2 text-red-500 hover:text-red-700 p-1 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
