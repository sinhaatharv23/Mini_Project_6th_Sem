const http = require('http');
const express = require('express');
// const path = require('path');
const {Server} = require('socket.io');
const cors = require('cors');
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin: "http://localhost:5173",
        methods: ["GET","POST"],
    },
});
let waitingUser = null;
io.on("connection",(socket)=>{
    console.log("User connected:",socket.id);
    socket.on("join-room",()=>{
        console.log("join-room received from:",socket.id);
        if(waitingUser){
            //Match two user
            const peer1 = waitingUser;
            const peer2 = socket.id;
            io.to(peer1).emit("matched",{peerId:peer2});
            io.to(peer2).emit("matched",{peerId:peer1});
            waitingUser=null;
        }else{
            waitingUser=socket.id;
            socket.emit("waiting");
        }
    });
    socket.on("offer",({to,offer})=>{
        io.to(to).emit("offer",{from:socket.id,offer});
    });
    socket.on("answer",({to,answer})=>{
        io.to(to).emit("answer",{from:socket.id,answer});
    });
    socket.on("ice-candidate",({to,candidate})=>{
        io.to(to).emit("ice-candidate",{from:socket.id,candidate});
    });
    socket.on("disconnect",()=>{
        console.log("User disconnected",socket.id);
        if(waitingUser===socket.id) waitingUser=null;
    });
});
server.listen(5000,()=>{
    console.log("Signaling server running on http://localhost:5000");
});