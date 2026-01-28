const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI ||
             'mongodb://127.0.0.1:27017/mini_project_db');
        console.log(`MongoDB connected : ${conn.connection.host}`);
    }catch(err){
        console.error('Database connection error:',err);
        process.exit(1);
    }
};

module.exports = connectDB;