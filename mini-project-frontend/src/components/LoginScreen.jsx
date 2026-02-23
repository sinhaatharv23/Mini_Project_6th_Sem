import React, { useState, useEffect, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Video, Code2, Rocket, User, Settings, Mail, Lock, Users, MessageSquare, ChevronDown } from 'lucide-react';

const LoginScreen = ({ onJoin }) => {
  const navigate = useNavigate();

  // --- Auth States ---
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Scroll State & Refs ---
  const [scrolled, setScrolled] = useState(false);
  const homeRef = useRef(null);
  const howItWorksRef = useRef(null);
  const getStartedRef = useRef(null);

  // NEW: Refs for the Sliding Animation
  const navRef = useRef(null);
  const homeBtnRef = useRef(null);
  const howBtnRef = useRef(null);
  const startBtnRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  // NEW: State to track which section is currently active on the screen
  const [activeSection, setActiveSection] = useState('home');

  // NEW: Calculate where the blue sliding pill should move
  useEffect(() => {
    const updateIndicator = () => {
      let activeBtn = null;
      if (activeSection === 'home') activeBtn = homeBtnRef.current;
      if (activeSection === 'how-it-works') activeBtn = howBtnRef.current;
      if (activeSection === 'get-started') activeBtn = startBtnRef.current;

      if (activeBtn && activeBtn.offsetWidth > 0) {
        setIndicatorStyle({
          left: activeBtn.offsetLeft,
          top: activeBtn.offsetTop,
          width: activeBtn.offsetWidth,
          height: activeBtn.offsetHeight,
          opacity: 1,
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    
    // Recalculate if the window size changes
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeSection, scrolled]);

  // NEW: Intersection Observer to update the active section as you scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 } // Triggers when 50% of the section is visible
    );

    if (homeRef.current) observer.observe(homeRef.current);
    if (howItWorksRef.current) observer.observe(howItWorksRef.current);
    if (getStartedRef.current) observer.observe(getStartedRef.current);

    return () => observer.disconnect();
  }, []);

  // 1. Listen for Scroll Events (For floating header)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Smooth Scroll Function
  const scrollToSection = (elementRef) => {
    elementRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Check Session on Load ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });
        if (!res.ok) return;
        const data = await res.json();
        localStorage.setItem("token", data.accessToken);
        if (localStorage.getItem("user")) navigate("/dashboard");
      } catch {}
    };
    checkSession();
  }, [navigate]);

  // --- Normal Login / Register Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (isLoginMode) {
      if (!email.trim() || !password.trim()) {
        setError("Please fill in all details");
        return;
      }
    } else {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError("Please fill in all details");
        return;
      }
    }

    setLoading(true);
    setError(""); 

    try {
      const endpoint = isLoginMode 
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register" ;

      const payload = isLoginMode ? { identifier: email, password } : { username, email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await response.json(); 
      
      if (response.ok) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user)); 
        if(onJoin) onJoin(data);
        navigate('/dashboard');
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch(err) {
      setError("Server is not reachable. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // --- Google Login ---
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include" 
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sfpro relative overflow-x-hidden selection:bg-blue-500/30">
      
      {/* =======================
          HEADER / NAVIGATION
          ======================= */}
      {/* Left Island (Logo) */}
      <div className={`fixed z-50 transition-all duration-700 ease-in-out ${scrolled ? 'top-6 left-4' : 'top-0 left-0 p-8'}`}>
        <div className={`flex items-center transition-all duration-700 border border-white/10 shadow-2xl
          ${scrolled ? 'flex-col space-y-4 bg-slate-900/40 backdrop-blur-md p-3 rounded-full' : 'flex-row space-x-3 bg-slate-900/20 backdrop-blur-md px-6 py-3 rounded-full'}`}>
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20 z-10">
            <Rocket size={20} className="text-white" />
          </div>
          <span className={`font-bold tracking-tight text-shadow transition-all duration-700 origin-left
              ${scrolled ? 'vertical-text text-sm py-2 opacity-80' : 'text-lg'}`}
            style={{ writingMode: scrolled ? 'vertical-rl' : 'horizontal-tb', textOrientation: 'mixed' }}>
            PeerInterview<span className="text-blue-500">.io</span>
          </span>
        </div>
      </div>

     {/* Center Island (Navigation Links) */}
      <div className={`fixed z-50 transition-all duration-700 ease-in-out left-1/2 -translate-x-1/2 ${scrolled ? 'top-6' : 'top-8'}`}>
        
        {/* WIDER CAPSULE: Increased padding to p-2 and gap to gap-2 sm:gap-3 */}
        <nav ref={navRef} className="relative flex items-center gap-2 sm:gap-3 p-2 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
          
          {/* THE SLIDING BLUE PILL */}
          <div 
            className="absolute bg-blue-600 rounded-full transition-all duration-300 ease-out shadow-lg shadow-blue-500/20"
            style={{ 
              left: `${indicatorStyle.left}px`, 
              top: `${indicatorStyle.top}px`, 
              width: `${indicatorStyle.width}px`, 
              height: `${indicatorStyle.height}px`, 
              opacity: indicatorStyle.opacity 
            }}
          />

          {/* BUTTONS: Upgraded to text-base, tracking-wide, and larger padding (px-6 py-2.5) */}
          <button 
            ref={homeBtnRef}
            onClick={() => scrollToSection(homeRef)} 
            className={`relative z-10 px-6 py-2.5 rounded-full text-base tracking-wide font-semibold transition-colors duration-300
              ${activeSection === 'home' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Home
          </button>

          <button 
            ref={howBtnRef}
            onClick={() => scrollToSection(howItWorksRef)} 
            className={`relative z-10 hidden sm:block px-6 py-2.5 rounded-full text-base tracking-wide font-semibold transition-colors duration-300
              ${activeSection === 'how-it-works' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
          >
            How it works
          </button>

          <button 
            ref={startBtnRef}
            onClick={() => scrollToSection(getStartedRef)} 
            className={`relative z-10 px-6 py-2.5 rounded-full text-base tracking-wide font-semibold transition-colors duration-300
              ${activeSection === 'get-started' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Get Started
          </button>

        </nav>
      </div>

      {/* Right Island (Profile/Settings Placeholder) */}
      <div className={`fixed z-50 transition-all duration-700 ease-in-out flex items-center ${scrolled ? 'top-6 right-4 flex-col-reverse gap-3' : 'top-0 right-0 p-8 flex-row gap-4'}`}>
        <button className={`transition-all duration-500 rounded-full hover:text-white backdrop-blur-sm border border-white/10 hover:border-white/10
           ${scrolled ? 'bg-slate-900/40 p-3 text-slate-300' : 'p-2 text-slate-300 hover:bg-white/10'}`}>
            <Settings size={20} />
        </button>
        <button onClick={() => scrollToSection(getStartedRef)} className={`flex items-center transition-all duration-700 group backdrop-blur-sm
            ${scrolled ? 'flex-col p-2 rounded-full bg-slate-900/40 border border-white/10 space-y-0 h-auto w-auto' : 'space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10'}`}>
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 text-slate-400 group-hover:text-blue-400 transition">
                <User size={16} />
            </div>
            <span className={`text-sm font-medium text-slate-200 group-hover:text-white transition-all duration-500 ${scrolled ? 'h-0 w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
              Sign In
            </span>
        </button>
      </div>


      {/* =======================
          SECTION 1: HOME
          ======================= */}
      <section id="home" ref={homeRef} className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto text-center flex flex-col items-center">
            
            {/* 1. INTRO QUOTE */}
            <div className="flex items-center gap-4 mb-10 opacity-80">
                <div className="h-[1px] w-8 bg-gradient-to-l from-blue-500/80 to-transparent"></div>
                <p className="text-blue-300 italic text-sm md:text-lg font-medium tracking-wide">
                    "Ace your next technical round"
                </p>
                <div className="h-[1px] w-8 bg-gradient-to-r from-blue-500/80 to-transparent"></div>
            </div>
            
            {/* 2. MAIN HEADLINE */}
            <h1 className="text-6xl md:text-8xl font-black italic uppercase leading-tight md:leading-[1.1] mb-12 md:mb-16 drop-shadow-2xl tracking-tighter">
                REAL PRACTICE. <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-200 to-white">
                    REAL FEEDBACK.
                </span>
            </h1>
            
            {/* 3. NEW 3-COLUMN LAYOUT (Box - Text - Box) */}
            <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-8 lg:gap-16 mt-4">
                
                {/* LEFT BOX: HD Video Sync */}
                <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-blue-500/90 transition duration-500 w-full lg:w-80 shadow-2xl text-left">
                    <div className="bg-blue-500/20 w-14 h-14 flex items-center justify-center rounded-2xl mb-4 border border-blue-500/20">
                      <Video className="text-blue-400 h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">HD Video Sync</h3>
                    <p className="text-slate-400 text-sm">Low latency peer-to-peer connection for smooth, real-time interviews.</p>
                </div>

                {/* CENTER: Vertically Stacked Text */}
                <div className="flex flex-col space-y-5 text-center px-4 w-full max-w-lg">
                    <p className="text-lg md:text-xl font-medium tracking-wide text-blue-100/70">
                        Connect instantly with peers.
                    </p>
                    <p className="text-lg md:text-xl font-medium tracking-wide text-blue-100/70">
                        Swap roles between Interviewer & Candidate.
                    </p>
                    <p className="text-lg md:text-xl font-medium tracking-wide text-blue-100/70">
                        Master your domain through active practice.
                    </p>
                </div>

                {/* RIGHT BOX: Smart Questions */}
                <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-purple-500/90 transition duration-500 w-full lg:w-80 shadow-2xl text-left">
                    <div className="bg-purple-500/20 w-14 h-14 flex items-center justify-center rounded-2xl mb-4 border border-purple-500/20">
                      <Code2 className="text-purple-400 h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">Smart Questions</h3>
                    <p className="text-slate-400 text-sm">Curated question banks for Frontend, Backend, and System Design.</p>
                </div>

            </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-500 cursor-pointer hover:text-white transition" onClick={() => scrollToSection(howItWorksRef)}>
            <ChevronDown size={32} />
        </div>
      </section>

      {/* =======================
          SECTION 2: HOW IT WORKS
          ======================= */}
      <section id="how-it-works" ref={howItWorksRef} className="min-h-screen flex flex-col items-center justify-center py-24 px-6 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-20">
                <h2 className="text-5xl font-black italic uppercase leading-tight text-white mb-6">How it works</h2>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">Four simple steps to elevate your interview skills and land your dream role.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                
                {/* Step 1 */}
                <div className="group relative p-8 rounded-3xl bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50 transition duration-300 overflow-hidden">
                    {/* The Animated Number */}
                    <div className="text-6xl font-black text-slate-800 absolute top-4 right-6 opacity-40 z-0 select-none transition-all duration-500 ease-out group-hover:scale-[6.5] group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:opacity-10 group-hover:text-blue-500">
                        1
                    </div>
                    <div className="relative z-10">
                        <Users className="text-blue-500 h-10 w-10 mb-6 transform transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
                        <h3 className="text-xl font-bold text-white mb-3">Join the Queue</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Select your domain (Frontend, Backend, etc.) and enter our smart matching queue.</p>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="group relative p-8 rounded-3xl bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50 transition duration-300 overflow-hidden">
                    <div className="text-6xl font-black text-slate-800 absolute top-4 right-6 opacity-40 z-0 select-none transition-all duration-500 ease-out group-hover:scale-[6.5] group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:opacity-10 group-hover:text-purple-500">
                        2
                    </div>
                    <div className="relative z-10">
                        <Rocket className="text-purple-500 h-10 w-10 mb-6 transform transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
                        <h3 className="text-xl font-bold text-white mb-3">Get Matched</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Our system instantly connects you with a peer at a similar skill level via WebRTC.</p>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="group relative p-8 rounded-3xl bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50 transition duration-300 overflow-hidden">
                    <div className="text-6xl font-black text-slate-800 absolute top-4 right-6 opacity-40 z-0 select-none transition-all duration-500 ease-out group-hover:scale-[6.5] group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:opacity-10 group-hover:text-emerald-500">
                        3
                    </div>
                    <div className="relative z-10">
                        <Video className="text-emerald-500 h-10 w-10 mb-6 transform transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
                        <h3 className="text-xl font-bold text-white mb-3">Live Interview</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Take turns playing the role of Interviewer and Candidate using our curated questions.</p>
                    </div>
                </div>

                {/* Step 4 */}
                <div className="group relative p-8 rounded-3xl bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50 transition duration-300 overflow-hidden">
                    <div className="text-6xl font-black text-slate-800 absolute top-4 right-6 opacity-40 z-0 select-none transition-all duration-500 ease-out group-hover:scale-[6.5] group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:opacity-10 group-hover:text-amber-500">
                        4
                    </div>
                    <div className="relative z-10">
                        <MessageSquare className="text-amber-500 h-10 w-10 mb-6 transform transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
                        <h3 className="text-xl font-bold text-white mb-3">Feedback</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Provide and receive constructive feedback to identify your blind spots and improve.</p>
                    </div>
                </div>
                
            </div>
        </div>
      </section>

      {/* =======================
          SECTION 3: GET STARTED (FORM)
          ======================= */}
      <section id="get-started" ref={getStartedRef} className="min-h-screen flex flex-col items-center justify-center py-24 px-6 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-950 to-slate-950 border-t border-white/5 relative">
        
        <div className="text-center mb-12 relative z-10">
            <h2 className="text-5xl font-black italic uppercase leading-tight text-white mb-4 tracking-tight">Ready to dive in?</h2>
            <p className="text-slate-400 text-lg">Create your account or log in to access the dashboard.</p>
        </div>

        <div className="w-full max-w-md relative z-10">
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl">
                
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm text-center flex items-center justify-center gap-2">
                    <Lock size={16}/> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white">
                            {isLoginMode ? "Welcome Back" : "Create Account"}
                        </h3>
                    </div>

                    {!isLoginMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="e.g. Sarah_Dev" 
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 focus:bg-slate-900 transition text-white"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                            {isLoginMode ? "Email Address" : "Email Address"}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input 
                                type="email" 
                                placeholder="sarah@example.com" 
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 focus:bg-slate-900 transition text-white"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 focus:bg-slate-900 transition text-white"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-500/25 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : (isLoginMode ? "Sign In" : "Create Account")}
                        </button>
                    </div>

                    <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">Or</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <button 
                        type="button"
                        className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-100 transition"
                        onClick={handleGoogleLogin} 
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                        Sign in with Google
                    </button>

                    <div className="text-center mt-6 pt-2">
                        <button 
                            type="button"
                            onClick={() => setIsLoginMode(!isLoginMode)}
                            className="text-slate-400 text-sm hover:text-white transition"
                        >
                            {isLoginMode ? (
                                <>Don't have an account? <span className="text-blue-400 font-bold ml-1">Sign Up</span></>
                            ) : (
                                <>Already have an account? <span className="text-blue-400 font-bold ml-1">Log In</span></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </section>

    </div>
  );
};

export default LoginScreen;