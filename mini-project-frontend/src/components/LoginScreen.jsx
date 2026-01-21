import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Fixed import and added hook
import { Video, Code2, Rocket, User, Settings } from 'lucide-react';

const LoginScreen = ({ onJoin }) => {
  const navigate = useNavigate(); // Initialize navigation
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // 1. Listen for Scroll Events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      // Pass data to parent if needed
      if (onJoin) onJoin({ name, domain });
      
      // ROUTE TO DASHBOARD
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950 text-white flex flex-col font-sfpro relative">
      
      <div 
        className={`fixed z-50 transition-all duration-700 ease-in-out
          ${scrolled 
            ? 'top-6 left-4'       // Scrolled: Moves down & stays left
            : 'top-0 left-0 p-8'    // Default: Top Left
          }
        `}
      >
        {/* The Glass Pill is APPLIED HERE, only around the logo */}
        <div className={`flex items-center transition-all duration-700 border border-white/10 shadow-2xl
          ${scrolled 
            ? 'flex-col space-y-4 bg-slate-900/20 backdrop-blur-md p-3 rounded-full' // Vertical Pill
            : 'flex-row space-x-3 bg-slate-900/20 backdrop-blur-md px-6 py-3 rounded-full' // Horizontal Pill
          }
        `}>
          <div className="bg-blue-500 p-1.5 rounded-lg shadow-lg shadow-blue-500/20 z-10">
            <Rocket size={20} className="text-white" />
          </div>
          
          {/* Text Animation */}
          <span 
            className={`font-bold tracking-tight text-shadow drop-shadow-md transition-all duration-700 origin-left
              ${scrolled 
                ? 'vertical-text text-sm py-2 opacity-80' // Vertical Mode
                : 'text-lg' // Horizontal Mode
              }
            `}
            style={{ 
              writingMode: scrolled ? 'vertical-rl' : 'horizontal-tb',
              textOrientation: 'mixed' 
            }}
          >
            PeerInterview<span className="text-blue-500">.io</span>
          </span>
        </div>
      </div>


   
      <div 
        className={`fixed z-50 transition-all duration-700 ease-in-out flex items-center
          ${scrolled 
            ? 'top-6 right-4 flex-col-reverse gap-3'  // Scrolled: Moves down & Right
            : 'top-0 right-0 p-8 flex-row gap-4' // Default: Top Right
          }
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

        {/* Profile Button */}
        <button className={`flex items-center transition-all duration-700 group backdrop-blur-sm
            ${scrolled
              ? 'flex-col p-2 rounded-full bg-slate-900/10 border border-white/10 space-y-0 h-auto w-auto' // Vertical Stack
              : 'space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10' // Horizontal Pill
            }
        `}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10">
                {name ? name[0].toUpperCase() : <User size={16} />}
            </div>
            
            <span className={`text-sm font-medium text-slate-200 group-hover:text-white transition-all duration-500
                ${scrolled 
                  ? 'h-0 w-0 opacity-0 overflow-hidden' // Hide text
                  : 'w-auto opacity-100' // Show text
                }
            `}>
              Profile
            </span>
        </button>
      </div>


      {/* =======================
          MAIN CONTENT
          ======================= */}
      <main className="flex-1 flex flex-col lg:flex-row pt-32 pb-20 px-6 lg:px-10 max-w-[1900px] mx-auto w-full">
        
        {/* Left Section: Hero */}
        <div className="flex-1 px-12 lg:px-20 flex flex-col justify-center space-y-10 relative">
            <div className="relative z-10 max-w-2xl">
                <div className="inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-200/10 text-blue-400 text-sm font-medium mb-6">
                    Ace your next technical round
                </div>
                <h1 className="text-6xl font-extrabold leading-tight mb-6 drop-shadow-2xl">
                    Real practice. <br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-500">
                        Real feedback.
                    </span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed max-w-lg drop-shadow-md">
                    Connect instantly with peers. Swap roles between Interviewer and Candidate. Master your domain through active practice.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6 max-w-lg">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-blue-400/90 transition duration-300">
                    <Video className="text-blue-400 mb-4 h-8 w-8" />
                    <h3 className="text-lg font-bold mb-2 text-blue-400">HD Video Sync</h3>
                    <p className="text-blue-100 text-sm">Low latency peer-to-peer connection for smooth interviews.</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-purple-400/90 transition duration-300">
                    <Code2 className="text-purple-400 mb-4 h-8 w-8" />
                    <h3 className="text-lg font-bold mb-2 text-purple-400">Smart Questions</h3>
                    <p className="text-purple-100 text-sm">Curated question banks for Frontend, Backend, and System Design.</p>
                </div>
            </div>
            
            {/* Dummy Content for Scrolling */}
            <div className="max-w-2xl pt-20 opacity-50 space-y-4">
                <h3 className="text-2xl font-bold">How it works</h3>
                <p>1. Join the queue based on your skill set.</p>
                <p>2. Get matched with a peer instantly.</p>
                <p>3. Take turns interviewing each other using our question bank.</p>
                <p>4. Receive feedback and improve.</p>
                <div className="h-64"></div> 
            </div>
        </div>


        {/* Right Section: Form */}
        <div className="w-full lg:w-[450px] px-8 lg:px-12 flex flex-col justify-start pt-10">
            <div className="bg-slate-900/30 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <div className="mb-8">
                    <h2 className="text-4xl font-sfprobold mb-2 text-blue-300">Get Started</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-sfproreg text-blue-100 uppercase tracking-wider">Username</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Sarah_Dev" 
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-white font-sfpro placeholder-slate-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-sfproreg text-blue-100 uppercase tracking-wider">gmail</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                placeholder="sarah@gmail.com" 
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-white font-sfpro placeholder-slate-500"
                                value={domain} 
                                onChange={(e) => setDomain(e.target.value)} 
                                required
                            />
                        
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-bold py-4 rounded-xl transition transform active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-3"
                        >
                            <span className="text-xl">Login</span>
                            
                        </button>
                        <p className="text-center text-slate-500 text-xs mt-4">
                            By joining, you agree to our community guidelines.
                        </p>
                    </div>
                </form>
            </div>
        </div>
      </main>
    </div>
  );
};

export default LoginScreen;