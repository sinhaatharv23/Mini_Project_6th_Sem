require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const jwt = require('jsonwebtoken'); // verify access token
const cookieParser = require('cookie-parser'); // needed for refresh token based continous login - AMAN
const historyRoute = require('./routes/history');
const connectDB = require('./db');
const authRoute = require('./routes/auth');
const InterviewSession = require('./models/InterviewSession');
const SessionHistory = require('./models/SessionHistory');
const QuestionSet = require('./models/Questionset');
const app = express();
const server = http.createServer(app);


// 1. Middleware
app.use(cors({
    origin: "http://localhost:5173",   // necessary while using refresh tokens
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/history',historyRoute);

// Routes moved after Middleware


// 2. Connect to MongoDB
connectDB();


//Middleware setup for the question and resume 
const resumeRoute = require('./routes/resume');
const questionRoute = require('./routes/questions');
app.use('/resume', resumeRoute);
app.use('/questions', questionRoute);

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

    //new changed code - Binit 
    // 1. Get Username from Frontend
    const username = socket.handshake.query.username || "Anonymous";
    console.log(`User Connected: ${socket.id} (${username})`);

    // 2. Store it in the socket object for later use
    socket.data.username = username;

    socket.data.userId = socket.userId; // stores logged in user-id - AMAN

    //CHAT MESSAGE(Only between matched user without db storage) - Edited By Atharva
    socket.on("chat-message", ({ message }) => {
        if (!message?.trim()) return; // Ignore empty messages
        const partnerId = activeCalls[socket.id];
        if (partnerId) {
            io.to(partnerId).emit("chat-message", {
                from: socket.data.username, // Send sender's name
                message
            }
            );
        }
    });
    socket.on("typing", () => {
        const partnerId = activeCalls[socket.id];
        if (partnerId) {
            socket.to(partnerId).emit("user-typing", {
                username: socket.data.username
            });
        }
    });
    socket.on("stop-typing", () => {
        const partnerId = activeCalls[socket.id];
        if (partnerId) {
            socket.to(partnerId).emit("user-stop-typing");
        }
    });
    socket.on("join-room",async () => {
        if (waitingUser) {
            // Match found!
            const peer1 = waitingUser;
            const peer2 = socket; // The current socket object

            // Get names
            const name1 = peer1.data.username;
            const name2 = peer2.data.username;

            console.log(`Matched: ${name1} <-> ${name2}`);

            try{
                const userA = peer1.data.userId;
                const userB = peer2.data.userId;

                //Fetch AI questions from DB:-
                const questionsA = await QuestionSet.findOne({user_id: userA});
                const questionsB = await QuestionSet.findOne({user_id: userB});

                if(!questionsA||!questionsB){
                    console.log("❌ Both users must generate questions first.");
                    peer1.emit("peer-disconnected");
                    peer2.emit("peer-disconnected");

                    waitingUser = null;
                    return;
                }
                //Take 5 questions each:
                const selectedA = questionsA.questions
                    .filter(q => !q.used)
                    .slice(0, 5);

                const selectedB = questionsB.questions
                    .filter(q => !q.used)
                    .slice(0, 5);

                    // 🛑 SAFETY CHECK: Ensure both users have enough unused questions
if (selectedA.length < 5 || selectedB.length < 5) {
    console.log("❌ Not enough prepared questions for one or both users.");

    peer1.emit("question-error");
    peer2.emit("question-error");

    waitingUser = null;
    return;
}

                //Random first interviewer:-
                const firstTurn = Math.random()>0.5? userA:userB;

                const session = await InterviewSession.create({
                    userA,
                    userB,
                    questionsForA: selectedA,
                    questionsForB: selectedB,
                    currentTurn: firstTurn
                });


                //Attach sessionId to sockets
                peer1.data.sessionId = session._id;
                peer2.data.sessionId = session._id;

                console.log("✅ Interview Session Created:",session._id);
                // Send initial turn info
                io.to(peer1.id).emit("turn-updated", {
                    currentTurn: session.currentTurn
                });
                io.to(peer2.id).emit("turn-updated", {
                    currentTurn: session.currentTurn
                });
            }catch(err){
                console.log("❌ Session creation failed:",err);
                waitingUser=null;
                return;
            }

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
// ===============================
// ASK QUESTION EVENT
// Strict Turn Enforcement Logic
// ===============================
    socket.on("ask-question",async()=>{
        try{
            // 1️⃣ Get session ID stored during matchmaking
            const sessionId = socket.data.sessionId;
            if(!sessionId){
                console.log("❌ No session found on socket");
                return;
            }
             // 2️⃣ Fetch interview session from database
             const session = await InterviewSession.findById(sessionId);

             //Validate session existence and status
             if(!session||session.status!=="active"){
                console.log("❌ Session not active or not found");
                return;
             }
             // 3️⃣ STRICT TURN ENFORCEMENT
            // Only the user whose ID matches currentTurn can ask question
            if(String(session.currentTurn)!== String(socket.userId)){
                console.log("❌ Not your turn to ask question");
                return;
            }
            // 4️⃣ Prevent asking multiple questions simultaneously
            if(session.questionActive){
                console.log("❌ A question is already active");
                return;
            }
            let questionList;
            let questionIndex;

            /*
           5️⃣ Decide which question list to use

           If currentTurn === userA:
               → userA is interviewer
               → question should be taken from questionsForB
               (because A asks B's questions)

           Else:
               → userB is interviewer
               → question should be taken from questionsForA
        */


    if(String(session.userA)===String(socket.userId)){
        questionList = session.questionsForB;
        questionIndex= session.indexForB;
    }else{
        questionList = session.questionsForA;
        questionIndex= session.indexForA;
    }
    if(!questionList){
        console.log("❌ Question list missing");
        return;
    }
    // 6️⃣ Check if questions are exhausted
    if(questionIndex>=questionList.length){
        console.log("⚠ No more questions available");
        return;
    }
     // 7️⃣ Select next question
     const selectedQuestion = questionList[questionIndex];
     // ===============================
// 🔹 MARK QUESTION AS USED IN DB
// ===============================

try {
    const questionset = await QuestionSet.findOne({
        user_id: String(session.currentTurn) === String(session.userA)
            ? session.userB   // If A asking → question belongs to B
            : session.userA   // If B asking → question belongs to A
    });

    if (questionset) {
        const questionDoc = questionset.questions.find(
            q => q.question === selectedQuestion.question && !q.used
        );

        if (questionDoc) {
            questionDoc.used = true;
            await questionset.save();
            console.log("✅ Question marked as used in DB");
        }
    }

} catch (err) {
    console.log("❌ Failed to mark question as used:", err);
}
      // 8️⃣ Update session state
      session.currentQuestion=selectedQuestion; //stores active question
      session.questionActive = true; //mark question as active

      await session.save(); //persist changes

      // 9️⃣ Get partner socket ID
      const partnerId = activeCalls[socket.id];

      /*
           🔟 Emit question to BOTH users

           Note:
           - We emit only question + section
           - We DO NOT send answer yet
           - Answer will be revealed during "start-answer"
        */

           io.to(socket.id).emit("question-received",{
            question: selectedQuestion.question,
            section: selectedQuestion.section,
            interviewerId: session.currentTurn
           });
           if(partnerId){
            io.to(partnerId).emit("question-received",{
                question: selectedQuestion.question,
                section: selectedQuestion.section,
                interviewerId: session.currentTurn
            });
           }
           console.log("✅ Question successfully emitted to both users");
        }catch(err){
            console.log("❌ Error in ask-question event:", err);
        }
    });
    // ===============================
    // FINISH ASKING EVENT
    // ===============================
    socket.on("finish-asking",async()=>{
        try{
            const sessionId = socket.data.sessionId;
            if(!sessionId) return;
            const session = await InterviewSession.findById(sessionId);
            if(!session||!session.questionActive) return;

            //Only interviewer can finish asking:
            if(String(session.currentTurn)!==String(socket.userId)){
                console.log("❌ Only interviewer can finish asking");
                return;
            }
            console.log("✅ Interviewer finished asking");
            //No DB change required here yet
        }catch(err){
            console.log("❌ Error in finish-asking:", err);
        }
    });

    // ===============================
    // START ANSWER EVENT
    // ===============================
    socket.on("start-answer",async()=>{
        try{
            const sessionId = socket.data.sessionId;
            if(!sessionId) return;
            const session = await InterviewSession.findById(sessionId);
            if(!session||!session.questionActive) return;

            //Only answering user can start answer:
            if(String(session.currentTurn)=== String(socket.userId)){
                console.log("❌ Interviewer cannot start answer");
                return;
            }
            const partnerId = activeCalls[socket.id];

            //Send AI answer ONLY to interviewer:
            if(partnerId){
                io.to(partnerId).emit("ai-answer",{
                    answer: session.currentQuestion.answer
                });
            }
            console.log("✅ AI answer revealed to interviewer");
        }catch(err){
            console.log("❌ Error in start-answer:", err);
        }
    });

    // ===============================
    // STOP ANSWER EVENT
    // ===============================
    socket.on("stop-answer",async()=>{
        try{
            const sessionId = socket.data.sessionId;
            if(!sessionId) return;

            const session = await InterviewSession.findById(sessionId);
            if(!session||!session.questionActive) return;

            //Only answering user can stop answer:
            if(String(session.currentTurn)===String(socket.userId)){
                console.log("❌ Interviewer cannot stop answer");
                return;
            }

            // Determine which question list was used and increment correct index
            if (String(session.currentTurn) === String(session.userA)) {
                // userA was interviewer → question came from questionsForB
                session.indexForB += 1;
            } else {
                // userB was interviewer → question came from questionsForA
                session.indexForA += 1;
            }

            //Swicth turn
            session.currentTurn = 
                String(session.currentTurn) === String(session.userA)
                ? session.userB
                : session.userA;

            session.questionActive = false;
            session.currentQuestion = null;

            await session.save();
            const partnerId = activeCalls[socket.id];
            // 🏁 CHECK IF BOTH USERS COMPLETED ALL QUESTIONS
            const userACompleted = session.indexForA >= session.questionsForA.length;
            const userBCompleted = session.indexForB >= session.questionsForB.length;

            // if (userACompleted && userBCompleted) {
            //     //✅ Mark session as properly ended
            //     session.status = "ended";
            //     await session.save();
            //     io.to(socket.id).emit("interview-completed");
            //     if (partnerId) {
            //         io.to(partnerId).emit("interview-completed");
            //     }
            //     return;
            // }
            console.log("INDEX A:", session.indexForA,"/", session.questionsForA.length);
            console.log("INDEX B:", session.indexForB, "/",session.questionsForB.length);
            // if (userACompleted && userBCompleted) {

            //     const duration = Math.floor((Date.now() - session.createdAt) / 1000);

            //     // 🔹 Create history for User A
            //     await SessionHistory.create({
            //         user: session.userA,
            //         partner: session.userB,
            //         questions: session.questionsForA,
            //         duration,
            //         status: "completed"
            //     });

            //     // 🔹 Create history for User B
            //     await SessionHistory.create({
            //         user: session.userB,
            //         partner: session.userA,
            //         questions: session.questionsForB,
            //         duration,
            //         status: "completed"
            //     });

            //     // 🔹 Delete active session
            //     await InterviewSession.findByIdAndDelete(session._id);

            //     io.to(socket.id).emit("interview-completed");
            //     if (partnerId) {
            //         io.to(partnerId).emit("interview-completed");
            //     }

            //     return;
            // }
            if (userACompleted && userBCompleted) {

    try {

        console.log("🔥 COMPLETION BLOCK ENTERED");

        const createdAtTime = new Date(session.createdAt).getTime();
        const duration = Math.floor((Date.now() - createdAtTime) / 1000);

        console.log("Duration:", duration);

        const historyA = await SessionHistory.create({
            user: session.userA,
            partner: session.userB,
            questions: session.questionsForA,
            duration,
            status: "completed"
        });

        console.log("History A created:", historyA._id);

        const historyB = await SessionHistory.create({
            user: session.userB,
            partner: session.userA,
            questions: session.questionsForB,
            duration,
            status: "completed"
        });

        console.log("History B created:", historyB._id);

        await InterviewSession.findByIdAndDelete(session._id);

        console.log("Session deleted successfully");

        io.to(socket.id).emit("interview-completed");
        if (partnerId) {
            io.to(partnerId).emit("interview-completed");
        }

    } catch (err) {
        console.error("❌ HISTORY CREATION FAILED:", err);
    }

    return;
}
            // Only switch turn if interview not completed
            io.to(socket.id).emit("turn-updated",{
                currentTurn: session.currentTurn
            });
            if(partnerId){
                io.to(partnerId).emit("turn-updated",{
                    currentTurn:session.currentTurn
                });
            }
            console.log("✅ Turn switched successfully");
        }catch(err){
            console.log("❌ Error in stop-answer:", err);
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
    socket.on("disconnect", async () => {
        console.log("User Disconnected:", socket.id);
        //Backend enforcement:
        const sessionId = socket.data.sessionId;
        if(sessionId){
            try{
                const session = await InterviewSession.findById(sessionId);

                // if(session && session.status==="active"){
                //     console.log("❌ Interview abandoned before completion");

                //     session.status = "abandoned";
                //     await session.save();
                // }

                if (session && session.status === "active") {

                    const duration = Math.floor((Date.now() - session.createdAt) / 1000);

                    // 🔹 History for User A
                    await SessionHistory.create({
                        user: session.userA,
                        partner: session.userB,
                        questions: session.questionsForA,
                        duration,
                        status: "abandoned"
                    });

                    // 🔹 History for User B
                    await SessionHistory.create({
                        user: session.userB,
                        partner: session.userA,
                        questions: session.questionsForB,
                        duration,
                        status: "abandoned"
                    });

                    // 🔹 Delete session
                    await InterviewSession.findByIdAndDelete(session._id);
                }
            }catch(err){
                console.log("Error updating session status: ",err);
            }
        }
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
            if (activeCalls[socket.id]) {
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
