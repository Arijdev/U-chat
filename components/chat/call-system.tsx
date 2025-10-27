"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react"

interface CallSystemProps {
  conversationId: string
  userId: string
  otherUserId: string
  otherUserName: string
  onCallEnd: (duration: number) => void
}

export function CallSystem({ conversationId, userId, otherUserId, otherUserName, onCallEnd }: CallSystemProps) {
  const [callActive, setCallActive] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video" | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (callActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [callActive])

  const startCall = (type: "voice" | "video") => {
    setCallType(type)
    setCallActive(true)
    setCallDuration(0)
    playRingtone()
  }

  const endCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }
    setCallActive(false)
    onCallEnd(callDuration)
    setCallType(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsVideoOn(true)
  }

  const playRingtone = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        console.log(" Could not play ringtone")
      })
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!callActive) {
    return null
  }

  return (
    <>
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=="
        loop
      />
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-lg p-8 text-center max-w-sm w-full mx-4">
          <div className="mb-6">
            <div className="text-6xl mb-4">{callType === "video" ? "📹" : "📞"}</div>
            <p className="text-xl font-semibold text-white mb-2">
              {callType === "video" ? "Video Call" : "Voice Call"}
            </p>
            <p className="text-gray-300 mb-4">{otherUserName}</p>
            <p className="text-3xl font-bold text-blue-400">{formatDuration(callDuration)}</p>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            {callType === "voice" && (
              <Button
                onClick={() => setIsMuted(!isMuted)}
                className={`rounded-full w-14 h-14 flex items-center justify-center ${
                  isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <Phone className="w-6 h-6" />
              </Button>
            )}

            {callType === "video" && (
              <>
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`rounded-full w-14 h-14 flex items-center justify-center ${
                    isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <Phone className="w-6 h-6" />
                </Button>
                <Button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`rounded-full w-14 h-14 flex items-center justify-center ${
                    !isVideoOn ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
              </>
            )}

            <Button
              onClick={endCall}
              className="rounded-full w-14 h-14 flex items-center justify-center bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>

          <p className="text-sm text-gray-400">
            {isMuted ? "Muted" : "Unmuted"}
            {callType === "video" && (isVideoOn ? " • Camera On" : " • Camera Off")}
          </p>
        </div>
      </div>
    </>
  )
}
