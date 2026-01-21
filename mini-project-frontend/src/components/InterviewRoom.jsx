import React, { useState } from 'react';
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
  Clock 
} from 'lucide-react';

const InterviewRoom = ({ partnerName = "Partner", questions = [], onLeave }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  return (
    <div className="h-screen w-full bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white font-sfpro overflow-hidden relative">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            <span className="text-sm font-medium tracking-wide text-slate-200">LIVE</span>
            <span className="text-slate-600">|</span>
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm font-mono text-slate-300">00:12:45</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           <button className="p-2.5 rounded-full bg-slate-900/50 border border-white/10 hover:bg-white/10 transition backdrop-blur-md">
              <Layout size={20} className="text-slate-300" />
           </button>
           <button className="p-2.5 rounded-full bg-slate-900/50 border border-white/10 hover:bg-white/10 transition backdrop-blur-md">
              <Settings size={20} className="text-slate-300" />
           </button>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex h-full pt-24 pb-6 px-6 gap-6">
        
        {/* LEFT: VIDEO AREA (Takes up more space) */}
        <div className="flex-1 relative bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center group">
            
            {/* Main Video Placeholder (Partner) */}
            <div className="text-center z-10">
                <div className="w-32 h-32 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                    {partnerName ? partnerName[0].toUpperCase() : "?"}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{partnerName}</h2>
                <p className="text-slate-400 bg-black/20 px-4 py-1 rounded-full inline-block backdrop-blur-sm">Waiting for video stream...</p>
            </div>

            {/* Floating Self View (Picture-in-Picture) */}
            <div className="absolute top-6 right-6 w-48 h-36 bg-slate-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium">You</div>
            </div>

            {/* FLOATING CONTROLS DOCK */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl transition-transform duration-300 group-hover:-translate-y-2">
                <button 
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-4 rounded-xl transition-all duration-300 ${isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                >
                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                
                <button 
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-4 rounded-xl transition-all duration-300 ${isVideoOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                >
                    {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                </button>

                <div className="w-px h-8 bg-white/10 mx-2"></div>

                <button className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all">
                    <MessageSquare size={24} />
                </button>
                <button className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all">
                    <MoreVertical size={24} />
                </button>

                <div className="w-px h-8 bg-white/10 mx-2"></div>

                <button 
                  onClick={onLeave}
                  className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                    <PhoneOff size={20} />
                    <span>End</span>
                </button>
            </div>
        </div>

        {/* RIGHT: SIDEBAR (Questions) */}
        <div className="w-96 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            
            <div className="p-6 border-b border-white/5 bg-white/5">
                <h2 className="text-lg font-bold text-white mb-1">Interview Guide</h2>
                <p className="text-slate-400 text-xs">Role: <span className="text-blue-400 font-semibold">Interviewer</span></p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {questions.length > 0 ? (
                    questions.map((q, idx) => (
                        <div key={idx} className="group p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-blue-500/30 transition-all duration-300 cursor-pointer">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full uppercase tracking-wider">
                                    Question {idx + 1}
                                </span>
                            </div>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">
                                {q}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 mt-10 p-6">
                        <p>No questions loaded for this session.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <span>Progress</span>
                    <span>33%</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default InterviewRoom;