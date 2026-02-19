import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Upload,
  Settings,
  Calendar,
  MoreHorizontal,
  Rocket, // Added Rocket for the logo
  User,    // Added User for profile
  X,       // Added X for closing modal
  RefreshCw // Added RefreshCw for generate button
} from 'lucide-react';
import UploadResume from './UploadResume';

const Dashboard = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);


  // Get user from storage
  const user = JSON.parse(localStorage.getItem("user") || "null");


  // ✅ SAFETY CHECK (Protect Dashboard)
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // ✅ BETTER INITIALS LOGIC (Pro Look)
  const initials = user?.username
    ?.split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);


  // 1. Scroll Listener (Matches LoginScreen logic)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      localStorage.clear();
      navigate("/"); // back to login
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // --- RESUME DATA FETCHING ---
  const [resumeData, setResumeData] = useState(null);

  const fetchResume = async () => {
    if (!user?._id && !user?.id) return;
    try {
      const resp = await fetch(`http://localhost:5000/resume/structured/${user._id || user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.structured) {
          setResumeData(data.structured);
        }
      }
    } catch (err) {
      console.error("Failed to fetch resume:", err);
    }
  };

  useEffect(() => {
    fetchResume();
  }, [user]);

  const handleResumeSaved = () => {
    setShowUploadModal(false);
    fetchResume(); // Refresh data
  };

  // --- GENERATE QUESTIONS LOGIC ---
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');

  async function handleGenerateQuestions() {
    if (!user?._id && !user?.id) return;
    setGenerating(true);
    setGenMessage('');
    try {
      const resp = await fetch('http://localhost:5000/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user._id || user.id })
      });
      const json = await resp.json();
      if (resp.ok) {
        setGenMessage('Questions generated!');
        // Could navigate to /room or show a success toast
      } else {
        setGenMessage(json.error || 'Generation failed');
      }
    } catch (err) {
      console.error(err);
      setGenMessage('Generation error');
    } finally {
      setGenerating(false);
    }
  }

  return (
    // 'min-h-screen' ensures full height. 
    // We removed 'overflow-hidden' from the body so the scroll animation can actually trigger if needed.
    <div className="min-h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col relative">

      {/* =======================
          LEFT FLOATING ISLAND (LOGO)
          Matches LoginScreen Exact Style
          ======================= */}
      <div
        className={`fixed z-50 transition-all duration-700 ease-in-out
          ${scrolled ? 'top-6 left-4' : 'top-0 left-0 p-8'}
        `}
      >
        <div className={`flex items-center transition-all duration-700 border border-white/10 shadow-2xl
          ${scrolled
            ? 'flex-col space-y-4 bg-slate-900/20 backdrop-blur-md p-3 rounded-full'
            : 'flex-row space-x-3 bg-slate-900/20 backdrop-blur-md px-6 py-3 rounded-full'
          }
        `}>
          <div className="bg-blue-500 p-1.5 rounded-lg shadow-lg shadow-blue-500/20 z-10">
            <Rocket size={20} className="text-white" />
          </div>

          <span
            className={`font-bold tracking-tight text-shadow drop-shadow-md transition-all duration-700 origin-left text-white
              ${scrolled ? 'vertical-text text-sm py-2 opacity-80' : 'text-lg'}
            `}
            style={{ writingMode: scrolled ? 'vertical-rl' : 'horizontal-tb', textOrientation: 'mixed' }}
          >
            PeerInterview<span className="text-blue-500">.io</span>
          </span>
        </div>
      </div>

      {/* =======================
          RIGHT FLOATING ISLAND (SETTINGS & PROFILE)
          Matches LoginScreen Exact Style
          ======================= */}
      <div
        className={`fixed z-50 transition-all duration-700 ease-in-out flex items-center
          ${scrolled ? 'top-6 right-4 flex-col-reverse gap-3' : 'top-0 right-0 p-8 flex-row gap-4'}
        `}
      >
        {/* Settings Button */}
        <button className={`transition-all duration-500 rounded-full hover:text-white backdrop-blur-sm border border-white/10 hover:border-white/10
           ${scrolled
            ? 'bg-slate-900/10 backdrop-blur-xl p-3 border text-slate-300 hover:bg-white/10 border-white/10'
            : 'p-2 text-slate-300 hover:bg-white/10 backdrop-blur-sm'
          }
        `}>
          <Settings size={20} />
        </button>



        {/* Profile Menu */}

        <div className="relative group">

          {/* Profile Button */}
          <div
            className={`flex items-center transition-all duration-700 backdrop-blur-sm cursor-pointer
      ${scrolled
                ? 'flex-col p-2 rounded-full bg-slate-900/10 border border-white/10'
                : 'space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10'
              }
    `}
          >
            <div className='w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-md z-10 bg-gradient-to-r from-indigo-500 to-purple-500'>
              {user?.photo ? (
                <img src={user.photo} alt="Profile" className='w-full h-full object-cover' />
              ) : (
                initials
              )}
            </div>

            <span
              className={`text-sm font-medium text-slate-200 transition-all duration-500
        ${scrolled ? 'h-0 w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}
      `}
            >
              {user?.username}
            </span>
          </div>


          {/* Logout Dropdown (MUST be inside group) */}
          <div
            className="
      absolute right-0 mt-2 w-32
      bg-slate-900 border border-slate-700
      rounded-xl shadow-lg z-50

      opacity-0 invisible
      group-hover:opacity-100
      group-hover:visible

      translate-y-2
      group-hover:translate-y-0

      transition-all duration-200
    "
          >
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-800 rounded-xl"
            >
              Logout
            </button>
          </div>
        </div>
      </div>



      {/* --- MAIN CONTENT --- */}
      {/* Added pt-32 to clear the floating header */}
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-8 pb-8 pt-32">

        {/* 1. WELCOME SECTION (Compact) */}
        <div className="flex-none mb-8">
          <h1 className="text-4xl font-light text-white mb-2">
            Hello, <span className="font-semibold">{user?.username}</span>.
          </h1>
          <p className="text-slate-500">Ready to prepare for your next big opportunity?</p>
        </div>


        {/* 2. STATS ROW (Fixed Height) */}
        <div className="flex-none grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar size={60} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Sessions</p>
              <h3 className="text-3xl font-bold text-white mt-1">24</h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-full">
              <span>+2 THIS WEEK</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 flex flex-col justify-between h-36 hover:border-white/10 transition-colors">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Average Rating</p>
              <h3 className="text-3xl font-bold text-white mt-1">4.8</h3>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[96%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 flex flex-col justify-between h-36 border-dashed border-slate-800 hover:bg-slate-900/80 transition-colors cursor-pointer">
            <div className="flex justify-center items-center h-full text-slate-600 gap-2 group">
              <MoreHorizontal size={20} className="group-hover:text-slate-400 transition-colors" />
              <span className="text-sm font-medium group-hover:text-slate-400 transition-colors">View Schedule</span>
            </div>
          </div>
        </div>


        {/* 2.5. RESUME SECTION (New) */}
        {resumeData && (
          <div className="flex-none mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Profile</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-blue-400 font-medium transition"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Skills */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-lg font-semibold text-blue-300 mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills?.flatMap(cat => cat.items).map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                      {skill}
                    </span>
                  )) || <p className="text-slate-500 text-sm">No skills found.</p>}
                </div>
              </div>

              {/* Experience */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl lg:col-span-2 relative group-experience">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-300">Experience & Projects</h3>
                  <div className="flex items-center gap-3">
                    {genMessage && (
                      <span className={`text-[10px] ${genMessage.includes('error') || genMessage.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                        {genMessage}
                      </span>
                    )}
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={generating || !user?._id && !user?.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs rounded-lg transition border border-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                      {generating ? 'Generating...' : 'Generate Questions'}
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {resumeData.experience?.map((exp, i) => (
                    <div key={i} className="border-l-2 border-slate-700 pl-4">
                      <h4 className="text-white font-medium">{exp.role} at {exp.company}</h4>
                      <p className="text-slate-500 text-sm">{exp.duration}</p>
                    </div>
                  ))}
                  {resumeData.projects?.map((proj, i) => (
                    <div key={`p-${i}`} className="border-l-2 border-indigo-700 pl-4 mt-4">
                      <h4 className="text-white font-medium">{proj.title}</h4>
                      <p className="text-slate-500 text-sm line-clamp-2">{proj.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN ACTIONS (Flex-1 to Fill Screen) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">

          {/* JOIN MEETING BUTTON */}
          <button
            onClick={() => navigate('/room')}
            className="group relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-900 p-1 text-left shadow-2xl shadow-indigo-900/20 transition-all hover:scale-[1.01] hover:shadow-indigo-900/40"
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] opacity-10 mix-blend-overlay bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>

            <div className="relative h-full w-full bg-slate-950/0 p-8 flex flex-col justify-end">
              <div className="mb-auto bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors shadow-lg">
                <Video className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">Join Meeting</h2>
                <p className="text-indigo-200/80 text-base">Start a P2P interview session instantly.</p>
              </div>
            </div>
          </button>


          {/* UPLOAD RESUME BUTTON */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="group relative w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 p-8 text-left transition-all hover:border-slate-700 hover:bg-slate-800/80"
          >
            <div className="absolute top-8 right-8 text-slate-700 group-hover:text-slate-600 transition-colors">
              <Upload size={48} strokeWidth={1} />
            </div>

            <div className="flex flex-col justify-end h-full">
              <div className="mb-auto bg-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-slate-700 transition-colors shadow-lg">
                <Upload className="text-slate-300" size={24} />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-slate-200 mb-2 group-hover:text-white">Upload Resume</h2>
                <p className="text-slate-500 text-base group-hover:text-slate-400">Parse your CV for better peer matching.</p>
              </div>
            </div>
          </button>

        </div>
      </main>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-3xl h-[92vh] sm:h-[85vh] max-h-[860px] shadow-2xl relative flex flex-col">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition"
            >
              <X size={20} className="text-slate-400" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-4 flex-none">Upload Your Resume</h2>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <UploadResume userId={user?._id || user?.id} onSave={handleResumeSaved} existingData={resumeData} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
