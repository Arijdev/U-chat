"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Share2, Loader2 } from "lucide-react"
import { playOutgoingRingback, stopCallSounds } from "@/lib/sound"

interface VideoCallInterfaceProps {
  callType: "voice" | "video"
  otherUserName: string
  onCallEnd: (duration: number) => void
  onClose: () => void
  signaling?: any
  localUserId?: string
  otherUserId?: string
  conversationId?: string
  isCaller?: boolean
}

export function VideoCallInterface({
  callType,
  otherUserName,
  onCallEnd,
  onClose,
  signaling,
  localUserId,
  otherUserId,
  conversationId,
  isCaller,
}: VideoCallInterfaceProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(callType === "video")
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [pcState, setPcState] = useState<string>("new")
  const [isRemoteConnected, setIsRemoteConnected] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const removeSignalingListenerRef = useRef<(() => void) | null>(null)
  const pendingCandidatesRef = useRef<any[]>([])
  const seenCandidatesRef = useRef<Set<string>>(new Set())

  // WebRTC PeerConnection Setup
  const setupPeerConnection = async (localStream: MediaStream) => {
    if (pcRef.current) {
      try {
        pcRef.current.close()
      } catch (e) {}
      pcRef.current = null
    }

    if (removeSignalingListenerRef.current) {
      try {
        removeSignalingListenerRef.current()
      } catch (e) {}
      removeSignalingListenerRef.current = null
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
      ],
    })

    pcRef.current = pc

    const remoteStream = new MediaStream()
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
    }

    pc.ontrack = (event) => {
      try {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!remoteStream.getTracks().includes(track)) {
              remoteStream.addTrack(track)
            }
          })
        } else if (event.track) {
          if (!remoteStream.getTracks().includes(event.track)) {
            remoteStream.addTrack(event.track)
          }
        }

        if (remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(() => {})
        }
        setIsRemoteConnected(true)
      } catch (err) {
        console.warn("ontrack error:", err)
      }
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && otherUserId) {
        try {
          signaling?.send({
            type: "webrtc-candidate",
            from: localUserId,
            to: otherUserId,
            candidate: ev.candidate,
            conversationId,
          })
        } catch (err) {
          console.warn("send candidate failed:", err)
        }
      }
    }

    pc.onconnectionstatechange = () => {
      setPcState(pc.connectionState)
      if (pc.connectionState === "connected") {
        setIsRemoteConnected(true)
      }
    }

    // Add local tracks to peer connection
    try {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    } catch (err) {
      console.warn("addTrack failed:", err)
    }

    // Helper: Create and send WebRTC Offer
    const sendOffer = async () => {
      if (!pcRef.current || !otherUserId) return
      try {
        const offer = await pcRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === "video",
        })
        await pcRef.current.setLocalDescription(offer)
        signaling?.send({
          type: "webrtc-offer",
          from: localUserId,
          to: otherUserId,
          sdp: offer.sdp,
          callType,
          conversationId,
        })
      } catch (err) {
        console.warn("sendOffer error:", err)
      }
    }

    // Listen for signaling messages
    if (signaling?.addListener) {
      const remove = signaling.addListener(async (msg: any) => {
        if (msg.to && localUserId && msg.to !== localUserId) return

        try {
          switch (msg.type) {
            case "ready":
            case "call-accepted":
              if (isCaller) {
                // Remote peer is ready to receive offer
                await sendOffer()
              }
              break

            case "webrtc-offer":
              if (msg.sdp && pcRef.current) {
                const currentPc = pcRef.current
                if (currentPc.signalingState !== "stable" && currentPc.signalingState !== "have-local-offer") {
                  break
                }
                await currentPc.setRemoteDescription({ type: "offer", sdp: msg.sdp } as any)

                // Flush pending candidates
                for (const c of pendingCandidatesRef.current) {
                  try {
                    await currentPc.addIceCandidate(c)
                  } catch (e) {}
                }
                pendingCandidatesRef.current = []

                const answer = await currentPc.createAnswer()
                await currentPc.setLocalDescription(answer)
                signaling?.send({
                  type: "webrtc-answer",
                  from: localUserId,
                  to: msg.from,
                  sdp: answer.sdp,
                  conversationId,
                })
              }
              break

            case "webrtc-answer":
              if (msg.sdp && pcRef.current) {
                const currentPc = pcRef.current
                if (currentPc.signalingState === "have-local-offer") {
                  await currentPc.setRemoteDescription({ type: "answer", sdp: msg.sdp } as any)

                  // Flush pending candidates
                  for (const c of pendingCandidatesRef.current) {
                    try {
                      await currentPc.addIceCandidate(c)
                    } catch (e) {}
                  }
                  pendingCandidatesRef.current = []
                  setIsRemoteConnected(true)
                }
              }
              break

            case "webrtc-candidate":
              if (msg.candidate && pcRef.current) {
                const currentPc = pcRef.current
                const key = JSON.stringify(msg.candidate)
                if (seenCandidatesRef.current.has(key)) break
                seenCandidatesRef.current.add(key)

                if (!currentPc.remoteDescription || !currentPc.remoteDescription.type) {
                  pendingCandidatesRef.current.push(msg.candidate)
                } else {
                  try {
                    await currentPc.addIceCandidate(msg.candidate)
                  } catch (err) {}
                }
              }
              break

            case "call-ended":
            case "call-rejected":
              handleEndCall()
              break

            default:
              break
          }
        } catch (err) {
          console.warn("signaling handler error:", err)
        }
      })
      removeSignalingListenerRef.current = remove
    }

    // Initial offer if caller
    if (isCaller) {
      await sendOffer()
    } else {
      // Notify caller that receiver is ready for negotiation
      signaling?.send({
        type: "ready",
        from: localUserId,
        to: otherUserId,
        conversationId,
      })
    }
  }

  // Initialize Media Stream
  useEffect(() => {
    let isCancelled = false

    const initializeMedia = async () => {
      try {
        let stream: MediaStream
        try {
          const constraints = {
            audio: true,
            video: callType === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          }
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (mediaErr) {
          // Fallback to audio only if camera unavailable
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          setIsVideoOn(false)
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setMediaStream(stream)

        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream
        }

        await setupPeerConnection(stream)
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || "Could not access microphone/camera")
        }
      }
    }

    initializeMedia()

    return () => {
      isCancelled = true
      mediaStream?.getTracks().forEach((t) => t.stop())
      screenStream?.getTracks().forEach((t) => t.stop())
      try {
        pcRef.current?.close()
        pcRef.current = null
      } catch (e) {}
      if (removeSignalingListenerRef.current) {
        removeSignalingListenerRef.current()
      }
    }
  }, [callType])

  // Play ringback tone for caller until connected
  useEffect(() => {
    if (isCaller && !isRemoteConnected) {
      playOutgoingRingback()
    } else {
      stopCallSounds()
    }
    return () => {
      stopCallSounds()
    }
  }, [isCaller, isRemoteConnected])

  // Call duration counter
  useEffect(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [])

  const toggleMicrophone = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const handleEndCall = () => {
    stopCallSounds()
    if (callTimerRef.current) clearInterval(callTimerRef.current)

    mediaStream?.getTracks().forEach((t) => t.stop())
    screenStream?.getTracks().forEach((t) => t.stop())

    try {
      pcRef.current?.close()
      pcRef.current = null
    } catch (e) {}

    try {
      signaling?.send({
        type: "call-ended",
        from: localUserId,
        to: otherUserId,
        conversationId,
      })
    } catch (e) {}

    onCallEnd(callDuration)
    onClose()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 bg-[#111b21] z-50 flex flex-col text-white animate-in fade-in duration-200">
      {/* Hidden audio element for remote sound */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Main Call View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {callType === "video" ? (
          <>
            {/* Remote Video Stream */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              {!isRemoteConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs space-y-3">
                  <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center animate-pulse">
                    <span className="text-3xl font-bold">{otherUserName?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{otherUserName}</p>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isCaller ? "Ringing..." : "Connecting..."}
                  </p>
                </div>
              )}
            </div>

            {/* Local Video Stream (Picture in Picture) */}
            {isVideoOn && (
              <div className="absolute bottom-6 right-6 w-28 h-40 md:w-36 md:h-52 bg-card rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}
          </>
        ) : (
          /* Voice Call View */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl border-4 border-white/10 animate-pulse">
              <span className="text-5xl md:text-6xl font-bold">{otherUserName?.[0]?.toUpperCase() || "📞"}</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">{otherUserName}</h2>
              <p className="text-sm font-medium text-emerald-400 mt-1">
                {isRemoteConnected ? "Arixo Audio Call" : isCaller ? "Ringing..." : "Connecting..."}
              </p>
            </div>
          </div>
        )}

        {/* Top Floating Status / Timer */}
        <div className="absolute top-6 inset-x-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRemoteConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{isRemoteConnected ? formatDuration(callDuration) : "Connecting..."}</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/90 text-white text-xs p-2 text-center">
          {error}
        </div>
      )}

      {/* Call Controls Bar */}
      <div className="bg-[#202c33] p-4 md:p-6 flex items-center justify-center gap-4 md:gap-6 shrink-0 border-t border-white/5">
        {/* Mute Mic */}
        <button
          onClick={toggleMicrophone}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-md ${
            isMuted ? "bg-red-500 text-white" : "bg-white/15 hover:bg-white/25 text-white"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera (for video calls) */}
        {callType === "video" && (
          <button
            onClick={toggleCamera}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-md ${
              !isVideoOn ? "bg-red-500 text-white" : "bg-white/15 hover:bg-white/25 text-white"
            }`}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-transform active:scale-95 shadow-xl"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
