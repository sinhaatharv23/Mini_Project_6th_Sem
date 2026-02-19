import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// --- IMPORT YOUR COMPONENTS ---
import LoginScreen from './components/LoginScreen';  // The Landing/Login Page
import Dashboard from './components/Dashboard';      // The Static HUD Dashboard
import InterviewRoom from './components/InterviewRoom'; // The Interview Room



import PrivateRoute from './components/PrivateRoute'; // comment this out if you dont want the jwt auth part for now


function App() {
  // We keep this state to store the user's info after they log in
  const [, setUserData] = useState(null);

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


        {/* comment out the below single route path in case you want the previous accessibility */}
        {/* ROUTE 2: The User Dashboard (Static Page) */}
        {/* <Route path="/dashboard" element={<Dashboard />} />  */}
        {/* Protect dashboard and room routes */}
        <Route element={<PrivateRoute />}>

        <Route path="/dashboard" element={<Dashboard />} />

       <Route 
       path="/room" 
       element={
       <InterviewRoom 
        partnerName="Random Peer" 
        questions={[]}
        onLeave={() => window.location.href = '/dashboard'} 
      />
      } 
      />

      </Route>

      {/* Was written twice thats why removed */}
        {/* ROUTE 3: The Interview Room
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
        /> */}

      </Routes>
    </Router>
  );
}

export default App;
