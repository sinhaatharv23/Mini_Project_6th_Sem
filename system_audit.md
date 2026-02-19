# SYSTEM AUDIT & TECHNICAL JOURNAL

## 1. SYSTEM OVERVIEW

- **Project Name**: Mini Project 6th Sem (PeerInterview.io)
- **High-Level Purpose**: A peer-to-peer mock interview platform featuring AI-driven resume analysis and automatic question generation. Users can upload resumes, get AI feedback/parsing, and be matched with peers for video/chat interviews using questions generated from their resumes.
- **Primary Runtime Environments**: 
  - **Backend**: Node.js (Express)
  - **Frontend**: Browser (React via Vite)
  - **AI Service**: Python 3 (FastAPI)
- **Frameworks Used**:
  - **Backend**: Express.js, Socket.io, Mongoose
  - **Frontend**: React, TailwindCSS, Lucide React
  - **AI Worker**: FastAPI, Google ADK (Agent Development Kit), Google GenAI SDK
- **External Services**:
  - **Database**: MongoDB (Local or Atlas via URI)
  - **Auth**: Firebase Auth (for Google Sign-In verification) & Local JWT
  - **AI Model**: Google Gemini 2.5 Flash
- **Entry Points**:
  - **Backend**: `mini-project-backend/index.js` checks environment, connects to DB, starts Express & Socket.io.
  - **Frontend**: `mini-project-frontend/src/main.jsx` mounts the React app to the DOM.
  - **AI Worker**: `AI worker/main.py` starts the FastAPI server.

### Boot Sequence
1. **Database**: MongoDB connection is established via `mini-project-backend/db.js`.
2. **Backend**: Express server starts on port 5000. Middleware (CORS, CookieParser, JSON) is applied. Routes are mounted. Socket.io server attaches to the HTTP server.
3. **AI Worker**: Python FastAPI server starts on port 8001. Initializes ADK agent and environment.
4. **Frontend**: Vite serves the React bundle. App hydrates, checks for existing auth tokens in local storage/cookies, and renders `LoginScreen` or `Dashboard`.

---

## 2. FILE INVENTORY

### Root Directory
- `AI worker/`: Python AI microservice.
- `mini-project-backend/`: Node.js API server.
- `mini-project-frontend/`: React client application.
- `.gitignore`: Git configuration.
- `package-lock.json`: Root dependency lock (likely from workspace management).

### Backend (`mini-project-backend/`)
- `index.js`: **Entry Point**. Sets up Express, Socket.io, DB connection, and Middleware.
- `db.js`: Database connection logic using Mongoose.
- `firebaseAdmin.js`: Firebase Admin SDK initialization for verifying Google tokens.
- `serviceAccountKey.json`: Firebase credentials (should be gitignored in production).
- `.env`: Environment variables (PORT, MONGO_URI, JWT_SECRET, etc.).
- **Routes**:
  - `routes/auth.js`: Handles Register, Login, Google Auth, Refresh Token, Logout.
  - `routes/resume.js`: Handles Resume Upload (Multer), Text Extraction (PDF/DOCX), and coordination with AI Worker.
  - `routes/questions.js`: Handles fetching and triggering question generation via AI Worker.
- **Models**:
  - `models/User.js`: User schema (username, email, password hash, role, refresh token).
  - `models/Resume.js`: Resume schema (user_id, raw text, structured JSON data).
  - `models/Questionset.js`: Generated questions schema.
- **Middleware**:
  - `middleware/`: (Empty in listing, logic likely inline or unused).

### Frontend (`mini-project-frontend/`)
- `vite.config.js`: Vite build configuration.
- `tailwind.config.js` & `postcss.config.js`: CSS styling configuration.
- `index.html`: **Entry HTML**.
- `src/main.jsx`: **Entry JS**. Bootstraps React.
- `src/App.jsx`: Main Router configuration and Layout.
- `src/firebase.js`: Firebase client SDK setup.
- `src/components/`:
  - `LoginScreen.jsx`: Auth UI (Login/Register/Google).
  - `Dashboard.jsx`: Main user hub. Displays stats, profile, resume upload modal, and navigation.
  - `InterviewRoom.jsx`: WebRTC video chat + Socket.io signaling + Text Chat + Timer.
  - `UploadResume.jsx`: Component for file upload/text input.
  - `PrivateRoute.jsx`: Route guard checking for authentication.

### AI Worker (`AI worker/`)
- `main.py`: **Entry Point**. FastAPI app definition, route handlers (`/process_resume`, `/generate_questions`).
- `agent.py`: Defines the `root_agent` (Google ADK) and its instructions/prompts.
- `tools.py`: Python functions exposed to the Agent (get_resume, save_structured_resume, etc.).
- `backend_client.py`: HTTP client specific for calling back to the Node.js backend.
- `resume_service.py`: Wrapper for backend client resume operations.
- `extraction_service.py`: Wrapper for backend client structured data operations.
- `.env`: API Keys (GOOGLE_API_KEY, BACKEND_URL).

