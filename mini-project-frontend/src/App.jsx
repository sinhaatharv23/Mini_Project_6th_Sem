import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// --- IMPORT YOUR COMPONENTS ---
import LoginScreen from './components/LoginScreen';  // The Landing/Login Page
import Dashboard from './components/Dashboard';      // The Static HUD Dashboard
import InterviewRoom from './components/InterviewRoom'; // The Interview Room

function App() {
  // We keep this state to store the user's info after they log in
  const [userData, setUserData] = useState(null);

  // This function gets called when the user hits "Login" in LoginScreen.jsx
  const handleLogin = (data) => {
    setUserData(data);
    console.log("User logged in:", data);
  };

  return (
    <Router>
      <Routes>
        
        {/* ROUTE 1: The Landing Page (Login) */}
        <Route path="/" element={<LoginScreen onJoin={handleLogin} />} />

        {/* ROUTE 2: The User Dashboard (Static Page) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* ROUTE 3: The Interview Room */}
        <Route 
          path="/room" 
          element={
            <InterviewRoom 
              partnerName="Random Peer" 
              questions={[
                 "Can you explain the difference between `let`, `const`, and `var`?",
                 "How does the React Virtual DOM work?",
                 "Explain the concept of 'Hoisting' in JavaScript.",
                 "What are React Hooks and why do we use them?"
              ]}
              // Simple way to go back to dashboard if they leave
              onLeave={() => window.location.href = '/dashboard'} 
            />
          } 
        />

      </Routes>
    </Router>
  );
}

export default App;