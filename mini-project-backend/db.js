// mini-project-backend/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 1. We try to connect to the URL stored in .env or fallback to localhost
    // '127.0.0.1' is better than 'localhost' on Windows to avoid delay issues
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mini_project_db');
    
    // 2. If successful, we log the host name so you KNOW it worked
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // 3. If it fails, we log the error and stop the server (exit 1)
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;