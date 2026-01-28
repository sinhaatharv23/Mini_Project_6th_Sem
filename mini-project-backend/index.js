// const http = require('http');
// const express = require('express');
// // const path = require('path');
// const {Server} = require('socket.io');
// const cors = require('cors');
// const app = express();
// app.use(cors());
// const server = http.createServer(app);
// const io = new Server(server,{
//     cors:{
//         origin: "http://localhost:5173",
//         methods: ["GET","POST"],
//     },
// });
// let waitingUser = null;
// io.on("connection",(socket)=>{
//     console.log("User connected:",socket.id);
//     socket.on("join-room",()=>{
//         console.log("join-room received from:",socket.id);
//         if(waitingUser){
//             //Match two user
//             const peer1 = waitingUser;
//             const peer2 = socket.id;
//             io.to(peer1).emit("matched",{peerId:peer2});
//             io.to(peer2).emit("matched",{peerId:peer1});
//             waitingUser=null;
//         }else{
//             waitingUser=socket.id;
//             socket.emit("waiting");
//         }
//     });
//     socket.on("offer",({to,offer})=>{
//         io.to(to).emit("offer",{from:socket.id,offer});
//     });
//     socket.on("answer",({to,answer})=>{
//         io.to(to).emit("answer",{from:socket.id,answer});
//     });
//     socket.on("ice-candidate",({to,candidate})=>{
//         io.to(to).emit("ice-candidate",{from:socket.id,candidate});
//     });
//     socket.on("disconnect",()=>{
//         console.log("User disconnected",socket.id);
//         if(waitingUser===socket.id) waitingUser=null;
//     });
// });
// server.listen(5000,()=>{
//     console.log("Signaling server running on http://localhost:5000");
// });



//edited by : Binit 
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./db');
const authRoute = require('./routes/auth');

// Initialize App
const app = express();
const server = http.createServer(app);

// 1. Connect to Database (MongoDB)
connectDB();

// 2. Middleware
app.use(cors());
app.use(express.json()); // Allows parsing JSON from frontend requests

// 3. API Routes (Authentication)
app.use('/api/auth', authRoute);

// 4. Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Your Vite Frontend URL
        methods: ["GET", "POST"],
    },
});

// --- Your Existing Video Call Logic Merged Here ---

let waitingUser = null; // Keeps track of who is waiting for a peer

io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    // Join Room / Matchmaking Logic
    socket.on("join-room", () => {
        console.log("join-room received from:", socket.id);
        
        if (waitingUser) {
            // Match the current user with the waiting user
            const peer1 = waitingUser;
            const peer2 = socket.id;

            console.log(`Matching ${peer1} with ${peer2}`);

            // Notify both users
            io.to(peer1).emit("matched", { peerId: peer2 });
            io.to(peer2).emit("matched", { peerId: peer1 });

            // Reset waiting user
            waitingUser = null;
        } else {
            // No one is waiting, so this user becomes the waiting user
            waitingUser = socket.id;
            socket.emit("waiting");
            console.log(`User ${socket.id} is now waiting...`);
        }
    });

    // Signaling Events (WebRTC Handshake)
    socket.on("offer", ({ to, offer }) => {
        io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
        io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    // Handle Disconnect
    socket.on("disconnect", () => {
        console.log("User Disconnected:", socket.id);
        // If the disconnected user was the one waiting, clear the slot
        if (waitingUser === socket.id) {
            waitingUser = null;
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});