"use client"

import { useEffect, useState, memo } from "react"
import { Trash2, FileText, Download, Play, Pause, Check, CheckCheck, Copy } from "lucide-react"

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    onGetDecrypted(msg).then(setContent)
  }, [msg.id, msg.content, onGetDecrypted])

  const toggleAudio = (url: string) => {
    if (!audioEl) {
      const audio = new Audio(url)
      audio.onended = () => setIsPlayingAudio(false)
      audio.play()
      setAudioEl(audio)
      setIsPlayingAudio(true)
    } else {
      if (isPlayingAudio) {
        audioEl.pause()
        setIsPlayingAudio(false)
      } else {
        audioEl.play()
        setIsPlayingAudio(true)
      }
    }
  }

  const copyToClipboard = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group mb-1.5 px-2`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2 rounded-2xl relative shadow-xs transition-all ${
          isOwn
            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs"
            : "bg-white dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border/40"
        }`}
      >
        {/* Photo Message */}
        {msg.message_type === "photo" && msg.media_url && (
          <div className="space-y-1.5">
            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
              <img
                src={msg.media_url}
                alt="Shared photo"
                className="max-w-full max-h-80 rounded-xl object-contain hover:scale-[1.01] transition-transform"
              />
            </a>
            {content && content !== "Shared a photo" && (
              <p className="text-sm leading-relaxed break-words">{content}</p>
            )}
          </div>
        )}

        {/* Video Message */}
        {msg.message_type === "video" && msg.media_url && (
          <div className="space-y-1.5">
            <video
              src={msg.media_url}
              controls
              className="max-w-full max-h-80 rounded-xl object-contain bg-black/50"
            />
            {content && content !== "Shared a video" && (
              <p className="text-sm leading-relaxed break-words">{content}</p>
            )}
          </div>
        )}

        {/* Document Message */}
        {msg.message_type === "document" && msg.media_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/30">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-foreground">
                  {msg.file_name || content || "Document"}
                </p>
                {msg.file_size && (
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(msg.file_size)}</p>
                )}
              </div>
              <a
                href={msg.media_url}
                download={msg.file_name || "document"}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer shrink-0"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
            {content && content !== (msg.file_name || "Document") && (
              <p className="text-sm leading-relaxed break-words">{content}</p>
            )}
          </div>
        )}

        {/* Voice / Audio Message */}
        {msg.message_type === "audio" && msg.media_url && (
          <div className="flex items-center gap-3 py-1 min-w-[200px]">
            <button
              onClick={() => toggleAudio(msg.media_url)}
              className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="h-1.5 bg-foreground/20 rounded-full overflow-hidden">
                <div className={`h-full bg-emerald-600 rounded-full ${isPlayingAudio ? "animate-pulse w-full" : "w-1/3"}`} />
              </div>
              <span className="text-[10px] text-muted-foreground">Voice note</span>
            </div>
          </div>
        )}

        {/* Regular Text Message */}
        {(!msg.message_type || msg.message_type === "text") && (
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )}

        {/* Timestamp & Status Ticks */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground select-none">
          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {isOwn && (
            <span className="text-[#53bdeb]" title="Delivered & Read">
              <CheckCheck className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Hover Actions: Copy & Delete */}
        <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-1 bg-card border border-border p-0.5 rounded-full shadow-md z-10">
          <button
            onClick={copyToClipboard}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent cursor-pointer"
            title={copied ? "Copied!" : "Copy message"}
          >
            <Copy className="w-3 h-3" />
          </button>
          {isOwn && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1 text-destructive hover:text-destructive/80 rounded-full hover:bg-destructive/10 cursor-pointer"
              title="Delete message"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