---

## 3. EXECUTION FLOW

### 3.1 Application Boot Flow
1. **Node Backend** starts, connects to MongoDB.
2. **Python Worker** starts, loads Gemini models.
3. **Frontend** loads in browser.
4. User logs in -> Backend issues **Access Token** (returned) and **Refresh Token** (HttpOnly Cookie).
5. Frontend stores Access Token in `localStorage`.

### 3.2 Resume Request Lifecycle
1. **User** uploads PDF in `Dashboard`.
2. **Frontend** POSTs `FormData` to `Node Backend` (`/resume/upload`).
3. **Backend** uses `multer` to buffer file, `pdf-parse`/`mammoth` to extract raw text.
4. **Backend** saves raw text to MongoDB (`Resume` model).
5. **Backend** makes HTTP POST to `AI Worker` (`/process_resume`).
6. **AI Worker** initializes Agent session.
7. **Agent** analyzes text, extracts Skills/Experience/Projects.
8. **Agent** returns JSON.
9. **Backend** receives JSON, saves to `Resume.structured` in MongoDB.
10. **Backend** returns updated Resume object to **Frontend**.
11. **Frontend** updates UI with parsed skills/experience.

### 3.3 Interview Match Lifecycle
1. User clicks "Join Meeting".
2. **Frontend** connects Socket.io to Backend.
3. Socket emits `join-room`.
4. **Backend** checks `waitingUser` variable.
   - If null: Sets current socket as `waitingUser`.
   - If exists: Pairs users, emits `matched` event to both.
5. **Frontend** receives `matched`. Initiates WebRTC `createOffer`.
6. Signaling exchanges (Offer/Answer/ICE) flow through Backend via Socket.io.
7. P2P Video/Audio connection established directly between browsers.

---

## 4. ROUTE DEFINITIONS

### Backend (`mini-project-backend`)

#### Auth (`/api/auth`)
- `POST /register`: Expects `{username, email, password}`. Returns `accessToken`, `user`.
- `POST /login`: Expects `{identifier, password}`. Returns `accessToken`, sets `refreshToken` cookie.
- `POST /google`: Expects `{token}` (Firebase ID Token). Verifies via Admin SDK. Creates/Logs in user.
- `POST /refresh`: Expects `refreshToken` cookie. Returns new `accessToken`.
- `POST /logout`: Clears `refreshToken` in DB and Cookie.

#### Resume (`/resume`)
- `POST /upload`: Expects `file` (multipart) or `{resume_text}`. Extracts text, calls AI, saves structured data.
- `POST /save`: Expects `{user_id, structured}`. Manual overwrite of structured data.
- `POST /raw`: Internal/AI use. Updates raw text.
- `POST /structured`: Internal/AI use. Updates structured data.
- `GET /structured/:user_id`: Returns merged valid structured data + raw text.
- `GET /raw/:user_id`: Returns raw text only.

#### Questions (`/questions`)
- `POST /`: Expects `{user_id}`. Triggers AI generation. Returns generated questions.
- `POST /save`: Internal/AI use. Saves questions to DB.
- `GET /:user_id`: Returns stored questions for user.

### AI Worker (`AI worker`)
- `POST /process_resume`: Expects `{user_id, resume_text}`. Returns structured JSON.
- `POST /generate_questions`: Expects `{user_id}`. Returns question JSON.

---

## 5. FUNCTIONAL AUDIT

| Component | Function | Status | Gaps/Risks |
|-----------|----------|--------|------------|
| **Auth** | Login/Register | ✅ | JWT Secret management in `.env` is critical. |
| **Auth** | Google Login | ✅ | Depends on client-side Firebase token validity. |
| **Resume** | PDF Extraction | ✅ | `pdf-parse` can be brittle with complex layouts. |
| **Resume** | AI Analysis | ✅ | **Critical**: If AI service is down, fallback is weak (just raw text). Round-trip architecture (Backend->AI->Backend) is fragile. |
| **Interview**| Matching | ⚠️ | Simple memory variable `waitingUser`. reset on server restart. No queue persistence. |
| **Interview**| Video/Audio | ✅ | Standard WebRTC. STUN servers hardcoded (Google public). No TURN server (will fail on strict firewalls). |
| **Interview**| Chat | ✅ | Socket.io based. |

---

## 6. DEPENDENCY GRAPH (LOGICAL)

- **Frontend** depends on **Backend API** (Rest + Socket).
- **Backend** depends on **MongoDB** (Persistence).
- **Backend** depends on **AI Worker** (Intelligence).
- **AI Worker** depends on **Backend** (Data Retrieval - Circular!).
  - *Risk*: The AI Worker calling the Backend to fetch the resume it was just told to process is a redundant round-trip. It optimizes for agent autonomy but adds network latency and failure points.
