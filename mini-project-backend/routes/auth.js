const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../firebaseAdmin'); // For Google Sign-In (if needed)
// 🔐 Secrets from .env (NOT hardcoded)
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    // ✅ STEP 1: Define variables FIRST
    const { username, email, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ STEP 2: Now we can use 'email' safely
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'candidate'
    });

    const savedUser = await newUser.save();

    // 🔑 Access token (short-lived) Edited
    const accessToken = jwt.sign(
      { id: savedUser._id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    console.log(`✅ Registered: ${savedUser.username}`);
    res.status(201).json({ 
        accessToken, 
        user: { id: savedUser._id, username: savedUser.username, email: savedUser.email } 
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Please provide credentials" });
    }

    // Search by Email OR Username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

     // 🔑 Access token (short)
    const accessToken = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    //  Refresh token (long)
    const refreshToken = jwt.sign(
      { id: user._id },
      REFRESH_SECRET,
      { expiresIn: "1d" }
    );

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Send refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    });


    console.log(`✅ Logged In: ${user.username}`);
    res.json({ 
        accessToken, 
        user: { id: user._id, username: user.username, email: user.email } 
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});
// ================= GOOGLE LOGIN ROUTE - Atharva =================
router.post('/google',async(req,res)=>{
  try{
    const{token} = req.body;

    if(!token){
      return res.status(400).json({message:"Token missing"});
    }
    // 1️⃣ Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);

    const email = decoded.email;
    const name = decoded.name;
    const photo = decoded.picture;
    // 2️⃣ Check if user exists in DB
    let user = await User.findOne({email});

    // 3️⃣ If not, create new user
    if(!user){
      user = new User({
        username:name,
        email,
        password: "GOOGLE_AUTH", // Placeholder since we won't use it
        role: 'candidate',
        photo: photo // Store profile picture URL if needed
      });
      await user.save();
      console.log("Google user created:",email);
    }else{
      console.log("Google user logged in:",email);
    }
    // 4️⃣ Create JWT token for our app
    const accessToken = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email, photo: user.photo }
    });
  }catch(err){
    console.log("Google Auth Error:",err);
    res.status(401).json({message:"Invalid Google token"});
  }
});
// 3. REFRESH TOKEN ROUTE - AMAN
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.sendStatus(403);
    }

    const newAccessToken = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });

  } catch (err) {
    res.sendStatus(403);
  }
});
// 4. LOGOUT ROUTE - AMAN
router.post('/logout', async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie("refreshToken");
  res.sendStatus(200);
});

module.exports = router;