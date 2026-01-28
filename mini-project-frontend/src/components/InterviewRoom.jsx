import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Settings,
  MoreVertical,
  Layout,
  Clock,
} from "lucide-react";

const InterviewRoom = ({ partnerName = "Partner", questions = [], onLeave }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState("Connecting...");

  const [peerId, setPeerId] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);

  // ✅ FIX: socket should be created once per component mount (stable)
  const socketRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());

  // ✅ FIX: Buffer ICE candidates until remoteDescription is set
  const pendingIceCandidatesRef = useRef([]);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // ✅ Start camera/mic
  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  // ✅ Create peer connection
  const createPeerConnection = (targetPeerId) => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: targetPeerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 connectionState:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("❄️ iceConnectionState:", pc.iceConnectionState);
    };

    return pc;
  };

  // ✅ FIX: Initialize socket once
  // useEffect(() => {
  //   // ✅ Create socket connection only once
  //   socketRef.current = io("http://localhost:5000");

  //   socketRef.current.on("connect", () => {
  //     console.log("✅ Socket connected:", socketRef.current.id);
  //     setMySocketId(socketRef.current.id);
  //   });

  //   socketRef.current.on("disconnect", () => {
  //     console.log("❌ Socket disconnected");
  //   });

  //   return () => {
  //     // ✅ Cleanup socket properly
  //     if (socketRef.current) {
  //       socketRef.current.disconnect();
  //       socketRef.current = null;
  //     }
  //   };
  // }, []);   //previous 

  useEffect(() => {
  socketRef.current = io("http://localhost:5000");

  socketRef.current.on("connect", () => {
    console.log("Socket connected:", socketRef.current.id);
    setMySocketId(socketRef.current.id);
  });

  socketRef.current.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socketRef.current.on("peer-disconnected", () => {
    alert("Partner ended the call.");
    setMatched(false);
    // optional hard reset:
    // window.location.reload();
  });

  return () => {
    if (socketRef.current) {
      socketRef.current.off("peer-disconnected");
      socketRef.current.off("connect");
      socketRef.current.off("disconnect");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}, []); //added by Binit 


  // ✅ Start media + join matchmaking
  useEffect(() => {
    const init = async () => {
      try {
        setStatus("Starting camera...");
        await startLocalStream();

        setStatus("Finding peer...");
        socketRef.current.emit("join-room");
      } catch (err) {
        console.error("❌ Camera/Mic error:", err);
        setStatus("Camera/Mic Permission Denied ❌");
      }
    };

    init();

    return () => {
      // ✅ Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // ✅ Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);

  // ✅ WebRTC signaling handlers
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    const onWaiting = () => {
      setStatus("Waiting for peer...");
    };

    const onMatched = async ({ peerId }) => {
      setPeerId(peerId);
      setStatus("Peer matched ✅");

      peerConnectionRef.current = createPeerConnection(peerId);

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      // ✅ FIX: Decide initiator safely
      const myId = socket.id || mySocketId;

      if (!myId) {
        console.log("⚠️ mySocketId not ready yet. Waiting...");
        setStatus("Waiting for socket id...");
        return;
      }

      // ✅ FIX: prevent glare (only initiator creates offer)
      const amIInitiator = myId < peerId;

      if (amIInitiator) {
        setStatus("Creating offer...");

        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socket.emit("offer", { to: peerId, offer });
      } else {
        setStatus("Waiting for offer...");
      }
    };

    const onOffer = async ({ from, offer }) => {
      try {
        setPeerId(from);
        setStatus("Receiving offer...");

        peerConnectionRef.current = createPeerConnection(from);

        localStreamRef.current.getTracks().forEach((track) => {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });

        await peerConnectionRef.current.setRemoteDescription(offer);

        // ✅ Apply queued ICE candidates
        for (const c of pendingIceCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(c);
        }
        pendingIceCandidatesRef.current = [];

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit("answer", { to: from, answer });

        setStatus("Connected ✅");
      } catch (err) {
        console.error("❌ Error handling offer:", err);
        setStatus("Offer failed ❌");
      }
    };

    const onAnswer = async ({ answer }) => {
      try {
        await peerConnectionRef.current.setRemoteDescription(answer);

        // ✅ Apply queued ICE candidates
        for (const c of pendingIceCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(c);
        }
        pendingIceCandidatesRef.current = [];

        setStatus("Connected ✅");
      } catch (err) {
        console.error("❌ Error handling answer:", err);
        setStatus("Answer failed ❌");
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        if (!peerConnectionRef.current) return;

        // ✅ Buffer if remoteDescription not set
        if (!peerConnectionRef.current.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.log("ICE candidate error:", err);
      }
    };

    socket.on("waiting", onWaiting);
    socket.on("matched", onMatched);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);

    return () => {
      socket.off("waiting", onWaiting);
      socket.off("matched", onMatched);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
    };
  }, [mySocketId]);

  // ✅ Mic toggle
  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMicOn(audioTrack.enabled);
  };

  // ✅ Video toggle
  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOn(videoTrack.enabled);
  };

  // ✅ End call properly
  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setPeerId(null);
    setStatus("Disconnected");

    if (onLeave) onLeave();
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white overflow-hidden relative">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-200">LIVE</span>
            <span className="text-slate-600">|</span>
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm font-mono text-slate-300">00:12:45</span>
            <span className="ml-3 text-xs text-slate-400">({status})</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2.5 rounded-full bg-slate-900/50 border border-white/10 hover:bg-white/10 transition">
            <Layout size={20} className="text-slate-300" />
          </button>
          <button className="p-2.5 rounded-full bg-slate-900/50 border border-white/10 hover:bg-white/10 transition">
            <Settings size={20} className="text-slate-300" />
          </button>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex h-full pt-24 pb-6 px-6 gap-6">
        {/* VIDEO AREA */}
        <div className="flex-1 relative bg-slate-900/30 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35"></div>

          <div className="text-center z-10">
            <div className="w-32 h-32 bg-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold text-white">
              {partnerName ? partnerName[0].toUpperCase() : "?"}
            </div>
            <h2 className="text-2xl font-bold">{partnerName}</h2>
            <p className="text-slate-400">
              {peerId ? "Connected ✅" : "Waiting for peer..."}
            </p>
          </div>

          {/* Local video */}
          <div className="absolute top-6 right-6 w-48 h-36 bg-black rounded-2xl border border-white/10 overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/80 border border-white/10 p-3 rounded-2xl">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-xl ${
                isMicOn ? "bg-slate-800" : "bg-red-500/20 text-red-500"
              }`}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-xl ${
                isVideoOn ? "bg-slate-800" : "bg-red-500/20 text-red-500"
              }`}
            >
              {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <button
              onClick={handleLeave}
              className="px-8 py-4 rounded-xl bg-red-600 text-white font-bold flex items-center gap-2"
            >
              <PhoneOff size={20} />
              End
            </button>
          </div>
        </div>

        {/* QUESTIONS SIDEBAR */}
        <div className="w-96 bg-slate-900/30 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-bold">Interview Guide</h2>
            <p className="text-slate-400 text-xs">Role: Interviewer</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {questions.length > 0 ? (
              questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/40 border border-white/5"
                >
                  <p className="text-slate-300 text-sm">{q}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 p-4">No questions loaded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