- **Backend** depends on **Google Firebase** (Auth verification).

---

## 7. DATA FLOW

1. **Ingestion**: User uploads file -> Backend Memory Buffer -> Extracted String.
2. **Storage**: String stored in MongoDB (`Resume` collection).
3. **Processing**: String sent to AI -> Processed into JSON -> Returned -> Stored in MongoDB (`Resume` structured field).
4. **Consumption**: Frontend requests JSON -> Renders Profile/Skills.
5. **Generation**: Frontend requests Questions -> Backend signals AI -> AI fetches Resume JSON -> Generates Questions -> Returns to Backend -> Stored in `Questionset` collection.

---

## 8. STATE MANAGEMENT

- **Frontend**:
  - `localStorage`: User info, Access Token.
  - React State (`useState`): Resume data, Chat messages, Video streams.
  - `useRef`: WebRTC connections (mutable, non-rendering).
- **Backend**:
  - **Socket.io**: In-memory `waitingUser` and `activeCalls` map. **Not Scalable** (will break if multiple server instances are added).
  - MongoDB: Persistent user/resume data.

---

## 9. SECURITY REVIEW

- **Auth**:
  - **Good**: Refresh tokens uses `HttpOnly` cookies (mitigates XSS).
  - **Good**: Passwords hashed with `bcryptjs`.
- **API**:
  - **Concern**: Internal endpoints (`/resume/raw`, `/resume/structured`) used by AI worker are public routes. They lack strict API key protection (rely on obscurity or network isolation).
- **CORS**:
  - Configured for `localhost`. Needs update for production deployment.
- **Input Validation**:
  - Basic checks. Missing forceful schema validation (e.g., Zod/Joi) on incoming JSON bodies.

---

## 10. ERROR HANDLING STRATEGY

- **AI Failure**: Backend has `try/catch` around AI fetch blocks. Returns `502` but attempts to not crash the server. Fallback logic exists to return raw data if AI fails.
- **Socket**: Disconnect events handle user cleanup, but race conditions in the `waitingUser` logic are possible.
- **Logging**: `console.log` / `console.error` used extensively. No structured logging (Winston/Pino) or external monitoring.

---

## 11. CONFIGURATION SYSTEM

- **`.env` Files**:
  - Backend: `MONGO_URI`, `JWT_SECRET`, `AI_WORKER_URL`.
  - Frontend: Firebase config (hardcoded in `firebase.js` - common practice for public keys, but `apiKey` limits should be set in Firebase console).
  - AI Worker: `GOOGLE_API_KEY`, `BACKEND_URL`.

---

## 12. CURRENT LOGIC GAPS & ISSUES

1. **Circular Architecture**: AI Worker calling Backend to fetch data that Backend could have sent in the first payload.
2. **Matching Logic**: The `waitingUser` is a single variable. Supports only *one* pair forming at a time globally?? No, it supports one *waiting* user. If two people join, they match. If a third joins, they wait. This is a simple FIFO queue size 1.
3. **WebRTC**: Lack of TURN server means video calls will fail on 3G/4G or corporate networks.
4. **Cleanup**: If a user closes the tab while "waiting", the `disconnect` handler cleans up. But if server restarts, all signaling state is lost.

---

## 13. WORKFLOW OF CURRENT CODEBASE

- **Developer**:
  1. `cd mini-project-backend && npm run dev`
  2. `cd AI worker && python main.py`
  3. `cd mini-project-frontend && npm run dev`
- **Deployment**: Assumes 3 separate processes.
  - Backend (Node)
  - Worker (Python)
  - Frontend (Static Build)

---

## 14. IMPROVEMENT PRIORITY MATRIX

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **Critical** | Missing TURN Server | Integrate Twilio/metered TURN for reliable video. |
| **High** | Protected Internal Routes | Add API Key auth for AI Worker <-> Backend communication. |
| **Medium** | Circular Dependency | Pass all necessary data to AI Worker in the initial POST; remove callbacks. |
| **Medium** | Matchmaking State | Move `waitingUser` to Redis or DB to support scaling/persistence. |
| **Low** | Logging | Replace `console.log` with a proper logger. |

---

## 15. ARCHITECTURAL SUMMARY

The system is a **Hybrid Monolith-Microservice** architecture.
- **Monolith Core**: The Node.js backend handles Auth, Data, and Signaling.
- **Microservice**: The Python AI worker creates a specialized service for LLM Interaction.
  
**Current Function**: It functions effectively as a prototype for a peer interview platform.
**Production Readiness**: **Low**. Lacks reliable video infrastructure (TURN), scalable state management (Redis), and robust service-to-service security.

**Verdict**: working logical prototype with solid "Happy Path" implementation but fragile edge-case handling.
