import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Layout,
  Clock,
  Settings,
} from "lucide-react";

const InterviewRoom = ({ partnerName = "Partner", questions = [], onLeave }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState("Connecting...");
  const [peerId, setPeerId] = useState(null); // Used to track if we are matched

  const [seconds, setSeconds] = useState(0);   // timer state 
  const [timerRunning, setTimerRunning] = useState(false);

  // Refs for persistent objects
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const pendingIceCandidatesRef = useRef([]);

  // Get logged-in user from storage
  const currentUser = JSON.parse(localStorage.getItem("user")) || {};


  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // 1. Initialize System (Socket + Media)
  useEffect(() => {
    // A. Start Local Media First
    const startMedia = async () => {
  try {
    setStatus("Starting camera...");

    // 🔐 Ensure token is fresh before socket connection
    try {
      const res = await fetch("http://localhost:5000/api/auth/refresh", {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.accessToken);
      }
    } catch {
      // If refresh fails → session expired → go back to login
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    // 🎥 Start camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // 🔌 Now connect socket with fresh token
    connectSocket();

  }  catch (err) {
        console.error("Camera Error:", err);
        setStatus("Camera Permission Denied ❌");
      }
    };

    startMedia();

    // Cleanup on Unmount
    return () => {
      cleanupConnection();
    };
  }, []);
  // ✅ TIMER EFFECT (RUNS ONLY WHEN CONNECTED) 
   useEffect(() => {
   let interval = null;

   if (timerRunning) {
    interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }

   return () => clearInterval(interval);
   }, [timerRunning]);

  // 2. Socket Logic
  const connectSocket = () => {
    socketRef.current = io("http://localhost:5000" ,{
      auth: {
        token: localStorage.getItem("token") // Send JWT token for authentication
      },
      query: {
        username: currentUser.username || "Anonymous"
      }
    }); // Ensure this matches your Backend PORT

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Socket Connected:", socket.id);
      setStatus("Finding peer...");
      socket.emit("join-room");
    });

    socket.on("waiting", () => {
      setStatus("Waiting for a partner...");
    });

    socket.on("matched", async ({ peerId: remotePeerId ,partnerName }) => {
      console.log("🤝 Matched with:", partnerName);
      setPeerId(remotePeerId);
      setStatus(`Connected to ${partnerName}`);
      setSeconds(0);         // reset timer
      setTimerRunning(true); // start timer

      // Initialize WebRTC Connection
      createPeerConnection(remotePeerId);

      // Determine who initiates the offer (to avoid glare)
      // The user with the "smaller" ID string creates the offer
      if (socket.id < remotePeerId) {
        console.log("I am the initiator");
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit("offer", { to: remotePeerId, offer });
      }
    });

    socket.on("offer", async ({ from, offer }) => {
      console.log("📩 Received Offer");
      if (!peerConnectionRef.current) createPeerConnection(from);

      await peerConnectionRef.current.setRemoteDescription(offer);
      
      // Process any queued ICE candidates
      processPendingCandidates();

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    socket.on("answer", async ({ answer }) => {
      console.log("📩 Received Answer");
      await peerConnectionRef.current.setRemoteDescription(answer);
      processPendingCandidates();
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current) {
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } else {
          // Buffer candidates if remote description isn't set yet
          pendingIceCandidatesRef.current.push(candidate);
        }
      }
    });

    // 🔴 HANDLE PARTNER DISCONNECT
    socket.on("peer-disconnected", () => {
      setTimerRunning(false);
      setSeconds(0);
      alert("Partner has left the interview.");
      setStatus("Partner Disconnected");
      setPeerId(null);
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null; // Clear remote video
      }
      
      // Optional: Automatically search for new peer
      // socket.emit("join-room");
    });
  };

  const createPeerConnection = (targetPeerId) => {
    if (peerConnectionRef.current) return;

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: targetPeerId,
          candidate: event.candidate,
        });
      }
    };
  };

  const processPendingCandidates = async () => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      await peerConnectionRef.current.addIceCandidate(candidate);
    }
  };

  // 3. Button Actions
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const handleLeaveButton = () => {
    cleanupConnection();
    if (onLeave) onLeave();
  };

  const cleanupConnection = () => {
    // A. Close Media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // B. Close WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // C. Disconnect Socket (Crucial for notifying partner)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setPeerId(null);
    setStatus("Disconnected");
    setTimerRunning(false);
    setSeconds(0);
  };
   const formatTime = (secs) => {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white overflow-hidden relative">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${peerId ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="text-sm font-medium text-slate-200">{peerId ? "CONNECTED" : "WAITING"}</span>
            <span className="text-slate-600">|</span>
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm font-mono text-slate-300">
            {peerId ? formatTime(seconds) : "00:00:00"}
            </span>
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
          
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {!peerId && (
             <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center z-10">
                <div className="w-32 h-32 bg-slate-800 rounded-full mb-6 flex items-center justify-center animate-pulse">
                    <span className="text-4xl">🔎</span>
                </div>
                <h2 className="text-2xl font-bold">Looking for a Peer...</h2>
             </div>
          )}

          {/* Local Video */}
          <div className="absolute top-6 right-6 w-48 h-36 bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/80 border border-white/10 p-3 rounded-2xl z-30">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-xl transition-all ${
                isMicOn ? "bg-slate-800 hover:bg-slate-700" : "bg-red-500/20 text-red-500 border border-red-500/50"
              }`}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-xl transition-all ${
                isVideoOn ? "bg-slate-800 hover:bg-slate-700" : "bg-red-500/20 text-red-500 border border-red-500/50"
              }`}
            >
              {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <button
              onClick={handleLeaveButton}
              className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 transition-all"
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
            <p className="text-slate-400 text-xs">Questions to ask</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {questions.length > 0 ? (
              questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition"
                >
                  <p className="text-slate-300 text-sm leading-relaxed">{q}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 mt-10">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No questions loaded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;