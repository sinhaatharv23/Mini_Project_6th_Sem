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

const app = express();
const server = http.createServer(app);

// 1. Connect to MongoDB
connectDB();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Auth Routes
app.use('/api/auth', authRoute);

// 4. Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Make sure this matches your frontend port
        methods: ["GET", "POST"],
    },
});

// --- VIDEO CALL LOGIC ---

let waitingUser = null; 
const activeCalls = {}; // Stores pairs: { socketId: partnerSocketId }

io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    socket.on("join-room", () => {
        if (waitingUser) {
            // Match found!
            const peer1 = waitingUser;
            const peer2 = socket.id;

            console.log(`Matched: ${peer1} <-> ${peer2}`);

            // 1. Notify both users
            io.to(peer1).emit("matched", { peerId: peer2 });
            io.to(peer2).emit("matched", { peerId: peer1 });

            // 2. Save the pair in memory so we know who to disconnect later
            activeCalls[peer1] = peer2;
            activeCalls[peer2] = peer1;

            waitingUser = null;
        } else {
            // Wait for a partner
            waitingUser = socket.id;
            socket.emit("waiting");
            console.log(`Waiting: ${socket.id}`);
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
        if (waitingUser === socket.id) {
            waitingUser = null;
        }

        // 2. If they were in a call, notify the partner
        const partnerId = activeCalls[socket.id];
        if (partnerId) {
            io.to(partnerId).emit("peer-disconnected"); // We will handle this in Frontend
            
            // Clean up memory
            delete activeCalls[socket.id];
            delete activeCalls[partnerId];
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});