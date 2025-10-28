"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Share2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

export function VideoCallInterface({ callType, otherUserName, onCallEnd, onClose, signaling, localUserId, otherUserId, conversationId, isCaller, }: VideoCallInterfaceProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(callType === "video")
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [pcState, setPcState] = useState<string>('new')
  const [pcIceState, setPcIceState] = useState<string>('new')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const removeSignalingListenerRef = useRef<() => void | null>(null)
  const pendingCandidatesRef = useRef<any[]>([])
  const seenCandidatesRef = useRef<Set<string>>(new Set())

  const setupPeerConnection = async (localStream: MediaStream) => {
    // Ensure only one PeerConnection exists at a time
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

    if (!signaling || !localUserId || !otherUserId) {
      console.warn(' Missing signaling or user ids for peer connection')
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pcRef.current = pc

    pc.ontrack = (event) => {
      try {
        // Prefer event.streams[0] if available, otherwise build a stream from tracks
        const remoteStream = (event.streams && event.streams[0]) || new MediaStream(event.track ? [event.track] : [])
        // Attach video to remoteVideoRef (if present)
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream
        }
        // If stream has audio tracks, attach to audio element and play
        try {
          const hasAudio = remoteStream.getAudioTracks().length > 0
          if (hasAudio && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream
            // attempt to play (should succeed after user gesture)
            void remoteAudioRef.current.play().catch(() => {})
          }
        } catch (e) {
          // non-fatal
        }
      } catch (err) {
        console.warn(' ontrack error', err)
      }
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        try {
          signaling?.send({ type: 'webrtc-candidate', from: localUserId, to: otherUserId, candidate: ev.candidate })
        } catch (err) {
          console.warn(' send candidate failed', err)
        }
      }
    }

    pc.onconnectionstatechange = () => {
      setPcState(pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      setPcIceState(pc.iceConnectionState)
    }

    // add or replace local tracks (avoid duplicate tracks causing flicker)
    try {
      const existingSenders = pc.getSenders()
      localStream.getTracks().forEach((track) => {
        const sender = existingSenders.find((s) => s.track && s.track.kind === track.kind)
        if (sender) {
          try {
            sender.replaceTrack(track)
          } catch (e) {
            // fallback to addTrack if replace fails
            try {
              pc.addTrack(track, localStream)
            } catch (e2) {}
          }
        } else {
          pc.addTrack(track, localStream)
        }
      })
    } catch (err) {
      console.warn(' add/replaceTrack failed', err)
    }

    // listen for signaling messages (ensure single listener)
    if (signaling?.addListener) {
      const remove = signaling.addListener(async (msg: any) => {
        // minimal logging
        if (msg.to && msg.to !== localUserId) return
        try {
          switch (msg.type) {
            case 'webrtc-offer':
              if (msg.sdp) {
                // received offer
                await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp } as any)
                // flush any pending remote candidates now that remote description is set
                try {
                  for (const c of pendingCandidatesRef.current) {
                    await pc.addIceCandidate(c)
                  }
                } catch (e) {
                  console.warn(' flush pending candidates failed', e)
                }
                pendingCandidatesRef.current = []
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                signaling.send({ type: 'webrtc-answer', from: localUserId, to: msg.from, sdp: answer.sdp })
                // sent answer
              }
              break
            case 'webrtc-answer':
              if (msg.sdp) {
                // received answer
                await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp } as any)
                // flush pending candidates after remote desc
                try {
                  for (const c of pendingCandidatesRef.current) {
                    await pc.addIceCandidate(c)
                  }
                } catch (e) {
                  console.warn(' flush pending candidates after answer failed', e)
                }
                pendingCandidatesRef.current = []
              }
              break
            case 'webrtc-candidate':
              if (msg.candidate) {
                try {
                  // dedupe candidates to avoid repeated adds
                  const key = JSON.stringify(msg.candidate)
                  if (seenCandidatesRef.current.has(key)) break
                  seenCandidatesRef.current.add(key)
                  // If remote description not yet set, queue candidate
                  const rd = pc.remoteDescription
                  if (!rd || !rd.type) {
                    pendingCandidatesRef.current.push(msg.candidate)
                  } else {
                    await pc.addIceCandidate(msg.candidate)
                  }
                } catch (err) {
                  console.warn(' addIceCandidate failed', err)
                }
              }
              break
            default:
              break
          }
        } catch (err) {
          console.warn(' signaling handler error', err)
        }
      })
      removeSignalingListenerRef.current = remove
    }

    // if caller, create offer
    if (isCaller) {
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        signaling?.send({ type: 'webrtc-offer', from: localUserId, to: otherUserId, sdp: offer.sdp })
  // offer sent
      } catch (err) {
        console.warn(' createOffer failed', err)
      }
    }
  }

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const constraints = {
          audio: true,
          video: callType === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        setMediaStream(stream)

        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream
        }

  // media stream initialized

        // initialize peer connection
        await setupPeerConnection(stream)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to access media devices"
        setError(errorMsg)
  // media access error
      }
    }

    initializeMedia()

    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop())
      screenStream?.getTracks().forEach((track) => track.stop())
      // close peer connection
      try {
        pcRef.current?.close()
        pcRef.current = null
      } catch (err) {}
      // remove signaling listener
      if (removeSignalingListenerRef.current) removeSignalingListenerRef.current()
    }
  }, [callType])

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
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      // update sender's audio track enabled state as well
      try {
        const pc = pcRef.current
        if (pc) {
          const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio')
          const audioTrack = mediaStream.getAudioTracks()[0]
          if (audioSender && audioTrack) {
            audioSender.track && (audioSender.track.enabled = audioTrack.enabled)
          }
        }
      } catch (err) {
        console.warn(' toggleMicrophone sender update failed', err)
      }
      setIsMuted(!isMuted)
  // microphone toggled
    }
  }

  const toggleCamera = () => {
    if (mediaStream && callType === "video") {
      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      // also ensure peer sender track is enabled/disabled
      const pc = pcRef.current
      if (pc) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
        const camTrack = mediaStream.getVideoTracks()[0]
        try {
          if (videoSender && camTrack) {
            // sender.track should be same track instance; enabling/disabling it will reflect
            videoSender.track && (videoSender.track.enabled = camTrack.enabled)
          }
        } catch (err) {
          console.warn(' toggleCamera sender update failed', err)
        }
      }
      setIsVideoOn(!isVideoOn)
  // camera toggled
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: false,
      })
      setScreenStream(screenStream)

      // replace outbound video track with screen track if peer connection exists
      const screenTrack = screenStream.getVideoTracks()[0]
      const pc = pcRef.current
      if (pc) {
        const senders = pc.getSenders()
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(screenTrack).catch((err) => console.warn(' replaceTrack failed', err))
        } else {
          pc.addTrack(screenTrack, screenStream)
        }
      }

      // show local preview of screen share
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream

      screenTrack.onended = () => {
        // restore camera video track
        if (pc) {
          const senders = pc.getSenders()
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
          const camTrack = mediaStream?.getVideoTracks()[0] || null
          if (videoSender && camTrack) videoSender.replaceTrack(camTrack as MediaStreamTrack)
        }
        setScreenStream(null)
        setIsScreenSharing(false)
        if (localVideoRef.current && mediaStream) localVideoRef.current.srcObject = mediaStream
      }

      setIsScreenSharing(true)
  // screen sharing started
    } catch (err) {
  // screen share error
    }
  }

  const stopScreenShare = () => {
    try {
      screenStream?.getTracks().forEach((track) => track.stop())
    } catch (err) {}
    // replace sender track back to camera
    const pc = pcRef.current
    const camTrack = mediaStream?.getVideoTracks()[0] || null
    if (pc && camTrack) {
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (videoSender) videoSender.replaceTrack(camTrack as MediaStreamTrack).catch((err) => console.warn(err))
    }
    setScreenStream(null)
    setIsScreenSharing(false)
    if (localVideoRef.current && mediaStream) localVideoRef.current.srcObject = mediaStream
  // screen sharing stopped
  }

  const handleEndCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current)

    // Cleanup function to handle a MediaStream
    const cleanupStream = (stream: MediaStream | null) => {
      if (!stream) return;
      try {
        stream.getTracks().forEach(track => {
          track.enabled = false;  // Immediately disable track
          track.stop();          // Then stop it
        });
      } catch (err) {
        console.warn('Error stopping stream tracks:', err);
      }
    };

    // Clean up all media streams
    cleanupStream(mediaStream);
    cleanupStream(screenStream);

    // Clear all media elements
    const cleanupMediaElement = (element: HTMLMediaElement | null) => {
      if (!element) return;
      try {
        const stream = element.srcObject as MediaStream | null;
        cleanupStream(stream);
        element.srcObject = null;
        element.load(); // Force cleanup of media resources
      } catch (err) {
        console.warn('Error cleaning media element:', err);
      }
    };

    cleanupMediaElement(localVideoRef.current);
    cleanupMediaElement(remoteVideoRef.current);
    cleanupMediaElement(remoteAudioRef.current);

    setMediaStream(null)
    setScreenStream(null)
    setIsScreenSharing(false)

    try {
      pcRef.current?.close()
      pcRef.current = null
    } catch (err) {}

    // notify remote
    try {
      signaling?.send({ type: 'call-ended', from: localUserId, to: otherUserId, conversationId })
    } catch (err) {}

    // Extra safety: stop tracks on any media elements in the document (in case other refs retained streams)
    try {
      const mediaEls = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[]
      mediaEls.forEach((el) => {
        try {
          const s = el.srcObject as MediaStream | null
          if (s) {
            s.getTracks().forEach((t) => {
              try {
                t.stop()
              } catch (e) {}
            })
          }
          el.srcObject = null
        } catch (e) {}
      })
    } catch (e) {
      console.warn(' cleaning media elements failed', e)
    }

    // Record call duration in call_history
    const updateCallHistory = async () => {
      try {
        const supabase = createClient()
        const callHistoryUpdate = {
          duration_seconds: callDuration,
          status: 'completed'
        }

        // Update the call record
        await supabase
          .from('call_history')
          .update(callHistoryUpdate)
          .eq('conversation_id', conversationId)
          .eq('status', 'in-progress')
      } catch (e) {
        console.warn('Failed to update call history:', e)
      }
    }

    // Update call history
    updateCallHistory()

    onCallEnd(callDuration)
    onClose()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* global hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {callType === "video" ? (
          <>
        {/* Remote Video (centered & constrained on large screens) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className={`${isFullScreen ? 'w-screen h-screen' : 'max-w-[90vw] max-h-[80vh]'} w-auto h-auto object-contain bg-black`} 
                />
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full"
                >
                  {isFullScreen ? '🔄' : '⛶'}
                </button>
              </div>
            </div>

            {/* Local Video (Picture in Picture) */}
            {!isScreenSharing && (
              <div className="absolute bottom-6 right-6 w-20 h-20 md:w-36 md:h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}

            {/* Screen Share Indicator */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Sharing Screen</span>
              </div>
            )}

            {/* Mobile Camera Rotate Button */}
            {callType === "video" && "mediaDevices" in navigator && (
              <button
                onClick={() => {
                  setIsFrontCamera(!isFrontCamera);
                  if (mediaStream) {
                    const constraints = {
                      audio: true,
                      video: { facingMode: isFrontCamera ? "environment" : "user" }
                    };
                    navigator.mediaDevices.getUserMedia(constraints)
                      .then(newStream => {
                        // Stop old tracks
                        mediaStream.getVideoTracks().forEach(track => track.stop());
                        
                        // Set up new stream
                        const newVideoTrack = newStream.getVideoTracks()[0];
                        const audioTrack = mediaStream.getAudioTracks()[0];
                        const updatedStream = new MediaStream([newVideoTrack, audioTrack]);
                        setMediaStream(updatedStream);
                        
                        if (localVideoRef.current) {
                          localVideoRef.current.srcObject = updatedStream;
                        }
                        
                        // Update peer connection
                        const pc = pcRef.current;
                        if (pc) {
                          const videoSender = pc.getSenders().find(s => s.track?.kind === "video");
                          if (videoSender) {
                            videoSender.replaceTrack(newVideoTrack);
                          }
                        }
                      })
                      .catch(err => console.warn("Camera switch failed:", err));
                  }
                }}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-20"
                title={`Switch to ${isFrontCamera ? "back" : "front"} camera`}
              >
                📱
              </button>
            )}
          </>
        ) : (
          /* Voice Call UI */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-linear-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl md:text-6xl">📞</span>
              </div>
              <p className="text-2xl md:text-3xl font-semibold text-white mb-2">{otherUserName}</p>
              <p className="text-lg md:text-xl text-gray-300">Voice Call</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-600 text-white p-4 text-center">
          <p className="text-sm md:text-base">Error: {error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-700 p-3 md:p-4">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {/* Call Duration */}
          <div className="text-white text-center min-w-20">
            <p className="text-2xl md:text-3xl font-bold text-blue-400">{formatDuration(callDuration)}</p>
          </div>

          {/* Microphone Toggle */}
          <Button
            onClick={toggleMicrophone}
            className={`rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center transition-colors ${
              isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Camera Toggle (Video Only) */}
          {callType === "video" && (
            <Button
              onClick={toggleCamera}
              className={`rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center transition-colors ${
                !isVideoOn ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          )}

          {/* Screen Share Toggle (Video Only) */}
          {callType === "video" && (
            <Button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center transition-colors ${
                isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <Share2 className="w-6 h-6" />
            </Button>
          )}

          {/* End Call */}
          <Button
            onClick={handleEndCall}
            className="rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-center mt-4 text-gray-300 text-sm md:text-base">
          <p>
            {isMuted ? "🔇 Muted" : "🔊 Unmuted"}
            {callType === "video" && (isVideoOn ? " • 📹 Camera On" : " • 📹 Camera Off")}
            {isScreenSharing && " • 🖥️ Sharing Screen"}
          </p>
          {/* connection state removed from UI to keep display clean */}
        </div>
      </div>
    </div>
  )
}
