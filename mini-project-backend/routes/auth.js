const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "mini_project_secret_key_123"; // In prod, use .env

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

    // Create Token
    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, { expiresIn: "1d" });

    console.log(`✅ Registered: ${savedUser.username}`);
    res.status(201).json({ 
        token, 
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

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

    console.log(`✅ Logged In: ${user.username}`);
    res.json({ 
        token, 
        user: { id: user._id, username: user.username, email: user.email } 
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;