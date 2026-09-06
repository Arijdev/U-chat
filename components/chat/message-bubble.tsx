"use client"

import { useEffect, useState, memo, useRef } from "react"
import {
  Trash2,
  FileText,
  Download,
  Play,
  Pause,
  CheckCheck,
  Copy,
  Reply,
  Star,
  Smile,
  MoreVertical,
} from "lucide-react"

interface MessageBubbleProps {
  msg: any
  isOwn: boolean
  currentUserId?: string
  onGetDecrypted: (msg: any) => Promise<string>
  onDelete: (id: string) => void
  onReply?: (msg: any) => void
  onReact?: (msgId: string, emoji: string) => void
  onStar?: (msgId: string, isStarred: boolean) => void
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

export const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
  currentUserId,
  onGetDecrypted,
  onDelete,
  onReply,
  onReact,
  onStar,
}: MessageBubbleProps) {
  const [content, setContent] = useState(msg.content)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    onGetDecrypted(msg).then(setContent)
  }, [msg.id, msg.content, onGetDecrypted])

  const toggleAudio = (url: string) => {
    if (!audioEl) {
      const audio = new Audio(url)
      audio.playbackRate = playbackSpeed
      audio.onended = () => setIsPlayingAudio(false)
      audio.play().catch(() => {})
      setAudioEl(audio)
      setIsPlayingAudio(true)
    } else {
      if (isPlayingAudio) {
        audioEl.pause()
        setIsPlayingAudio(false)
      } else {
        audioEl.playbackRate = playbackSpeed
        audioEl.play().catch(() => {})
        setIsPlayingAudio(true)
      }
    }
  }

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2]
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setPlaybackSpeed(nextSpeed)
    if (audioEl) {
      audioEl.playbackRate = nextSpeed
    }
  }

  const copyToClipboard = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShowMenu(false)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Count active reactions
  const reactionsMap = msg.reactions || {}
  const activeReactions = Object.entries(reactionsMap).filter(
    ([_, users]: any) => Array.isArray(users) && users.length > 0
  )

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group mb-1.5 px-2 relative`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2 rounded-2xl relative shadow-xs transition-all ${
          isOwn
            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs"
            : "bg-white dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border/40"
        }`}
      >
        {/* Reply Quote Banner */}
        {msg.reply_to && (
          <div className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-black/20 border-l-4 border-emerald-500 text-xs select-none">
            <p className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {msg.reply_to.sender_name || "Contact"}
            </p>
            <p className="text-muted-foreground truncate line-clamp-1">{msg.reply_to.content}</p>
          </div>
        )}

        {/* Photo Message */}
        {msg.message_type === "photo" && msg.media_url && (
          <div className="space-y-1.5">
            <a
              href={msg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl"
            >
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

        {/* Voice Note Message with Waveform & Speed Toggle */}
        {msg.message_type === "audio" && msg.media_url && (
          <div className="flex items-center gap-3 py-1 min-w-[220px]">
            <button
              onClick={() => toggleAudio(msg.media_url)}
              className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Sound Waveform Visualization */}
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-0.5 h-6">
                {[4, 12, 8, 16, 10, 18, 14, 6, 15, 9, 12, 16, 7, 14, 8, 12].map((height, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isPlayingAudio ? "bg-emerald-600 animate-pulse" : "bg-foreground/30"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Voice message</span>
                <button
                  onClick={cycleSpeed}
                  className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-mono font-bold text-foreground cursor-pointer hover:bg-black/20"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regular Text Message */}
        {(!msg.message_type || msg.message_type === "text") && (
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )}

        {/* Bottom Row: Timestamp, Star & Status Ticks */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-muted-foreground select-none">
          {msg.is_starred && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
          <span>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOwn && (
            <span className="text-[#53bdeb]" title="Delivered & Read">
              <CheckCheck className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Reactions Counter Badge (Pinned to bottom) */}
        {activeReactions.length > 0 && (
          <div className="absolute -bottom-2.5 left-3 bg-card border border-border px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 text-xs select-none">
            {activeReactions.map(([emoji, users]: any) => (
              <span key={emoji} className="flex items-center gap-0.5">
                <span>{emoji}</span>
                {users.length > 1 && <span className="text-[10px] text-muted-foreground">{users.length}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Floating Quick Action Bar (Top of Bubble on Hover) */}
        <div className="absolute -top-3.5 right-2 hidden group-hover:flex items-center gap-0.5 bg-card/95 backdrop-blur-xs border border-border p-0.5 rounded-full shadow-md z-20 select-none">
          {/* Reaction Trigger Button */}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 text-muted-foreground hover:text-emerald-600 rounded-full hover:bg-muted cursor-pointer"
            title="React with emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {/* Reply Button */}
          {onReply && (
            <button
              onClick={() => onReply({ id: msg.id, content, sender_name: isOwn ? "You" : "Contact" })}
              className="p-1 text-muted-foreground hover:text-emerald-600 rounded-full hover:bg-muted cursor-pointer"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Star Button */}
          {onStar && (
            <button
              onClick={() => onStar(msg.id, !msg.is_starred)}
              className="p-1 text-muted-foreground hover:text-amber-500 rounded-full hover:bg-muted cursor-pointer"
              title={msg.is_starred ? "Unstar" : "Star"}
            >
              <Star className={`w-3.5 h-3.5 ${msg.is_starred ? "text-amber-500 fill-amber-500" : ""}`} />
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted cursor-pointer"
            title={copied ? "Copied!" : "Copy"}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          {isOwn && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1 text-destructive hover:text-destructive/80 rounded-full hover:bg-destructive/10 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Floating WhatsApp Quick Emoji Picker */}
        {showReactionPicker && (
          <div className="absolute -top-11 right-0 bg-card border border-border px-2 py-1 rounded-full shadow-xl flex items-center gap-1.5 z-30 animate-in zoom-in-95">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(msg.id, emoji)
                  setShowReactionPicker(false)
                }}
                className="w-7 h-7 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
