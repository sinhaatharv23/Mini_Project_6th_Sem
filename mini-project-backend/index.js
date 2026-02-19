//edited by : Binit 
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const jwt = require('jsonwebtoken'); // verify access token
const cookieParser = require('cookie-parser'); // needed for refresh token based continous login - AMAN

const connectDB = require('./db');
const authRoute = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// 1. Connect to MongoDB
connectDB();

// 2. Middleware
app.use(cors({
   origin: "http://localhost:5173",   // necessary while using refresh tokens
   credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 3. Auth Routes
app.use('/api/auth', authRoute);

// 4. Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Make sure this matches your frontend port
        methods: ["GET", "POST"],
    },
});
// SOCKET SESSION CONTROL - AMAN
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;  // get token from client
    console.log("📩 Incoming socket token:", token);   // ADD THIS
    if (!token) {
        console.log("❌ No token received");
        return next(new Error("Authentication failed: No token"));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // token valid or not
        socket.userId = decoded.id; // attach logged-in user id
        console.log("✅ Token valid for user:", decoded.id);  // ADD THIS
        next();
    } catch (err) {
        console.log("❌ Invalid token");
        return next(new Error("Authentication failed: Invalid or expired token"));
    }
});
// --- VIDEO CALL LOGIC ---

let waitingUser = null; 
const activeCalls = {}; // Stores pairs: { socketId: partnerSocketId }

io.on("connection", (socket) => {
    // console.log("User Connected:", socket.id);

    // socket.on("join-room", () => {
    //     if (waitingUser) {
    //         // Match found!
    //         const peer1 = waitingUser;
    //         const peer2 = socket.id;

    //         console.log(`Matched: ${peer1} <-> ${peer2}`);

    //         // 1. Notify both users
    //         io.to(peer1).emit("matched", { peerId: peer2 });
    //         io.to(peer2).emit("matched", { peerId: peer1 });

    //         // 2. Save the pair in memory so we know who to disconnect later
    //         activeCalls[peer1] = peer2;
    //         activeCalls[peer2] = peer1;

    //         waitingUser = null;
    //     } else {
    //         // Wait for a partner
    //         waitingUser = socket.id;
    //         socket.emit("waiting");
    //         console.log(`Waiting: ${socket.id}`);
    //     }
    // });

    //new changed code - Binit 
    // 1. Get Username from Frontend
    const username = socket.handshake.query.username || "Anonymous";
    console.log(`User Connected: ${socket.id} (${username})`);

    // 2. Store it in the socket object for later use
    socket.data.username = username;

    socket.data.userId = socket.userId; // stores logged in user-id - AMAN

     //CHAT MESSAGE(Only between matched user without db storage) - Edited By Atharva
        socket.on("chat-message",({message})=>{
            if(!message?.trim()) return; // Ignore empty messages
            const partnerId = activeCalls[socket.id];
            if(partnerId){
                io.to(partnerId).emit("chat-message",{
                    from: socket.data.username, // Send sender's name
                    message
                 }
                );
            }
        });
        socket.on("typing",()=>{
            const partnerId = activeCalls[socket.id];
            if(partnerId){
                socket.to(partnerId).emit("user-typing",{
                    username:socket.data.username
                });
            }
        });
        socket.on("stop-typing",()=>{
            const partnerId = activeCalls[socket.id];
            if(partnerId){
                socket.to(partnerId).emit("user-stop-typing");
            }
        });
    socket.on("join-room", () => {
        if (waitingUser) {
            // Match found!
            const peer1 = waitingUser;
            const peer2 = socket; // The current socket object

            // Get names
            const name1 = peer1.data.username;
            const name2 = peer2.data.username;

            console.log(`Matched: ${name1} <-> ${name2}`);

            // Send MATCH event with Partner Names
            io.to(peer1.id).emit("matched", { peerId: peer2.id, partnerName: name2 });
            io.to(peer2.id).emit("matched", { peerId: peer1.id, partnerName: name1 });

            // ... activeCalls logic ...
            activeCalls[peer1.id] = peer2.id;
            activeCalls[peer2.id] = peer1.id;
            waitingUser = null;
        } else {
            waitingUser = socket; // Save the WHOLE socket object, not just ID
            socket.emit("waiting");
        }
    });

    // Signaling (Pass data between peers)
    socket.on("offer", ({ to, offer }) => {
        io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
        io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    // --- DISCONNECT FIX ---
    socket.on("disconnect", () => {
        console.log("User Disconnected:", socket.id);

        // 1. If they were waiting, remove them from the line
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }

        // 2. If they were in a call, notify the partner
        const partnerId = activeCalls[socket.id];
        if (partnerId) {
            io.to(partnerId).emit("peer-disconnected"); // We will handle this in Frontend
            io.to(partnerId).emit("chat-ended"); // Notify partner that chat has ended
            // Clean up memory
            if(activeCalls[socket.id]){
            delete activeCalls[socket.id];
            delete activeCalls[partnerId];
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});