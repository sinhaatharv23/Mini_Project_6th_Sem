import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {auth,provider} from '../firebase'; // Importing auth and provider from firebase.js
import { useNavigate } from 'react-router-dom'; // Fixed import and added hook
// import { Video, Code2, Rocket, User, Settings } from 'lucide-react';
import { Video, Code2, Rocket, User, Settings, Mail, Lock } from 'lucide-react'; //added by Binit

const LoginScreen = ({ onJoin }) => {
  const navigate = useNavigate(); // Initialize navigation
  // const [name, setName] = useState('');   // commented out by Binit
  // const [domain, setDomain] = useState(''); // commented out by Binit


  //State for form fields - changed and added by Binit 
  // for connecting frontend with backend 

  const[username, setUsername] = useState('');
  const[email,setEmail] = useState('');

  //state for UI Feedback 
  const [loading,setLoading] = useState(false);
  const [error , setError] = useState('');
  // end of binit

  // TOGGLE STATE: true = Login Mode, false = Register Mode
  const [isLoginMode, setIsLoginMode] = useState(true); 
  
  // New State for Password Input
  const [password, setPassword] = useState(''); // added by Binit 

  const [scrolled, setScrolled] = useState(false);

  // 1. Listen for Scroll Events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   if (name.trim()) {
  //     // Pass data to parent if needed
  //     if (onJoin) onJoin({ name, domain });
      
  //     // ROUTE TO DASHBOARD
  //     navigate('/dashboard');
  //   }
  // }; // commented out by Binit to use actually auth logic 

  // The talk to backend logic 
  const handleSubmit = async (e) =>{
    e.preventDefault(); 
    //Basic Client-side validation 
    // if(!username.trimEnd() || !email.trim()){
    //   setError("Please fill in all fields");
    //   return ; 
    // }

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
    setError("") //clear previous error 

    try{
      console.log("Sending request to backend ...");

      //1. Dynamic url : Choose endpoint based on mode
      const endpoint = isLoginMode 
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register" ;

      //2. Dynamic Payload : Login Needs identifier , register needs username + email 
      // Note : Need to update backend later to support identifier for now only email 

      const payload = isLoginMode 
      ?{
        identifier: email,password
      }:{
        username,
        email,
        password
      };

      
      
      //A. Send data to server 
      //const response = await fetch("http://localhost:5000/api/auth/register",
      const response = await fetch(endpoint,
        {
          method: "POST",
          headers : {"Content-Type" : "application/json"},
          body: JSON.stringify(payload),
          credentials: "include"
        });

        const data = await response.json(); // B. Handle Server Response 
        
        if (response.ok){
          console.log("Login Success.....",data);

          //C . save user session 
          // 1. Save Token specifically for PrivateRoute
          localStorage.setItem("token", data.accessToken);
          
          // 2. Save User Details specifically for Dashboard/Profile
          localStorage.setItem("user", JSON.stringify(data.user)); 
          // --------------------------

          //D. update Parent & navigate 
          if(onJoin) onJoin(data);
          navigate('/dashboard');
        }else {
          console.error("Login failed >>>",data);
          setError(data.message || "Authentication failed");

        }
      
        }catch(err){
          console.error("Network Error:",err);
          setError("Server is not reachable. Is the backend running?");
        }finally{
          setLoading(false);
        }
    
  };
  // ================= FIREBASE GOOGLE LOGIN =================
  /*
  This function runs when the user clicks "Sign in with Google"

  What happens step-by-step:
  1) Opens Google account selection popup
  2) User chooses their Gmail
  3) Firebase authenticates the user
  4) We get user's basic details (name, email, photo)
  5) Save info locally (optional)
  6) Redirect user to dashboard
*/
const handleGoogleLogin = async () => {
  try {
    // 1️⃣ Open Google popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 2️⃣ Get Firebase ID token
    const token = await user.getIdToken();

    // 3️⃣ Send token to backend
    const response = await fetch("http://localhost:5000/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token }),
      credentials: "include" // Important to include cookies for refresh token
    });

    const data = await response.json();

    if (response.ok) {
      // 4️⃣ Save JWT like normal login
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // 5️⃣ Redirect
      navigate('/dashboard');
    } else {
      setError(data.message);
    }

  } catch (error) {
    console.error("Google Login Error:", error);
    setError("Google sign-in failed");
  }
};
  // =================Prevent logged-in users from seeing login page=================
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

      // Only redirect if user exists
      if (localStorage.getItem("user")) {
        navigate("/dashboard");
      }
    } catch {}
  };

  checkSession();
}, []);


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
                {username ? username[0].toUpperCase() : <User size={16} />}    
                {/* name -> username */}
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

                {/* --- ADDED ERROR DISPLAY --- */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
                    {error}
                  </div>
                )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                      
                      {/* 1. HEADER TEXT */}
                      <div className="text-center mb-6">
                          <h3 className="text-xl font-bold text-white">
                              {isLoginMode ? "Welcome Back" : "Create Account"}
                          </h3>
                          <p className="text-slate-400 text-sm">
                              {isLoginMode ? "Enter your credentials to access your account." : "Join the community today."}
                          </p>
                      </div>

                      {/* 2. DYNAMIC INPUTS */}
                      {!isLoginMode && (
                          <div className="space-y-2">
                              <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Username</label>
                              <div className="relative">
                                  <User className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                                  <input 
                                      type="text" 
                                      placeholder="Sarah_Dev" 
                                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 transition text-white"
                                      value={username}
                                      onChange={(e) => setUsername(e.target.value)}
                                  />
                              </div>
                          </div>
                      )}

                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">
                              {isLoginMode ? "Username or Email" : "Email Address"}
                          </label>
                          <div className="relative">
                              <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                              <input 
                                  type="text" 
                                  placeholder={isLoginMode ? "sarah@gmail.com or Sarah_Dev" : "sarah@gmail.com"} 
                                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 transition text-white"
                                  value={email} 
                                  onChange={(e) => setEmail(e.target.value)} 
                                  required
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider ml-1">Password</label>
                          <div className="relative">
                              <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                              <input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 transition text-white"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  required
                              />
                          </div>
                      </div>

                      {/* 3. ACTION BUTTONS */}
                      <div className="pt-2">
                          <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-500/25"
                          >
                              {loading ? "Processing..." : (isLoginMode ? "Sign In" : "Create Account")}
                          </button>
                      </div>

                                {/*4. Google Sign-In Button
                                    When user clicks this:
                                    1) Firebase opens Google account popup
                                    2) User selects Gmail
                                    3) Firebase authenticates the user
                                    4) We receive user details and redirect to dashboard
                                */}
                      <button 
                          type="button"
                          className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition"
                          onClick={handleGoogleLogin} 
                      >
                          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                          Sign in with Google
                      </button>

                      {/* 5. TOGGLE LINK */}
                      <div className="text-center mt-4">
                          <button 
                              type="button"
                              onClick={() => setIsLoginMode(!isLoginMode)}
                              className="text-slate-400 text-sm hover:text-white transition"
                          >
                              {isLoginMode ? (
                                  <>Don't have an account? <span className="text-blue-400 font-bold">Sign Up</span></>
                              ) : (
                                  <>Already have an account? <span className="text-blue-400 font-bold">Log In</span></>
                              )}
                          </button>
                      </div>
                  </form>
            </div>
        </div>
      </main>
    </div>
  );
};

export default LoginScreen;